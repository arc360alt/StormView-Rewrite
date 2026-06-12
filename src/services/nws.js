/* National Weather Service (NWS) API — US locations only */

const BASE = 'https://api.weather.gov';
const HEADERS = { 'User-Agent': 'StormView/1.0 (masondirks58@gmail.com)', Accept: 'application/geo+json' };

async function nwsFetch(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`NWS error ${res.status}: ${text.slice(0, 120)}`);
  }
  return res.json();
}

/** Resolve NWS grid point from lat/lon. Throws if outside US coverage. */
export async function getGridPoint(lat, lon) {
  const data = await nwsFetch(`${BASE}/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
  const p = data.properties;
  return {
    office: p.cwa,
    gridX: p.gridX,
    gridY: p.gridY,
    forecastUrl: p.forecast,
    forecastHourlyUrl: p.forecastHourly,
    observationStationsUrl: p.observationStations,
    timeZone: p.timeZone,
    city: p.relativeLocation?.properties?.city,
    state: p.relativeLocation?.properties?.state,
  };
}

/** Get nearest observation station and latest observation. */
async function getLatestObservation(stationsUrl) {
  const stData = await nwsFetch(`${stationsUrl}?limit=1`);
  const stationId = stData.features?.[0]?.properties?.stationIdentifier;
  if (!stationId) return null;
  const obs = await nwsFetch(`${BASE}/stations/${stationId}/observations/latest`);
  return obs.properties;
}

/** Convert m/s → mph or km/h. */
function msToSpeed(ms, units) {
  if (ms == null) return null;
  return units === 'imperial' ? Math.round(ms * 2.237) : Math.round(ms * 3.6);
}

/** Convert Celsius → Fahrenheit or leave as Celsius. */
function convertTemp(c, units) {
  if (c == null) return null;
  return units === 'imperial' ? Math.round(c * 9 / 5 + 32) : Math.round(c);
}

/** Convert meters → miles or km. */
function convertDistance(m, units) {
  if (m == null) return null;
  return units === 'imperial' ? Math.round(m / 1609.34 * 10) / 10 : Math.round(m / 100) / 10;
}

/** Convert hPa/Pa to hPa. */
function toHpa(pa) {
  if (pa == null) return null;
  return pa > 2000 ? Math.round(pa / 100) : Math.round(pa);
}

/** NWS condition text → WMO-compatible code for icon mapping. */
function shortForecastToCode(text = '', isDaytime = true) {
  const t = text.toLowerCase();
  if (t.includes('thunder')) return 95;
  if (t.includes('snow') && t.includes('rain')) return 61;
  if (t.includes('blizzard') || t.includes('heavy snow')) return 75;
  if (t.includes('snow')) return 71;
  if (t.includes('ice') || t.includes('sleet')) return 77;
  if (t.includes('freezing rain') || t.includes('freezing drizzle')) return 53;
  if (t.includes('heavy rain') || t.includes('heavy shower')) return 82;
  if (t.includes('rain') || t.includes('showers')) return 61;
  if (t.includes('drizzle')) return 51;
  if (t.includes('fog') || t.includes('mist')) return 45;
  if (t.includes('overcast') || t.includes('cloudy')) return 3;
  if (t.includes('mostly cloudy') || t.includes('considerable cloudiness')) return 3;
  if (t.includes('partly cloudy') || t.includes('partly sunny')) return 2;
  if (t.includes('mostly clear') || t.includes('mostly sunny')) return 1;
  if (t.includes('sunny') || t.includes('clear')) return isDaytime ? 0 : 0;
  return 2;
}

/**
 * Fetch all NWS weather data for a lat/lon.
 * Returns normalized data matching the shape used by openmeteo.js.
 */
export async function fetchNWSWeather(lat, lon, units = 'imperial') {
  const grid = await getGridPoint(lat, lon);
  const [forecastData, hourlyData, alertData, obs] = await Promise.all([
    nwsFetch(grid.forecastUrl),
    nwsFetch(grid.forecastHourlyUrl),
    nwsFetch(`${BASE}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`),
    getLatestObservation(grid.observationStationsUrl).catch(() => null),
  ]);

  // --- Current conditions from observation ---
  const o = obs ?? {};
  const current = {
    temp: convertTemp(o.temperature?.value, units),
    feelsLike: null,
    humidity: o.relativeHumidity?.value != null ? Math.round(o.relativeHumidity.value) : null,
    windSpeed: msToSpeed(o.windSpeed?.value, units),
    windDirection: Math.round(o.windDirection?.value ?? 0),
    windGusts: msToSpeed(o.windGust?.value, units),
    visibility: convertDistance(o.visibility?.value, units),
    pressure: toHpa(o.barometricPressure?.value ?? o.seaLevelPressure?.value),
    dewPoint: convertTemp(o.dewpoint?.value, units),
    cloudCover: null,
    uvIndex: null,
    precipProb: null,
    condition: o.textDescription || forecastData.properties?.periods?.[0]?.shortForecast || 'Unknown',
    conditionCode: shortForecastToCode(o.textDescription || forecastData.properties?.periods?.[0]?.shortForecast, true),
    isDay: forecastData.properties?.periods?.[0]?.isDaytime ?? true,
    sunrise: null,
    sunset: null,
  };

  // Fall back to first forecast period temp if obs is unavailable
  if (current.temp == null) {
    const p0 = forecastData.properties?.periods?.[0];
    if (p0) {
      current.temp = units === 'imperial' ? p0.temperature : Math.round((p0.temperature - 32) * 5 / 9);
      current.conditionCode = shortForecastToCode(p0.shortForecast, p0.isDaytime);
      current.condition = p0.shortForecast;
      current.isDay = p0.isDaytime;
    }
  }

  // Fill feelsLike with dewpoint-based estimate if needed
  if (current.feelsLike == null && current.temp != null) {
    current.feelsLike = current.temp;
  }

  // --- Hourly forecast ---
  const hourly = hourlyData.properties.periods.map((p) => { // full ~156 hourly periods (6.5 days)
    const dt = new Date(p.startTime);
    const speedRaw = parseFloat((p.windSpeed || '0').replace(/[^0-9.]/g, ''));
    const speedKmh = (p.windSpeed || '').toLowerCase().includes('mph') ? speedRaw * 1.609 : speedRaw;
    const speedFinal = units === 'imperial' ? Math.round(speedKmh / 1.609) : Math.round(speedKmh);

    return {
      time: dt,
      temp: units === 'imperial' ? p.temperature : Math.round((p.temperature - 32) * 5 / 9),
      feelsLike: null,
      precipProb: p.probabilityOfPrecipitation?.value ?? 0,
      conditionCode: shortForecastToCode(p.shortForecast, p.isDaytime),
      condition: p.shortForecast,
      windSpeed: speedFinal,
      windDirection: 0,
      humidity: p.relativeHumidity?.value != null ? Math.round(p.relativeHumidity.value) : null,
      pressure: null,
      isDay: p.isDaytime,
    };
  });

  // --- Daily forecast from 12-hourly periods ---
  const periods = forecastData.properties.periods;
  const dayMap = new Map();
  for (const p of periods) {
    const day = new Date(p.startTime).toDateString();
    if (!dayMap.has(day)) dayMap.set(day, { day: new Date(p.startTime), periods: [] });
    dayMap.get(day).periods.push(p);
  }

  const daily = [];
  for (const [, { day, periods: ps }] of dayMap) {
    const dayP = ps.find((x) => x.isDaytime) || ps[0];
    const nightP = ps.find((x) => !x.isDaytime);
    const tempDay = units === 'imperial' ? dayP.temperature : Math.round((dayP.temperature - 32) * 5 / 9);
    const tempNight = nightP
      ? units === 'imperial' ? nightP.temperature : Math.round((nightP.temperature - 32) * 5 / 9)
      : null;

    daily.push({
      date: day,
      tempMax: tempDay,
      tempMin: tempNight ?? tempDay - 10,
      conditionCode: shortForecastToCode(dayP.shortForecast, true),
      condition: dayP.shortForecast,
      precipProb: dayP.probabilityOfPrecipitation?.value ?? 0,
      precipSum: null,
      windSpeedMax: null,
      uvIndexMax: null,
      sunrise: null,
      sunset: null,
    });
    if (daily.length >= 7) break;
  }

  // --- Alerts ---
  const alerts = (alertData.features || []).map((f) => {
    const p = f.properties;
    return {
      id: p.id,
      title: p.event,
      description: p.description || p.headline || '',
      instruction: p.instruction || '',
      severity: p.severity,   // 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'
      certainty: p.certainty,
      urgency: p.urgency,
      start: new Date(p.onset || p.sent),
      end: new Date(p.expires),
    };
  });

  return { current, hourly, daily, alerts, source: 'nws', location: { name: grid.city, state: grid.state } };
}
