/* Open-Meteo API — free, global, no key required */

const BASE = 'https://api.open-meteo.com/v1/forecast';

/** WMO weather interpretation codes → { label, conditionCode } */
export const WMO_DESCRIPTIONS = {
  0:  'Clear Sky',
  1:  'Mainly Clear',
  2:  'Partly Cloudy',
  3:  'Overcast',
  45: 'Fog',
  48: 'Icy Fog',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Heavy Drizzle',
  56: 'Freezing Drizzle',
  57: 'Heavy Freezing Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  66: 'Freezing Rain',
  67: 'Heavy Freezing Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Light Showers',
  81: 'Showers',
  82: 'Violent Showers',
  85: 'Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm w/ Hail',
  99: 'Severe Thunderstorm',
};

function windDegToLabel(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export async function fetchOpenMeteoWeather(lat, lon, units = 'imperial') {
  const tempUnit = units === 'imperial' ? 'fahrenheit' : 'celsius';
  const windUnit = units === 'imperial' ? 'mph' : 'kmh';
  const precipUnit = units === 'imperial' ? 'inch' : 'mm';

  const params = new URLSearchParams({
    latitude: lat.toFixed(6),
    longitude: lon.toFixed(6),
    temperature_unit: tempUnit,
    wind_speed_unit: windUnit,
    precipitation_unit: precipUnit,
    timezone: 'auto',
    forecast_days: 7,
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'visibility',
      'uv_index',
      'dew_point_2m',
      'is_day',
    ].join(','),
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'is_day',
      'uv_index',
      'precipitation',
      'visibility',
      'relative_humidity_2m',
      'surface_pressure',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'sunrise',
      'sunset',
      'uv_index_max',
      'shortwave_radiation_sum',
    ].join(','),
  });

  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const d = await res.json();

  const cu = d.current;
  const visRaw = cu.visibility;
  const vis = units === 'imperial' ? Math.round(visRaw / 1609.34 * 10) / 10 : Math.round(visRaw / 1000 * 10) / 10;

  const current = {
    temp: Math.round(cu.temperature_2m),
    feelsLike: Math.round(cu.apparent_temperature),
    humidity: cu.relative_humidity_2m,
    windSpeed: Math.round(cu.wind_speed_10m),
    windDirection: cu.wind_direction_10m,
    windDirectionLabel: windDegToLabel(cu.wind_direction_10m),
    windGusts: Math.round(cu.wind_gusts_10m),
    visibility: vis,
    pressure: Math.round(cu.pressure_msl),
    dewPoint: Math.round(cu.dew_point_2m),
    cloudCover: cu.cloud_cover,
    uvIndex: cu.uv_index,
    precipProb: null,
    precipitation: cu.precipitation,
    condition: WMO_DESCRIPTIONS[cu.weather_code] ?? 'Unknown',
    conditionCode: cu.weather_code,
    isDay: cu.is_day === 1,
    sunrise: d.daily?.sunrise?.[0] ? new Date(d.daily.sunrise[0]) : null,
    sunset: d.daily?.sunset?.[0] ? new Date(d.daily.sunset[0]) : null,
  };

  // --- Hourly (next 48 h) ---
  const ht = d.hourly.time; // full 7-day hourly (168 entries)
  const hourly = ht.map((t, i) => ({
    time: new Date(t),
    temp: Math.round(d.hourly.temperature_2m[i]),
    feelsLike: Math.round(d.hourly.apparent_temperature[i]),
    precipProb: d.hourly.precipitation_probability[i] ?? 0,
    precipitation: d.hourly.precipitation[i] ?? 0,
    conditionCode: d.hourly.weather_code[i],
    condition: WMO_DESCRIPTIONS[d.hourly.weather_code[i]] ?? '',
    windSpeed: Math.round(d.hourly.wind_speed_10m[i]),
    windDirection: d.hourly.wind_direction_10m[i],
    windDirectionLabel: windDegToLabel(d.hourly.wind_direction_10m[i]),
    uvIndex: d.hourly.uv_index[i],
    visibility: units === 'imperial'
      ? Math.round((d.hourly.visibility[i] ?? 0) / 1609.34 * 10) / 10
      : Math.round((d.hourly.visibility[i] ?? 0) / 1000 * 10) / 10,
    humidity: d.hourly.relative_humidity_2m?.[i] ?? null,
    pressure: d.hourly.surface_pressure?.[i] != null ? Math.round(d.hourly.surface_pressure[i]) : null,
    isDay: d.hourly.is_day[i] === 1,
  }));

  // --- Daily ---
  const daily = d.daily.time.map((t, i) => ({
    date: new Date(t + 'T00:00:00'), // force local-time parse (date-only strings parse as UTC otherwise)
    tempMax: Math.round(d.daily.temperature_2m_max[i]),
    tempMin: Math.round(d.daily.temperature_2m_min[i]),
    feelsMax: Math.round(d.daily.apparent_temperature_max[i]),
    feelsMin: Math.round(d.daily.apparent_temperature_min[i]),
    conditionCode: d.daily.weather_code[i],
    condition: WMO_DESCRIPTIONS[d.daily.weather_code[i]] ?? '',
    precipSum: d.daily.precipitation_sum[i] ?? 0,
    precipProb: d.daily.precipitation_probability_max[i] ?? 0,
    windSpeedMax: Math.round(d.daily.wind_speed_10m_max[i]),
    windGustsMax: Math.round(d.daily.wind_gusts_10m_max[i]),
    uvIndexMax: d.daily.uv_index_max[i],
    sunrise: d.daily.sunrise[i] ? new Date(d.daily.sunrise[i]) : null,
    sunset: d.daily.sunset[i] ? new Date(d.daily.sunset[i]) : null,
    shortwaveRadiation: d.daily.shortwave_radiation_sum[i],
  }));

  return { current, hourly, daily, alerts: [], source: 'openmeteo' };
}
