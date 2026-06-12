/* Open-Meteo Air Quality API — free, global, no key required */

const BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export async function fetchAirQuality(lat, lon) {
  const params = new URLSearchParams({
    latitude:  lat.toFixed(6),
    longitude: lon.toFixed(6),
    current:   'us_aqi',
    timezone:  'auto',
  });

  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Air quality: ${res.status}`);
  const d = await res.json();

  return { aqi: d.current?.us_aqi ?? null };
}
