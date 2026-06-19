import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getRadarTileUrl, RADAR_TILE_SIZE, RADAR_ZOOM_OFFSET } from '../../services/stormcast';
import useAppStore from '../../store/useAppStore';

/**
 * Windowed radar renderer — keeps (1 + PRELOAD_AHEAD) frames on the map at once.
 * The window slides as the animation advances; evicted frames are removed so their
 * tile fetches stop. Browser HTTP cache makes replays near-instant.
 *
 * GPU acceleration:
 *   - Dedicated 'radar' pane → own compositor layer (will-change: transform)
 *   - Per-container will-change: opacity → GPU opacity compositing
 *   - img.decoding = 'async' → PNG decode off main thread
 *   - CSS opacity transitions in MapView.css → GPU-animated crossfade
 */

const PRELOAD_AHEAD = 4;
const FRAME_TIMEOUT = 20_000;
const RADAR_PANE    = 'radar';

const TILE_OPTS = {
  opacity: 0,
  tileSize: RADAR_TILE_SIZE,
  zoomOffset: RADAR_ZOOM_OFFSET,
  pane: RADAR_PANE,
  keepBuffer: 0,
  updateWhenIdle: true,
  attribution: '© Stormcast',
};

/* ---- Layer helpers ---- */

function frameKey(frame, cs, tq) {
  return `${frame.path}:${cs}:${tq}`;
}

function getOrCreate(frame, cs, tq, cache) {
  const k = frameKey(frame, cs, tq);
  if (cache.has(k)) return [k, cache.get(k)];
  const url = getRadarTileUrl({ host: frame.host, path: frame.path, colorScheme: cs, size: tq });
  const layer = L.tileLayer(url, { ...TILE_OPTS });

  // Decode tile PNGs off the main thread (avoids render jank when tiles arrive)
  const origCreateTile = layer.createTile.bind(layer);
  layer.createTile = function(coords, done) {
    const img = origCreateTile(coords, done);
    img.decoding = 'async';
    return img;
  };

  cache.set(k, layer);
  return [k, layer];
}

/* ---- Component ---- */

export function RadarLayer() {
  const map         = useMap();
  const frames      = useAppStore((s) => s.radarFrames);
  const currentIdx  = useAppStore((s) => s.radarCurrentIdx);
  const cs          = useAppStore((s) => s.radarColorScheme);
  const tileQuality = useAppStore((s) => s.radarTileQuality);
  const opacity     = useAppStore((s) => s.radarOpacity);
  const setProgress = useAppStore((s) => s.setRadarTileProgress);

  const cache       = useRef(new Map());
  const readyKeys   = useRef(new Set());
  const watchedKeys = useRef(new Set());
  const timeouts    = useRef(new Map());
  const activeKey   = useRef(null);
  const [viewEpoch, setViewEpoch] = useState(0);
  const moveTimer   = useRef(null);

  /* ---- Create dedicated GPU-composited pane (once per map instance) ---- */
  useEffect(() => {
    if (!map.getPane(RADAR_PANE)) {
      const pane = map.createPane(RADAR_PANE);
      pane.style.zIndex        = 250; // above base tiles (200), below vector overlays (400)
      pane.style.willChange    = 'transform';
      pane.style.pointerEvents = 'none';
    }
  }, [map]);

  /* ---- Cleanup on unmount ---- */
  useEffect(() => () => {
    clearTimeout(moveTimer.current);
    timeouts.current.forEach(id => clearTimeout(id));
    cache.current.forEach(l => { try { map.removeLayer(l); } catch {} });
    cache.current.clear();
    readyKeys.current.clear();
    watchedKeys.current.clear();
    timeouts.current.clear();
    activeKey.current = null;
    setProgress(null);
  }, [map, setProgress]);

  /* ---- Pan/zoom: stop stale requests, reload after settle, re-warm new viewport ---- */
  useEffect(() => {
    const onViewChange = () => {
      cache.current.forEach((layer, k) => {
        if (k !== activeKey.current && layer._map) {
          try { map.removeLayer(layer); } catch {}
        }
      });
      readyKeys.current.clear();
      watchedKeys.current.clear();
      timeouts.current.forEach(id => clearTimeout(id));
      timeouts.current.clear();
      clearTimeout(moveTimer.current);
      moveTimer.current = setTimeout(() => setViewEpoch(e => e + 1), 500);
    };
    map.on('moveend', onViewChange);
    map.on('zoomend', onViewChange);
    return () => {
      map.off('moveend', onViewChange);
      map.off('zoomend', onViewChange);
      clearTimeout(moveTimer.current);
    };
  }, [map]);

  /* ---- Windowed load: current frame + PRELOAD_AHEAD next frames ---- */
  useEffect(() => {
    if (!frames.length) return;

    const windowSize = PRELOAD_AHEAD + 1;

    const wanted = new Set();
    for (let j = 0; j < windowSize; j++) {
      wanted.add(frameKey(frames[(currentIdx + j) % frames.length], cs, tileQuality));
    }

    // Evict stale layers (snapshot first to avoid mutating Map during iteration)
    const stale = [...cache.current.keys()].filter(k => !wanted.has(k));
    stale.forEach(k => {
      try { map.removeLayer(cache.current.get(k)); } catch {}
      cache.current.delete(k);
      readyKeys.current.delete(k);
      watchedKeys.current.delete(k);
      clearTimeout(timeouts.current.get(k));
      timeouts.current.delete(k);
    });

    const t0 = Date.now();

    const reportProgress = () => {
      const loaded = [...readyKeys.current].filter(k => wanted.has(k)).length;
      if (loaded >= windowSize) {
        setProgress(null);
      } else {
        setProgress({ loadedTiles: loaded, totalTiles: windowSize,
          framesLoaded: loaded, framesTotal: windowSize, startTime: t0 });
      }
    };

    reportProgress();

    for (let j = 0; j < windowSize; j++) {
      const frame = frames[(currentIdx + j) % frames.length];
      const [k, layer] = getOrCreate(frame, cs, tileQuality, cache.current);

      if (!layer._map) {
        layer.addTo(map);
        const container = layer.getContainer?.();
        if (container) container.style.willChange = 'opacity';
      }

      if (!readyKeys.current.has(k) && !watchedKeys.current.has(k)) {
        watchedKeys.current.add(k);

        const markReady = () => {
          clearTimeout(timeouts.current.get(k));
          timeouts.current.delete(k);
          watchedKeys.current.delete(k);
          readyKeys.current.add(k);
          reportProgress();
        };

        layer.once('load', markReady);

        // Failsafe: if a tile hangs and load never fires, advance anyway
        const tid = setTimeout(() => {
          layer.off('load', markReady);
          markReady();
        }, FRAME_TIMEOUT);
        timeouts.current.set(k, tid);
      }
    }

    // Show current frame (CSS transition in MapView.css crossfades on GPU)
    const [k, layer] = getOrCreate(frames[currentIdx], cs, tileQuality, cache.current);
    if (activeKey.current && activeKey.current !== k) {
      cache.current.get(activeKey.current)?.setOpacity(0);
    }
    layer.setOpacity(useAppStore.getState().radarOpacity);
    activeKey.current = k;

  }, [map, frames, currentIdx, cs, tileQuality, setProgress, viewEpoch]);

  /* ---- Opacity slider ---- */
  useEffect(() => {
    if (activeKey.current) cache.current.get(activeKey.current)?.setOpacity(opacity);
  }, [opacity]);

  return null;
}
