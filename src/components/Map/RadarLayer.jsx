import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getRadarTileUrl, RADAR_TILE_SIZE, RADAR_ZOOM_OFFSET } from '../../services/stormcast';
import useAppStore from '../../store/useAppStore';

/**
 * Windowed radar renderer — keeps (1 + PRELOAD_AHEAD) frames on the map.
 * The window slides as the animation advances; evicted frames are removed so
 * their tile fetches stop. Browser HTTP cache makes replays near-instant.
 *
 * updateWhenIdle: true prevents tile spam during the flyTo animation.
 */

const PRELOAD_AHEAD  = 4;
const FRAME_TIMEOUT  = 8_000; // ms — mark frame ready if load event never fires

const TILE_OPTS = {
  opacity: 0,
  tileSize: RADAR_TILE_SIZE,
  zoomOffset: RADAR_ZOOM_OFFSET,
  zIndex: 200,
  keepBuffer: 0,
  updateWhenIdle: true,
  attribution: '© Stormcast',
};

function frameKey(frame, cs, tq) {
  return `${frame.path}:${cs}:${tq}`;
}

function getOrCreate(frame, cs, tq, cache) {
  const k = frameKey(frame, cs, tq);
  if (cache.has(k)) return [k, cache.get(k)];
  const url = getRadarTileUrl({ host: frame.host, path: frame.path, colorScheme: cs, size: tq });
  const layer = L.tileLayer(url, { ...TILE_OPTS });
  cache.set(k, layer);
  return [k, layer];
}

export function RadarLayer() {
  const map         = useMap();
  const frames      = useAppStore((s) => s.radarFrames);
  const currentIdx  = useAppStore((s) => s.radarCurrentIdx);
  const cs          = useAppStore((s) => s.radarColorScheme);
  const tileQuality = useAppStore((s) => s.radarTileQuality);
  const opacity     = useAppStore((s) => s.radarOpacity);
  const setProgress = useAppStore((s) => s.setRadarTileProgress);

  const cache        = useRef(new Map());
  const readyKeys    = useRef(new Set()); // frames whose tiles arrived for this viewport
  const watchedKeys  = useRef(new Set()); // frames with an active load-listener+timeout
  const timeouts     = useRef(new Map()); // k → timeout id
  const activeKey    = useRef(null);
  const [viewEpoch, setViewEpoch] = useState(0);
  const moveTimer    = useRef(null);

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

  /* ---- Pan/zoom: stop stale requests, reload after settle ---- */
  useEffect(() => {
    const onViewChange = () => {
      cache.current.forEach((layer, k) => {
        if (k !== activeKey.current && layer._map) {
          try { map.removeLayer(layer); } catch {}
        }
      });
      // Viewport changed — tile-ready status is stale
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

  /* ---- Windowed load: current + PRELOAD_AHEAD frames ---- */
  useEffect(() => {
    if (!frames.length) return;

    const windowSize = PRELOAD_AHEAD + 1;

    // Build the wanted key set
    const wanted = new Set();
    for (let j = 0; j < windowSize; j++) {
      wanted.add(frameKey(frames[(currentIdx + j) % frames.length], cs, tileQuality));
    }

    // Evict stale layers (collect first, then delete to avoid Map mutation during forEach)
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
      // Only count keys that are both ready AND still in the current window
      const loaded = [...readyKeys.current].filter(k => wanted.has(k)).length;
      if (loaded >= windowSize) {
        setProgress(null); // all done — hide bar
      } else {
        setProgress({ loadedTiles: loaded, totalTiles: windowSize,
          framesLoaded: loaded, framesTotal: windowSize, startTime: t0 });
      }
    };

    reportProgress(); // snapshot immediately so bar reflects cached state

    // Add window frames and watch for load
    for (let j = 0; j < windowSize; j++) {
      const frame = frames[(currentIdx + j) % frames.length];
      const [k, layer] = getOrCreate(frame, cs, tileQuality, cache.current);

      if (!layer._map) layer.addTo(map);

      // Only one listener+timeout per frame at a time
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

        // Timeout: if load never fires (hung tile), advance anyway
        const tid = setTimeout(() => {
          layer.off('load', markReady);
          markReady();
        }, FRAME_TIMEOUT);
        timeouts.current.set(k, tid);
      }
    }

    // Show current frame
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
