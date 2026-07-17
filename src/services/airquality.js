/* Open-Meteo Air Quality API — free, global, no key required */

const BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/** Fetch current US AQI + key pollutant concentrations for any lat/lon. */
export async function fetchAirQuality(lat, lon) {
  const params = new URLSearchParams({
    latitude:  lat.toFixed(6),
    longitude: lon.toFixed(6),
    current:   'us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide',
    timezone:  'auto',
  });
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Air quality API error ${res.status}`);
  const data = await res.json();
  return data.current ?? null;
}

/**
 * Batch-fetch US AQI for multiple points in a single request.
 * Open-Meteo accepts comma-separated latitude/longitude lists.
 * Returns [{lat, lon, aqi}] in the same order as the input.
 */
export async function fetchAirQualityBatch(points) {
  if (points.length === 0) return [];
  const lats = points.map((p) => p.lat.toFixed(4)).join(',');
  const lons  = points.map((p) => p.lon.toFixed(4)).join(',');
  const res = await fetch(
    `${BASE}?latitude=${lats}&longitude=${lons}&current=us_aqi&timezone=auto`
  );
  if (!res.ok) throw new Error(`Air quality batch API error ${res.status}`);
  const data = await res.json();
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((d, i) => ({
    lat: points[i].lat,
    lon: points[i].lon,
    aqi: d.current?.us_aqi ?? 0,
  }));
}

/** US EPA AQI breakpoints — colors follow the official EPA guidance. */
export const AQI_SCALE = [
  {
    max: 50,  color: '#00E400', textColor: '#003300',
    label: 'Good',
    desc:  'Air quality is satisfactory and poses little or no risk.',
  },
  {
    max: 100, color: '#FFFF00', textColor: '#444400',
    label: 'Moderate',
    desc:  'Acceptable quality. Unusually sensitive individuals may experience minor effects.',
  },
  {
    max: 150, color: '#FF7E00', textColor: '#3a1e00',
    label: 'Unhealthy for Sensitive Groups',
    desc:  'Sensitive groups may experience health effects. The general public is less likely to be affected.',
  },
  {
    max: 200, color: '#FF0000', textColor: '#fff',
    label: 'Unhealthy',
    desc:  'Everyone may begin to experience health effects. Sensitive groups may experience more serious effects.',
  },
  {
    max: 300, color: '#8F3F97', textColor: '#fff',
    label: 'Very Unhealthy',
    desc:  'Health alert — everyone may experience serious health effects.',
  },
  {
    max: 500, color: '#7E0023', textColor: '#fff',
    label: 'Hazardous',
    desc:  'Health warning of emergency conditions. The entire population is likely to be affected.',
  },
];

export function getAqiCategory(aqi) {
  if (aqi == null || isNaN(aqi)) return null;
  return AQI_SCALE.find((s) => aqi <= s.max) ?? AQI_SCALE[AQI_SCALE.length - 1];
}
