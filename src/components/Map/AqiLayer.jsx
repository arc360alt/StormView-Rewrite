import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchAirQuality, fetchAirQualityBatch, getAqiCategory } from '../../services/airquality';

/* ── Grid / cache config ── */

const NICE_STEPS = [0.5, 1, 1.5, 2, 3, 4, 5, 8, 10, 15, 20, 30, 45, 90];
const MAX_BATCH  = 400;        // max points per batch request (one HTTP call)
const CACHE_TTL  = 30 * 60 * 1000;
const UPDATE_MS  = 1000;
const CANVAS_SZ  = 256;        // higher res canvas for denser grid

// Module-level cache persists across AqiLayer mount/unmount cycles (e.g. layer toggle).
// Key: "lat.toFixed(2),lon.toFixed(2)" → { aqi: number, ts: number }
const GEO_CACHE  = new Map();
const IN_FLIGHT  = new Set(); // keys currently being fetched

/* ── Geographic grid helpers ── */

function getStep(latSpan, lonSpan) {
  const largest = Math.max(latSpan, lonSpan);
  // Target ~25 cells across the widest dimension — denser grid reveals smoke plume shape
  const raw = largest / 25;
  return NICE_STEPS.find((s) => s >= raw) ?? 90;
}

function snapV(v, step) {
  // Snap a coordinate to the nearest multiple of step, avoiding float drift
  return parseFloat((Math.round(v / step) * step).toFixed(4));
}

function cacheKey(lat, lon) {
  // toFixed(2) is fine for all steps ≥ 0.5 (max 1 decimal place after snap)
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function gridPoints(bounds, step) {
  const s = snapV(bounds.getSouth() - step, step);
  const n = snapV(bounds.getNorth() + step, step);
  const w = snapV(bounds.getWest()  - step, step);
  const e = snapV(bounds.getEast()  + step, step);
  const pts = [];
  const latSteps = Math.round((n - s) / step);
  const lonSteps = Math.round((e - w) / step);
  for (let ri = 0; ri <= latSteps; ri++) {
    const lat = parseFloat((s + ri * step).toFixed(4));
    if (lat < -85 || lat > 85) continue;
    for (let ci = 0; ci <= lonSteps; ci++) {
      const lon = parseFloat((w + ci * step).toFixed(4));
      pts.push({ lat, lon });
    }
  }
  return pts;
}

// pad scales with step so IDW always has 2 rings of neighbours outside the viewport
function cachedNear(bounds, pad) {
  const now = Date.now();
  const pts = [];
  for (const [key, entry] of GEO_CACHE) {
    if (now - entry.ts > CACHE_TTL) { GEO_CACHE.delete(key); continue; }
    const [lat, lon] = key.split(',').map(Number);
    if (
      lat >= bounds.getSouth() - pad &&
      lat <= bounds.getNorth() + pad &&
      lon >= bounds.getWest()  - pad &&
      lon <= bounds.getEast()  + pad
    ) {
      pts.push({ lat, lon, aqi: entry.aqi });
    }
  }
  return pts;
}

/* ── Canvas gradient helpers ── */

const COLOR_RAMP = [
  { v: 0,   rgb: [0,   228, 0]   },
  { v: 50,  rgb: [0,   228, 0]   },
  { v: 100, rgb: [255, 255, 0]   },
  { v: 150, rgb: [255, 126, 0]   },
  { v: 200, rgb: [255, 0,   0]   },
  { v: 300, rgb: [143, 63,  151] },
  { v: 500, rgb: [126, 0,   35]  },
];

function aqiToRgb(aqi) {
  const v = Math.max(0, Math.min(500, aqi));
  for (let i = 0; i < COLOR_RAMP.length - 1; i++) {
    const lo = COLOR_RAMP[i], hi = COLOR_RAMP[i + 1];
    if (v <= hi.v) {
      const t = (v - lo.v) / (hi.v - lo.v);
      return lo.rgb.map((c, j) => Math.round(c + t * (hi.rgb[j] - c)));
    }
  }
  return COLOR_RAMP[COLOR_RAMP.length - 1].rgb;
}

function idwAqi(lat, lon, pts, power = 1.5) {
  let wSum = 0, vSum = 0;
  for (const pt of pts) {
    const d2 = (lat - pt.lat) ** 2 + (lon - pt.lon) ** 2;
    if (d2 < 1e-8) return pt.aqi;
    const w = 1 / d2 ** (power / 2);
    wSum += w;
    vSum += w * pt.aqi;
  }
  return wSum > 0 ? vSum / wSum : 0;
}

// Bilinear interpolation on the regular grid — no bullseye artifacts.
// Falls back to IDW if any of the 4 corners are missing (viewport edges).
function bilinearAqi(lat, lon, step, ptMap, pts) {
  const latFloor = Math.round(Math.floor(lat / step) * step * 1e6) / 1e6;
  const lonFloor = Math.round(Math.floor(lon / step) * step * 1e6) / 1e6;
  const latCeil  = Math.round((latFloor + step) * 1e6) / 1e6;
  const lonCeil  = Math.round((lonFloor + step) * 1e6) / 1e6;

  const bl = ptMap.get(`${latFloor.toFixed(2)},${lonFloor.toFixed(2)}`);
  const br = ptMap.get(`${latFloor.toFixed(2)},${lonCeil.toFixed(2)}`);
  const tl = ptMap.get(`${latCeil.toFixed(2)},${lonFloor.toFixed(2)}`);
  const tr = ptMap.get(`${latCeil.toFixed(2)},${lonCeil.toFixed(2)}`);

  if (bl != null && br != null && tl != null && tr != null) {
    const tx = (lon - lonFloor) / step;
    const ty = (lat - latFloor) / step;
    return bl * (1 - tx) * (1 - ty) + br * tx * (1 - ty) + tl * (1 - tx) * ty + tr * tx * ty;
  }

  return idwAqi(lat, lon, pts);
}

function renderCanvas(bounds, pts, step) {
  const sz = CANVAS_SZ;
  const canvas = document.createElement('canvas');
  canvas.width = sz; canvas.height = sz;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(sz, sz);

  const latSpan = bounds.getNorth() - bounds.getSouth();
  const lonSpan = bounds.getEast()  - bounds.getWest();

  // Build O(1) lookup for bilinear corner lookups
  const ptMap = new Map();
  for (const pt of pts) {
    ptMap.set(`${pt.lat.toFixed(2)},${pt.lon.toFixed(2)}`, pt.aqi);
  }

  for (let row = 0; row < sz; row++) {
    const lat = bounds.getNorth() - (row / sz) * latSpan;
    for (let col = 0; col < sz; col++) {
      const lon = bounds.getWest() + (col / sz) * lonSpan;
      const aqi = step
        ? bilinearAqi(lat, lon, step, ptMap, pts)
        : idwAqi(lat, lon, pts);
      const [r, g, b] = aqiToRgb(aqi);
      const i = (row * sz + col) * 4;
      img.data[i]     = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 170;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/* ── Popup HTML ── */

function buildPopupContent({ aqi, cat, data }) {
  if (!cat) {
    return '<div class="aqi-popup aqi-popup--empty">No AQI data available for this location.</div>';
  }
  const fmt = (v, u) => v != null ? `${Number(v).toFixed(1)} ${u}` : '—';
  return `
    <div class="aqi-popup">
      <div class="aqi-popup-header" style="border-color:${cat.color}">
        <div class="aqi-popup-num" style="color:${cat.color}">${aqi}</div>
        <div class="aqi-popup-right">
          <div class="aqi-popup-badge" style="background:${cat.color};color:${cat.textColor}">${cat.label}</div>
          <div class="aqi-popup-scale">US AQI</div>
        </div>
      </div>
      <p class="aqi-popup-desc">${cat.desc}</p>
      <div class="aqi-popup-grid">
        <div class="aqi-popup-cell"><span class="aqi-popup-cell-label">PM2.5</span><span class="aqi-popup-cell-val">${fmt(data.pm2_5, 'µg/m³')}</span></div>
        <div class="aqi-popup-cell"><span class="aqi-popup-cell-label">PM10</span><span class="aqi-popup-cell-val">${fmt(data.pm10, 'µg/m³')}</span></div>
        <div class="aqi-popup-cell"><span class="aqi-popup-cell-label">Ozone</span><span class="aqi-popup-cell-val">${fmt(data.ozone, 'µg/m³')}</span></div>
        <div class="aqi-popup-cell"><span class="aqi-popup-cell-label">NO₂</span><span class="aqi-popup-cell-val">${fmt(data.nitrogen_dioxide, 'µg/m³')}</span></div>
        <div class="aqi-popup-cell"><span class="aqi-popup-cell-label">SO₂</span><span class="aqi-popup-cell-val">${fmt(data.sulphur_dioxide, 'µg/m³')}</span></div>
        <div class="aqi-popup-cell"><span class="aqi-popup-cell-label">CO</span><span class="aqi-popup-cell-val">${fmt(data.carbon_monoxide, 'µg/m³')}</span></div>
      </div>
      <div class="aqi-popup-src">Data: Open-Meteo Air Quality API · EPA scale</div>
    </div>
  `;
}

/* ── Component ── */

export function AqiLayer() {
  const map        = useMap();
  const overlayRef = useRef(null);
  const popupRef   = useRef(null);
  const timerRef   = useRef(null);
  const fetchId    = useRef(0);
  const stepRef    = useRef(null); // current grid step, for bilinear interpolation

  const pushOverlay = useCallback((bounds, pts) => {
    if (pts.length < 2) return;
    const dataUrl = renderCanvas(bounds, pts, stepRef.current);
    if (overlayRef.current) {
      try { map.removeLayer(overlayRef.current); } catch {}
    }
    overlayRef.current = L.imageOverlay(dataUrl, bounds, {
      opacity: 0.65,
      zIndex: 6,
      interactive: false,
      className: 'aqi-canvas-overlay',
    }).addTo(map);
  }, [map]);

  const updateOverlay = useCallback(async () => {
    const id = ++fetchId.current;
    const bounds = map.getBounds();
    const latSpan = bounds.getNorth() - bounds.getSouth();
    const lonSpan = bounds.getEast()  - bounds.getWest();
    const step    = getStep(latSpan, lonSpan);
    stepRef.current = step;
    const pad     = step * 2;

    // Immediately render whatever is already cached for this viewport
    const cached = cachedNear(bounds, pad);
    if (cached.length >= 2) pushOverlay(bounds, cached);

    // Sort uncached grid points by distance from viewport centre so we always
    // fetch the most visible area first (fixes the SW-corner bias from plain slice)
    const center   = bounds.getCenter();
    const allGrid  = gridPoints(bounds, step);
    const toFetch  = allGrid
      .filter((p) => {
        const k = cacheKey(p.lat, p.lon);
        if (IN_FLIGHT.has(k)) return false;
        const hit = GEO_CACHE.get(k);
        return !hit || Date.now() - hit.ts > CACHE_TTL;
      })
      .sort((a, b) => {
        const da = (a.lat - center.lat) ** 2 + (a.lon - center.lng) ** 2;
        const db = (b.lat - center.lat) ** 2 + (b.lon - center.lng) ** 2;
        return da - db;
      })
      .slice(0, MAX_BATCH);

    if (toFetch.length === 0) return;

    for (const p of toFetch) IN_FLIGHT.add(cacheKey(p.lat, p.lon));

    try {
      const results = await fetchAirQualityBatch(toFetch);
      const now = Date.now();
      for (const { lat, lon, aqi } of results) {
        const k = cacheKey(lat, lon);
        if (aqi > 0) GEO_CACHE.set(k, { aqi, ts: now });
        IN_FLIGHT.delete(k);
      }
    } catch {
      for (const p of toFetch) IN_FLIGHT.delete(cacheKey(p.lat, p.lon));
    }

    if (id !== fetchId.current) return; // viewport changed while we were fetching

    // Use the CURRENT viewport bounds for the final render — not the stale `bounds`
    // captured before the fetch. The user may have panned during the fetch window
    // without yet triggering a new updateOverlay (still within the debounce).
    const nowBounds = map.getBounds();
    const nowSpanLat = nowBounds.getNorth() - nowBounds.getSouth();
    const nowSpanLon = nowBounds.getEast()  - nowBounds.getWest();
    const nowPad     = getStep(nowSpanLat, nowSpanLon) * 2;
    const updated    = cachedNear(nowBounds, nowPad);
    if (updated.length >= 2) pushOverlay(nowBounds, updated);
  }, [map, pushOverlay]);

  /* Mount: initial draw + listen for pan/zoom */
  useEffect(() => {
    updateOverlay();

    const schedule = () => {
      clearTimeout(timerRef.current);
      // Immediately invalidate any in-flight fetch so it won't place its overlay
      // at stale bounds once it resolves (handles the case where the fetch completes
      // before the debounce fires the next updateOverlay).
      fetchId.current++;
      timerRef.current = setTimeout(updateOverlay, UPDATE_MS);
    };

    map.on('moveend', schedule);
    map.on('zoomend', schedule);

    return () => {
      map.off('moveend', schedule);
      map.off('zoomend', schedule);
      clearTimeout(timerRef.current);
      fetchId.current++;
      try { if (overlayRef.current) map.removeLayer(overlayRef.current); } catch {}
      overlayRef.current = null;
    };
  }, [map, updateOverlay]);

  /* Click → detailed AQI popup for the exact point */
  useEffect(() => {
    const onClick = async (e) => {
      if (e.originalEvent.target.closest?.('.leaflet-interactive')) return;

      const { lat, lng } = e.latlng;

      if (popupRef.current) {
        map.closePopup(popupRef.current);
        popupRef.current = null;
      }

      const popup = L.popup({ className: 'aqi-popup-wrap', maxWidth: 300 })
        .setLatLng([lat, lng])
        .setContent('<div class="aqi-popup aqi-popup--loading">Fetching air quality…</div>')
        .openOn(map);
      popupRef.current = popup;

      try {
        const data = await fetchAirQuality(lat, lng);
        if (!popup.isOpen()) return;
        const aqi = data?.us_aqi ?? null;
        popup.setContent(buildPopupContent({ aqi, cat: getAqiCategory(aqi), data: data ?? {} }));
        popup.update();
      } catch {
        if (popup.isOpen()) {
          popup.setContent(
            '<div class="aqi-popup aqi-popup--empty">Failed to load air quality data. Try again.</div>'
          );
        }
      }
    };

    map.on('click', onClick);
    return () => map.off('click', onClick);
  }, [map]);

  return null;
}
