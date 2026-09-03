import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  omProtocol,
  addLeafletProtocolSupport,
  updateCurrentBounds,
} from '@openmeteo/weather-map-layer';
import { buildOmUrl } from '../../services/openmeteoRadar';
import useAppStore from '../../store/useAppStore';

/* The om:// protocol handler is global and only needs registering once. */
let adapter = null;
function getAdapter() {
  if (!adapter) {
    adapter = addLeafletProtocolSupport(L);
    adapter.addProtocol('om', omProtocol);
  }
  return adapter;
}

const PRELOAD_AHEAD = 2;

/**
 * Renders an Open-Meteo Maps layer (variable chosen in Settings), animated
 * frame-by-frame off the shared radar playback state.
 *
 * Each frame's `om://` URL is built from its model-run/valid-time + the current
 * variable; we keep a small window of client-rendered tile layers alive and
 * crossfade opacity between them.
 */
export function OpenMeteoRadarLayer() {
  const map        = useMap();
  const frames     = useAppStore((s) => s.radarFrames);
  const currentIdx = useAppStore((s) => s.radarCurrentIdx);
  const opacity    = useAppStore((s) => s.radarOpacity);
  const variable   = useAppStore((s) => s.openmeteoVariable);
  const setProgress = useAppStore((s) => s.setRadarTileProgress);

  const layers    = useRef(new Map()); // omUrl -> L.GridLayer
  const activeUrl = useRef(null);

  const frameUrl = (f) =>
    f && f.run && f.valid ? buildOmUrl(f.domain, f.run, f.valid, variable) : null;

  /* Dedicated pane: above the base map (200), below vector overlays (400). */
  useEffect(() => {
    if (!map.getPane('omradar')) {
      const pane = map.createPane('omradar');
      pane.style.zIndex = 250;
      pane.style.pointerEvents = 'none';
    }
  }, [map]);

  /* Keep the protocol's viewport in sync so it only decodes visible data. */
  useEffect(() => {
    const sync = () => {
      const b = map.getBounds();
      updateCurrentBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    };
    sync();
    map.on('moveend', sync);
    map.on('zoomend', sync);
    return () => {
      map.off('moveend', sync);
      map.off('zoomend', sync);
    };
  }, [map]);

  /* Cleanup every layer on unmount (e.g. switching back to StormCast). */
  useEffect(() => () => {
    layers.current.forEach((l) => { try { map.removeLayer(l); } catch {} });
    layers.current.clear();
    activeUrl.current = null;
    setProgress(null);
  }, [map, setProgress]);

  /* Windowed load + show current frame. Re-runs when the variable changes. */
  useEffect(() => {
    if (!frames.some((f) => f?.run && f?.valid)) return;

    const clampedIdx = Math.min(currentIdx, frames.length - 1);
    const wanted = new Set();
    for (let j = 0; j <= PRELOAD_AHEAD; j++) {
      const url = frameUrl(frames[(clampedIdx + j) % frames.length]);
      if (url) wanted.add(url);
    }

    // Evict layers outside the window (also drops old-variable layers)
    for (const [url, layer] of [...layers.current]) {
      if (!wanted.has(url)) {
        try { map.removeLayer(layer); } catch {}
        layers.current.delete(url);
      }
    }

    const ad = getAdapter();

    for (const url of wanted) {
      if (!layers.current.has(url)) {
        const layer = ad.createTileLayer(url, {
          opacity: 0,
          pane: map.getPane('omradar') ? 'omradar' : undefined,
        });
        layer.addTo(map);
        layers.current.set(url, layer);
      }
    }

    const curUrl = frameUrl(frames[clampedIdx]);
    if (curUrl) {
      if (activeUrl.current && activeUrl.current !== curUrl) {
        layers.current.get(activeUrl.current)?.setOpacity(0);
      }
      layers.current.get(curUrl)?.setOpacity(opacity);
      activeUrl.current = curUrl;
    }
  }, [map, frames, currentIdx, opacity, variable]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Opacity slider — live-update the visible frame. */
  useEffect(() => {
    if (activeUrl.current) {
      layers.current.get(activeUrl.current)?.setOpacity(opacity);
    }
  }, [opacity]);

  return null;
}
