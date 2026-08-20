import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import useAppStore from '../../store/useAppStore';

const NWS_ALERTS_URL =
  'https://api.weather.gov/alerts/active?status=actual&message_type=alert,update';
const HEADERS = { 'User-Agent': 'StormView/1.0', Accept: 'application/geo+json' };
const REFRESH_MS = 5 * 60 * 1000;

/* ---- Per-event-type fill/stroke colours matching NWS convention ---- */
const EVENT_STYLE = {
  'Tornado Warning':                 { fill: '#FF0000', stroke: '#CC0000', opacity: 0.38 },
  'Tornado Watch':                   { fill: '#FFFF00', stroke: '#CCBB00', opacity: 0.28 },
  'Tornado Emergency':               { fill: '#FF00FF', stroke: '#CC00CC', opacity: 0.45 },
  'Severe Thunderstorm Warning':     { fill: '#FFA500', stroke: '#CC6600', opacity: 0.35 },
  'Severe Thunderstorm Watch':       { fill: '#DDBB00', stroke: '#AA8800', opacity: 0.25 },
  'Flash Flood Warning':             { fill: '#00CC00', stroke: '#008800', opacity: 0.35 },
  'Flash Flood Watch':               { fill: '#2E8B57', stroke: '#1A5C38', opacity: 0.25 },
  'Flash Flood Emergency':           { fill: '#8B0000', stroke: '#5C0000', opacity: 0.42 },
  'Flood Warning':                   { fill: '#00AA00', stroke: '#007700', opacity: 0.30 },
  'Flood Watch':                     { fill: '#2E8B57', stroke: '#1A5C38', opacity: 0.22 },
  'Flood Advisory':                  { fill: '#00FF7F', stroke: '#00BB60', opacity: 0.20 },
  'Winter Storm Warning':            { fill: '#9400D3', stroke: '#6A0099', opacity: 0.35 },
  'Winter Storm Watch':              { fill: '#4682B4', stroke: '#2E5A8A', opacity: 0.25 },
  'Blizzard Warning':                { fill: '#FF4500', stroke: '#CC3300', opacity: 0.38 },
  'Ice Storm Warning':               { fill: '#8B0000', stroke: '#5C0000', opacity: 0.35 },
  'Winter Weather Advisory':         { fill: '#7B68EE', stroke: '#5A4ECC', opacity: 0.22 },
  'Wind Advisory':                   { fill: '#D2691E', stroke: '#A0481A', opacity: 0.22 },
  'High Wind Warning':               { fill: '#DAA520', stroke: '#A07818', opacity: 0.30 },
  'Dense Fog Advisory':              { fill: '#708090', stroke: '#4A5568', opacity: 0.22 },
  'Heat Advisory':                   { fill: '#FF7F50', stroke: '#CC5A30', opacity: 0.22 },
  'Excessive Heat Warning':          { fill: '#C71585', stroke: '#8B0E5C', opacity: 0.35 },
  'Extreme Cold Warning':            { fill: '#0000FF', stroke: '#0000CC', opacity: 0.35 },
  'Special Weather Statement':       { fill: '#FFE4B5', stroke: '#CCBB8E', opacity: 0.22 },
  'Air Quality Alert':               { fill: '#8B8B00', stroke: '#666600', opacity: 0.20 },
  'Beach Hazard Statement':          { fill: '#40E0D0', stroke: '#28A8A0', opacity: 0.20 },
  'Rip Current Statement':           { fill: '#008B8B', stroke: '#006666', opacity: 0.22 },
  'Small Craft Advisory':            { fill: '#D2B48C', stroke: '#A08060', opacity: 0.20 },
  'Frost Advisory':                  { fill: '#6495ED', stroke: '#4070CC', opacity: 0.20 },
  'Freeze Warning':                  { fill: '#483D8B', stroke: '#302866', opacity: 0.28 },
  'Hard Freeze Warning':             { fill: '#9400D3', stroke: '#6A0099', opacity: 0.30 },
  'Freeze Watch':                    { fill: '#00CED1', stroke: '#009DA0', opacity: 0.20 },
  'Lake Wind Advisory':              { fill: '#D2691E', stroke: '#A0481A', opacity: 0.18 },
  'Dust Advisory':                   { fill: '#BDB76B', stroke: '#8A8440', opacity: 0.22 },
  'Dust Storm Warning':              { fill: '#FFE4C4', stroke: '#CCA88A', opacity: 0.30 },
  'Smoke Advisory':                  { fill: '#808080', stroke: '#555555', opacity: 0.20 },
  'Red Flag Warning':                { fill: '#FF1493', stroke: '#CC0060', opacity: 0.30 },
  'Fire Weather Watch':              { fill: '#FFDEAD', stroke: '#CCA868', opacity: 0.22 },
};

const SEVERITY_STYLE = {
  Extreme:  { fill: '#FF0000', stroke: '#CC0000', opacity: 0.35 },
  Severe:   { fill: '#FF6600', stroke: '#CC4400', opacity: 0.30 },
  Moderate: { fill: '#FFAA00', stroke: '#CC7700', opacity: 0.25 },
  Minor:    { fill: '#4169E1', stroke: '#2E4FAA', opacity: 0.20 },
};

function featureStyle(feature) {
  const ev  = feature.properties?.event || '';
  const sev = feature.properties?.severity || '';
  const cfg = EVENT_STYLE[ev] ?? SEVERITY_STYLE[sev] ?? { fill: '#888888', stroke: '#555555', opacity: 0.18 };
  return { fillColor: cfg.fill, color: cfg.stroke, fillOpacity: cfg.opacity, weight: 2, opacity: 0.85 };
}

function advisoryStyle(feature) {
  // Same colours but dashed border to signal these are zone-based (approximate boundaries)
  return { ...featureStyle(feature), dashArray: '5 4', weight: 1.5, opacity: 0.70 };
}

/* ---- Popup HTML (no React — Leaflet uses innerHTML) ---- */
const SEV_COLORS = {
  Extreme: '#ef4444', Severe: '#f97316', Moderate: '#f59e0b', Minor: '#3b82f6',
};

function buildPopupHTML(p) {
  const event    = p.event ?? 'Weather Alert';
  const severity = p.severity ?? '';
  const expires  = p.expires ? `Until ${format(new Date(p.expires), "EEE, MMM d 'at' h:mm a")}` : '';
  const headline = (p.headline ?? '').replace(/\n/g, ' ').trim();
  const desc     = (p.description ?? '').replace(/\* /g, '\n• ').replace(/\n{3,}/g, '\n\n').trim();
  const instr    = (p.instruction ?? '').trim();
  const sevColor = SEV_COLORS[severity] ?? '#94a3b8';

  const escHTML = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `
    <div class="nws-ap">
      <div class="nws-ap-header">
        <span class="nws-ap-event">${escHTML(event)}</span>
        ${severity ? `<span class="nws-ap-sev" style="color:${sevColor}">${escHTML(severity)}</span>` : ''}
      </div>
      ${expires  ? `<div class="nws-ap-time">${escHTML(expires)}</div>` : ''}
      ${headline ? `<div class="nws-ap-headline">${escHTML(headline)}</div>` : ''}
      ${desc || instr ? `
        <div class="nws-ap-scroll">
          ${desc  ? `<pre class="nws-ap-body">${escHTML(desc)}</pre>` : ''}
          ${instr ? `<pre class="nws-ap-instr">${escHTML(instr)}</pre>` : ''}
        </div>` : ''}
    </div>`;
}

/* ---- Zone geometry cache (zones are static admin boundaries — never expire) ---- */
const ZONE_GEO_CACHE = new Map(); // zoneId → GeoJSON geometry | null

async function fetchZoneGeom(zoneId) {
  if (ZONE_GEO_CACHE.has(zoneId)) return ZONE_GEO_CACHE.get(zoneId);
  // UGC ID format: SSZ000 (forecast/fire zone) or SSC000 (county zone)
  const zoneType = zoneId[2] === 'C' ? 'county' : 'forecast';
  try {
    const res = await fetch(
      `https://api.weather.gov/zones/${zoneType}/${zoneId}`,
      { headers: HEADERS, signal: AbortSignal.timeout(8_000) }
    );
    if (!res.ok) { ZONE_GEO_CACHE.set(zoneId, null); return null; }
    const data = await res.json();
    const geo = data.geometry ?? null;
    ZONE_GEO_CACHE.set(zoneId, geo);
    return geo;
  } catch {
    ZONE_GEO_CACHE.set(zoneId, null);
    return null;
  }
}

// Fetch zone geometries in parallel batches (avoids hammering the NWS API)
async function resolveZoneGeometries(zoneIds) {
  const CONCURRENCY = 6;
  const results = new Map();
  // Pull already-cached entries immediately
  const toFetch = zoneIds.filter((id) => {
    if (ZONE_GEO_CACHE.has(id)) { results.set(id, ZONE_GEO_CACHE.get(id)); return false; }
    return true;
  });
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const chunk = toFetch.slice(i, i + CONCURRENCY);
    const geos  = await Promise.all(chunk.map(fetchZoneGeom));
    chunk.forEach((id, j) => results.set(id, geos[j]));
  }
  return results;
}

// Expand zone-based alerts into renderable GeoJSON features using NWS zone boundaries
async function buildAdvisoryFeatures(alerts) {
  // Map each zone ID to its highest-priority alert (sorted by severity already)
  const zoneToAlert = new Map();
  for (const alert of alerts) {
    for (const zoneId of alert.properties?.geocode?.UGC ?? []) {
      if (!zoneToAlert.has(zoneId)) zoneToAlert.set(zoneId, alert);
    }
  }
  if (zoneToAlert.size === 0) return [];

  const geoMap = await resolveZoneGeometries([...zoneToAlert.keys()]);

  const features = [];
  for (const [zoneId, geo] of geoMap) {
    if (!geo) continue;
    features.push({
      type: 'Feature',
      geometry: geo,
      properties: zoneToAlert.get(zoneId).properties,
    });
  }
  return features;
}

/* ---- Shared layer builder ---- */
function buildGeoLayer(features, map, styleFn) {
  // `geoLayer` is referenced inside the closure for resetStyle — assigned below
  let geoLayer;
  geoLayer = L.geoJSON(
    { type: 'FeatureCollection', features },
    {
      style: styleFn,
      zIndex: 300,
      onEachFeature(feature, fLayer) {
        fLayer.on('mouseover', (e) => {
          e.target.setStyle({ fillOpacity: 0.6, weight: 3, dashArray: null });
          e.target.bringToFront();
        });
        fLayer.on('mouseout', (e) => { geoLayer.resetStyle(e.target); });
        fLayer.on('click', (e) => {
          L.popup({ maxWidth: 340, className: 'nws-popup-wrap', closeButton: true })
            .setLatLng(e.latlng)
            .setContent(buildPopupHTML(feature.properties))
            .openOn(map);
        });
      },
    }
  ).addTo(map);
  return geoLayer;
}

/* ---- Component ---- */
export function AlertPolygonLayer() {
  const map               = useMap();
  const showAlertPolygons = useAppStore((s) => s.showAlertPolygons);
  const showAdvisories    = useAppStore((s) => s.showAdvisories);
  const warningLayerRef   = useRef(null); // polygon-geometry warnings
  const advisoryLayerRef  = useRef(null); // zone-boundary advisories

  const removeLayers = () => {
    [warningLayerRef, advisoryLayerRef].forEach((ref) => {
      if (ref.current) { try { map.removeLayer(ref.current); } catch {} ref.current = null; }
    });
  };

  useEffect(() => {
    if (!showAlertPolygons) { removeLayers(); return; }

    async function load() {
      try {
        const res = await fetch(NWS_ALERTS_URL, { headers: HEADERS });
        if (!res.ok) return;
        const data = await res.json();
        const all  = data.features ?? [];

        // Split: features with explicit polygon geometry vs zone-coded features
        const hasPolygon = (f) =>
          f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon';

        const polygonFeatures = all.filter(hasPolygon);
        const zoneFeatures    = showAdvisories ? all.filter((f) => !hasPolygon(f)) : [];

        // --- Warnings layer (polygon geometry, solid borders) ---
        if (warningLayerRef.current) {
          try { map.removeLayer(warningLayerRef.current); } catch {}
          warningLayerRef.current = null;
        }
        if (polygonFeatures.length) {
          warningLayerRef.current = buildGeoLayer(polygonFeatures, map, featureStyle);
        }

        // --- Advisories layer (zone boundaries, dashed borders) ---
        if (advisoryLayerRef.current) {
          try { map.removeLayer(advisoryLayerRef.current); } catch {}
          advisoryLayerRef.current = null;
        }
        if (zoneFeatures.length) {
          const advisoryGeoFeatures = await buildAdvisoryFeatures(zoneFeatures);
          if (advisoryGeoFeatures.length) {
            advisoryLayerRef.current = buildGeoLayer(advisoryGeoFeatures, map, advisoryStyle);
          }
        }
      } catch (err) {
        console.error('[AlertPolygonLayer]', err);
      }
    }

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(timer);
      removeLayers();
    };
  }, [map, showAlertPolygons, showAdvisories]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
