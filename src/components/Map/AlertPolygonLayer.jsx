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

/* ---- Popup HTML (no React — Leaflet uses innerHTML) ---- */
const SEV_COLORS = {
  Extreme: '#ef4444', Severe: '#f97316', Moderate: '#f59e0b', Minor: '#3b82f6',
};

function buildPopupHTML(p) {
  const event    = p.event ?? 'Weather Alert';
  const severity = p.severity ?? '';
  const expires  = p.expires ? `Until ${format(new Date(p.expires), "EEE, MMM d 'at' h:mm a")}` : '';
  const headline = (p.headline ?? '').replace(/\n/g, ' ').trim();
  // Strip NWS asterisk bullet markers and normalise whitespace
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

/* ---- Component ---- */
export function AlertPolygonLayer() {
  const map              = useMap();
  const showAlertPolygons = useAppStore((s) => s.showAlertPolygons);
  const layerRef         = useRef(null);

  useEffect(() => {
    /* When disabled: remove layer and stop */
    if (!showAlertPolygons) {
      if (layerRef.current) {
        try { map.removeLayer(layerRef.current); } catch {}
        layerRef.current = null;
      }
      return;
    }

    async function load() {
      try {
        const res = await fetch(NWS_ALERTS_URL, { headers: HEADERS });
        if (!res.ok) return;
        const data = await res.json();

        /* Remove stale layer before replacing */
        if (layerRef.current) {
          try { map.removeLayer(layerRef.current); } catch {}
          layerRef.current = null;
        }

        /* Only keep features that carry polygon geometry */
        const features = (data.features ?? []).filter(
          (f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
        );
        if (!features.length) return;

        const geoLayer = L.geoJSON(
          { type: 'FeatureCollection', features },
          {
            style: featureStyle,
            zIndex: 300,
            onEachFeature(feature, fLayer) {
              /* Hover highlight */
              fLayer.on('mouseover', (e) => {
                e.target.setStyle({ fillOpacity: 0.6, weight: 3 });
                e.target.bringToFront();
              });
              fLayer.on('mouseout', (e) => {
                geoLayer.resetStyle(e.target);
              });

              /* Click → popup at click coordinates */
              fLayer.on('click', (e) => {
                L.popup({
                  maxWidth: 340,
                  className: 'nws-popup-wrap',
                  closeButton: true,
                })
                  .setLatLng(e.latlng)
                  .setContent(buildPopupHTML(feature.properties))
                  .openOn(map);
              });
            },
          }
        ).addTo(map);

        layerRef.current = geoLayer;
      } catch (err) {
        console.error('[AlertPolygonLayer]', err);
      }
    }

    load();
    const timer = setInterval(load, REFRESH_MS);

    return () => {
      clearInterval(timer);
      if (layerRef.current) {
        try { map.removeLayer(layerRef.current); } catch {}
        layerRef.current = null;
      }
    };
  }, [map, showAlertPolygons]);

  return null;
}
