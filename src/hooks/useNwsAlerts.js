import { useState, useEffect, useCallback } from 'react';
import useAppStore from '../store/useAppStore';

const BASE    = 'https://api.weather.gov';
const HEADERS = { 'User-Agent': 'StormView/1.0 (masondirks58@gmail.com)', Accept: 'application/geo+json' };

function normalize(f) {
  const p = f.properties;
  return {
    id:          f.id,
    title:       p.event,
    headline:    p.headline ?? '',
    description: p.description ?? '',
    instruction: p.instruction ?? '',
    severity:    p.severity   ?? 'Unknown',
    certainty:   p.certainty  ?? 'Unknown',
    urgency:     p.urgency    ?? 'Unknown',
    start:       p.onset   ? new Date(p.onset)   : new Date(p.sent),
    end:         p.expires ? new Date(p.expires) : null,
  };
}

const SEVERITY_ORDER = ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'];

export function useNwsAlerts() {
  const location = useAppStore((s) => s.location);
  const [alerts, setAlerts] = useState([]);

  const load = useCallback(async () => {
    if (!location?.lat || !location?.lon) { setAlerts([]); return; }
    try {
      const res = await fetch(
        `${BASE}/alerts/active?point=${location.lat.toFixed(4)},${location.lon.toFixed(4)}&status=actual`,
        { headers: HEADERS, signal: AbortSignal.timeout(10_000) }
      );
      if (!res.ok) { setAlerts([]); return; }
      const data = await res.json();
      const normalized = (data.features ?? []).map(normalize);
      normalized.sort(
        (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
      );
      setAlerts(normalized);
    } catch {
      // NWS unavailable or outside US — silently hide banner
    }
  }, [location]);

  useEffect(() => {
    load();
    const t = setInterval(load, 90_000);
    return () => clearInterval(t);
  }, [load]);

  return alerts;
}
