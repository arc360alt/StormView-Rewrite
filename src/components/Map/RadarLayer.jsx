import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getRadarTileUrl } from '../../services/stormcast';
import useAppStore from '../../store/useAppStore';

/**
 * Two-layer ping-pong radar renderer.
 *
 * Instead of creating one Leaflet tile layer per radar frame (which fires
 * N×(tiles in viewport) simultaneous requests and tanks performance), we keep
 * exactly TWO tile layers alive:
 *   A — foreground (currently visible)
 *   B — background (preloading the next frame)
 *
 * On each frame advance we:
 *   1. Swap foreground/background (B becomes visible instantly)
 *   2. Start loading the NEXT frame into the old foreground (A)
 *
 * After the first playthrough most tiles are in the browser cache, so
 * subsequent loops are essentially instant.
 */
export function RadarLayer() {
  const map = useMap();
  const radarFrames    = useAppStore((s) => s.radarFrames);
  const radarCurrentIdx = useAppStore((s) => s.radarCurrentIdx);
  const radarOpacity   = useAppStore((s) => s.radarOpacity);
  const radarColorScheme = useAppStore((s) => s.radarColorScheme);

  // All mutable layer state lives in a single ref so we never trigger re-renders
  const r = useRef({
    A: null,           // Leaflet TileLayer
    B: null,           // Leaflet TileLayer
    fg: 'A',           // which layer is currently visible ('A' | 'B')
    loaded: { A: -1, B: -1 }, // which frame index each layer has loaded
    prevColor: radarColorScheme,
  });

  /* ---- Create the two layers on mount ---- */
  useEffect(() => {
    const opts = {
      opacity: 0,
      tileSize: 256,
      zIndex: 200,
      keepBuffer: 1,          // minimal tile buffer — reduces wasted requests
      updateWhenZooming: false,
      attribution: '© Stormcast',
    };
    r.current.A = L.tileLayer('', opts).addTo(map);
    r.current.B = L.tileLayer('', opts).addTo(map);
    r.current.loaded = { A: -1, B: -1 };
    r.current.fg = 'A';
    return () => {
      ['A', 'B'].forEach((k) => { try { map.removeLayer(r.current[k]); } catch {} });
    };
  }, [map]);

  /* ---- Core: respond to frame index or color-scheme change ---- */
  useEffect(() => {
    const s = r.current;
    if (!s.A || !s.B || !radarFrames.length) return;

    const frame = radarFrames[radarCurrentIdx];
    if (!frame) return;

    const colorChanged = s.prevColor !== radarColorScheme;
    if (colorChanged) {
      s.prevColor = radarColorScheme;
      s.loaded = { A: -1, B: -1 }; // force reload with new color
    }

    const fg = s.fg;
    const bg = fg === 'A' ? 'B' : 'A';
    const fgLayer = s[fg];
    const bgLayer = s[bg];

    const makeUrl = (f) =>
      getRadarTileUrl({ host: f.host, path: f.path, colorScheme: radarColorScheme });

    // If background already has this frame preloaded, just swap (no extra request)
    if (s.loaded[bg] === radarCurrentIdx && !colorChanged) {
      fgLayer.setOpacity(0);
      bgLayer.setOpacity(radarOpacity);
      s.fg = bg;

      // Preload next frame into the old foreground (now hidden)
      const next = radarFrames[radarCurrentIdx + 1];
      if (next && s.loaded[fg] !== radarCurrentIdx + 1) {
        fgLayer.setUrl(makeUrl(next));
        s.loaded[fg] = radarCurrentIdx + 1;
      }
    } else {
      // Need to load: put current frame on background, swap immediately
      bgLayer.setUrl(makeUrl(frame));
      s.loaded[bg] = radarCurrentIdx;
      fgLayer.setOpacity(0);
      bgLayer.setOpacity(radarOpacity);
      s.fg = bg;

      // Preload next frame into old foreground
      const next = radarFrames[radarCurrentIdx + 1];
      if (next) {
        fgLayer.setUrl(makeUrl(next));
        s.loaded[fg] = radarCurrentIdx + 1;
      }
    }
  }, [map, radarFrames, radarCurrentIdx, radarOpacity, radarColorScheme]);

  /* ---- Opacity-only change (settings slider) ---- */
  useEffect(() => {
    const s = r.current;
    s[s.fg]?.setOpacity(radarOpacity);
  }, [radarOpacity]);

  return null;
}
