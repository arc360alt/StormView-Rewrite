/**
 * Open-Meteo Maps radar source.
 *
 * Unlike LibreWXR/StormCast (server-rendered radar PNG tiles), Open-Meteo Maps
 * streams raw weather-model data (`.om` files) from S3 and renders it in the
 * browser. It's very fast and global, and the recent forecast hours act as a
 * short-range "nowcast".
 *
 * Both the weather model ("domain") and the rendered variable ("layer") are
 * configurable — see DOMAINS and fetchOpenMeteoLayers().
 *
 * Note: we build the fully-resolved `.om` URL ourselves (model-run dir + valid
 * time), exactly like maps.open-meteo.com — the library's `time_step=` capture
 * API is unreliable in v0.1.0.
 */

const BASE = 'https://openmeteo.s3.amazonaws.com/data_spatial';

// A curated shortlist that renders well for precipitation. `value` is the
// Open-Meteo data_spatial slug; labels match the official map picker.
export const DOMAINS = [
  { value: 'dwd_icon',          label: 'DWD ICON',          scope: 'Global' },
  { value: 'ecmwf_ifs025',      label: 'ECMWF IFS 0.25°',   scope: 'Global' },
  { value: 'ncep_gfs013',       label: 'GFS Global 0.13°',  scope: 'Global' },
  { value: 'cmc_gem_gdps_15km', label: 'GEM Global',        scope: 'Global' },
  { value: 'ncep_nam_conus',    label: 'GFS NAM Conus',     scope: 'US' },
  { value: 'ncep_hrrr_conus',   label: 'GFS HRRR Conus',    scope: 'US' },
];

export const DEFAULT_DOMAIN = 'ncep_gfs013';

function domainSlug(domain) {
  return DOMAINS.some((d) => d.value === domain) ? domain : DEFAULT_DOMAIN;
}

// How much of the model's valid-time range to expose on the scrubber.
const WINDOW_BACK_MS = 3  * 3600 * 1000;
const WINDOW_FWD_MS  = 12 * 3600 * 1000;

const pad = (n) => String(n).padStart(2, '0');

// YYYY/MM/DD/HHmmZ  — the model-run directory
const fmtModelRun = (d) =>
  `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z`;

// YYYY-MM-DDTHHmm  — the valid-time file name
const fmtValidTime = (d) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;

/** Fully-resolved `om://` URL for one frame + variable. */
export function buildOmUrl(domain, run, valid, variable = 'precipitation') {
  return `om://${BASE}/${domainSlug(domain)}/${run}/${valid}.om?variable=${variable}`;
}

// latest.json is small and rotates every few hours — cache per domain briefly
// and share it between the frame loader and the layer list.
const metaCache = new Map(); // domain -> { at, data }
const META_TTL = 60_000;

async function getMeta(domain, signal) {
  const slug = domainSlug(domain);
  const hit = metaCache.get(slug);
  if (hit && Date.now() - hit.at < META_TTL) return hit.data;
  const res = await fetch(`${BASE}/${slug}/latest.json`, { cache: 'no-cache', signal });
  if (!res.ok) throw new Error(`Open-Meteo Maps API error: ${res.status}`);
  const data = await res.json();
  metaCache.set(slug, { at: Date.now(), data });
  return data;
}

/**
 * Frames in the same shape the StormCast source uses so the scrubber and
 * playback logic don't care which source is active.
 *   { time: <unix s>, type: 'past' | 'nowcast', domain, run, valid, source }
 * The `om://` URL is built later from domain/run/valid + the chosen variable.
 */
export async function fetchOpenMeteoRadarFrames(signal, domain = DEFAULT_DOMAIN) {
  const slug = domainSlug(domain);
  const data = await getMeta(slug, signal);

  const refRun = fmtModelRun(new Date(data.reference_time));
  const validTimes = Array.isArray(data.valid_times) ? data.valid_times : [];
  const now = Date.now();

  const all = validTimes
    .map((iso) => new Date(iso))
    .filter((d) => !Number.isNaN(d.getTime()));

  let picked = all.filter(
    (d) => d.getTime() >= now - WINDOW_BACK_MS && d.getTime() <= now + WINDOW_FWD_MS
  );
  if (picked.length === 0) picked = all.slice(0, 8); // stale run fallback

  return picked.map((d) => ({
    time: Math.floor(d.getTime() / 1000),
    type: d.getTime() <= now ? 'past' : 'nowcast',
    domain: slug,
    run: refRun,
    valid: fmtValidTime(d),
    source: 'openmeteo',
  }));
}

// Surface layers worth floating to the top of the list.
const PRIORITY = [
  'precipitation', 'rain', 'showers', 'snowfall_water_equivalent', 'weather_code',
  'temperature_2m', 'dew_point_2m', 'relative_humidity_2m', 'wind_gusts_10m',
  'cape', 'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
  'pressure_msl', 'snow_depth', 'freezing_level_height',
];

const LABEL_OVERRIDES = {
  cape: 'CAPE',
  pressure_msl: 'Pressure (MSL)',
  weather_code: 'Weather Code',
  temperature_2m: 'Temperature (2 m)',
  dew_point_2m: 'Dew Point (2 m)',
  relative_humidity_2m: 'Relative Humidity (2 m)',
  wind_gusts_10m: 'Wind Gusts (10 m)',
  snowfall_water_equivalent: 'Snowfall (water eq.)',
};

/** "temperature_850hPa" → "Temperature (850 hPa)", "soil_moisture_0_to_1cm" → "Soil Moisture (0-1 cm)" */
function prettyLabel(v) {
  if (LABEL_OVERRIDES[v]) return LABEL_OVERRIDES[v];
  const s = v
    .replace(/_(\d+)hpa$/i, ' ($1 hPa)')
    .replace(/_(\d+)m$/i, ' ($1 m)')
    .replace(/_(\d+)cm$/i, ' ($1 cm)')
    .replace(/_(\d+)_to_(\d+)cm$/i, ' ($1-$2 cm)')
    .replace(/_u_component/i, ' (U)')
    .replace(/_v_component/i, ' (V)')
    .replace(/_/g, ' ');
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Every layer the given domain exposes, as { value, label } — the model's own
 * variable list (from latest.json), priority surface layers first.
 */
export async function fetchOpenMeteoLayers(signal, domain = DEFAULT_DOMAIN) {
  const data = await getMeta(domainSlug(domain), signal);
  const vars = Array.isArray(data.variables) ? [...new Set(data.variables)] : [];

  const rank = (v) => {
    const i = PRIORITY.indexOf(v);
    return i === -1 ? PRIORITY.length : i;
  };

  return vars
    .map((value) => ({ value, label: prettyLabel(value) }))
    .sort((a, b) => rank(a.value) - rank(b.value) || a.label.localeCompare(b.label));
}
