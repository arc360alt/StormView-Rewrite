/* Geocoding via Nominatim (OpenStreetMap) — free, no key required */

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'Accept-Language': 'en-US,en', 'User-Agent': 'StormView/1.0' };

/**
 * Forward geocode: city name → [{ lat, lon, name, state, country, display }]
 */
export async function searchLocation(query) {
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error('Geocoding search failed');
  const data = await res.json();

  return data.map((r) => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    name: r.address?.city || r.address?.town || r.address?.village || r.address?.county || r.name,
    state: r.address?.state || r.address?.region || '',
    country: r.address?.country_code?.toUpperCase() || '',
    display: r.display_name,
  }));
}

/**
 * Reverse geocode: lat/lon → { lat, lon, name, state, country }
 */
export async function reverseGeocode(lat, lon) {
  const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();

  return {
    lat,
    lon,
    name: data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Unknown',
    state: data.address?.state || data.address?.region || '',
    country: data.address?.country_code?.toUpperCase() || '',
  };
}
