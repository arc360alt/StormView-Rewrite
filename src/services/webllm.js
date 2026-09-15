/** Client-side weather assistant powered by WebLLM (https://github.com/mlc-ai/web-llm).
 *  Everything here is dynamically imported by the caller so the library and
 *  model weights are never fetched until the user opens the assistant. */

export const MODELS = [
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 1B (fast, ~0.9 GB)' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 1.5B (slower, better answers, ~1.3 GB)' },
];

export const DEFAULT_MODEL = MODELS[0].id;

const GPU_CHECK_TIMEOUT_MS = 6000;

/**
 * Whether WebGPU is actually usable, not just present. `navigator.gpu`
 * existing doesn't mean a GPU adapter is available — hardware acceleration
 * can be off, the GPU can be driver-blocklisted, or (notably on Linux)
 * `requestAdapter()` can simply hang instead of rejecting. Races it against
 * a timeout so a hung adapter request reads as "unavailable" rather than
 * leaving the caller waiting forever.
 *
 * Returns `{ supported: true }` or `{ supported: false, reason }` where
 * reason is one of 'missing' | 'no-adapter' | 'timeout' | 'error'.
 */
export async function checkWebGPU() {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return { supported: false, reason: 'missing' };
  }
  try {
    const adapter = await Promise.race([
      navigator.gpu.requestAdapter(),
      new Promise((resolve) => setTimeout(() => resolve('__timeout__'), GPU_CHECK_TIMEOUT_MS)),
    ]);
    if (adapter === '__timeout__') return { supported: false, reason: 'timeout' };
    if (!adapter) return { supported: false, reason: 'no-adapter' };
    return { supported: true };
  } catch {
    return { supported: false, reason: 'error' };
  }
}

let enginePromise = null;
let engineModelId = null;

/** Lazily creates (or reuses) the MLCEngine for the given model. */
export async function getEngine(modelId, onProgress) {
  if (enginePromise && engineModelId === modelId) return enginePromise;

  const webllm = await import('@mlc-ai/web-llm');
  engineModelId = modelId;
  enginePromise = webllm.CreateMLCEngine(modelId, {
    initProgressCallback: onProgress,
  });
  return enginePromise;
}

/** Drops the cached engine instance (does not clear the on-disk model cache). */
export function resetEngine() {
  enginePromise = null;
  engineModelId = null;
}

/** Deletes the cached model weights WebLLM stored via the Cache API. */
export async function clearModelCache() {
  const webllm = await import('@mlc-ai/web-llm');
  if (typeof webllm.deleteModelAllInfoInCache === 'function') {
    await Promise.all(MODELS.map((m) => webllm.deleteModelAllInfoInCache(m.id).catch(() => {})));
  } else if (typeof caches !== 'undefined') {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.includes('webllm') || k.includes('mlc')).map((k) => caches.delete(k))
    );
  }
  resetEngine();
}

function fmt(n, digits = 0) {
  return n == null ? '—' : Number(n).toFixed(digits);
}

/** "Today" / "Tomorrow" / weekday name for a daily-forecast index (0 = today). */
function dayLabel(date, index) {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return new Date(date).toLocaleDateString(undefined, { weekday: 'long' });
}

/**
 * Condenses the app's live weather data into a system-prompt block.
 *
 * The local model here is very small (~1B params) and reliably botches
 * multi-step numeric reasoning — e.g. finding the min/max across a list of
 * days, or keeping track of which number belongs to which day when they're
 * packed onto one line. So this does two things a bigger model wouldn't need:
 * one forecast day per line with everything spelled out (not `H68/L46`), and
 * precomputed answers to the questions users actually ask ("which day is
 * coldest") so the model only has to relay a fact instead of computing one.
 */
export function buildWeatherContext(weatherData, units, location) {
  if (!weatherData) return 'No weather data is currently loaded for the user.';

  const tempUnit = units === 'imperial' ? '°F' : '°C';
  const speedUnit = units === 'imperial' ? 'mph' : 'km/h';
  const cu = weatherData.current ?? {};
  const lines = [];

  const now = new Date();
  lines.push(`Today's date: ${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`);

  if (location?.name) {
    lines.push(`Location: ${location.name}${location.state ? `, ${location.state}` : ''}`);
  }

  lines.push(
    `Current conditions right now: ${cu.condition ?? 'unknown'}, temperature ${fmt(cu.temp)}${tempUnit}` +
    (cu.feelsLike != null ? `, feels like ${fmt(cu.feelsLike)}${tempUnit}` : '') +
    (cu.humidity != null ? `, humidity ${cu.humidity}%` : '') +
    (cu.windSpeed != null ? `, wind ${fmt(cu.windSpeed)} ${speedUnit}` : '') +
    (cu.uvIndex != null ? `, UV index ${cu.uvIndex}` : '')
  );

  // Start from the current hour, not midnight — otherwise "next hours" is
  // actually hours that already happened earlier today.
  const hourlyAll = weatherData.hourly ?? [];
  const nowMs = Date.now();
  let startIdx = 0;
  for (let i = 0; i < hourlyAll.length; i++) {
    if (new Date(hourlyAll[i].time).getTime() <= nowMs) startIdx = i;
    else break;
  }
  const hourly = hourlyAll.slice(startIdx, startIdx + 8);
  if (hourly.length) {
    lines.push('');
    lines.push('Hour-by-hour (starting from the current hour):');
    hourly.forEach((h) => {
      const hh = new Date(h.time).toLocaleTimeString(undefined, { hour: 'numeric' });
      lines.push(`- ${hh}: ${fmt(h.temp)}${tempUnit}${h.precipProb != null ? `, ${h.precipProb}% chance of precipitation` : ''}`);
    });
  }

  const daily = (weatherData.daily ?? []).slice(0, 7);
  if (daily.length) {
    lines.push('');
    lines.push('Daily forecast — use these exact numbers, do not recompute or guess new ones:');
    daily.forEach((d, i) => {
      const label = dayLabel(d.date, i);
      const dateStr = new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      lines.push(
        `- ${label} (${dateStr}): high ${fmt(d.tempMax)}${tempUnit}, low ${fmt(d.tempMin)}${tempUnit}` +
        (d.condition ? `, ${d.condition}` : '') +
        (d.precipProb != null ? `, ${d.precipProb}% chance of precipitation` : '')
      );
    });

    const coldest = daily.reduce((a, b, i) => (b.tempMin < a.day.tempMin ? { day: b, i } : a), { day: daily[0], i: 0 });
    const hottest = daily.reduce((a, b, i) => (b.tempMax > a.day.tempMax ? { day: b, i } : a), { day: daily[0], i: 0 });
    lines.push('');
    lines.push(
      `Precomputed answer — the coldest day (lowest low temperature) is ${dayLabel(coldest.day.date, coldest.i)} ` +
      `at ${fmt(coldest.day.tempMin)}${tempUnit}. The hottest day (highest high temperature) is ` +
      `${dayLabel(hottest.day.date, hottest.i)} at ${fmt(hottest.day.tempMax)}${tempUnit}.`
    );
  }

  const alerts = weatherData.alerts ?? [];
  lines.push('');
  if (alerts.length) {
    lines.push('Active alerts: ' + alerts.map((a) => `${a.title} (${a.severity})`).join('; '));
  } else {
    lines.push('No active weather alerts.');
  }

  if (weatherData.airQuality?.us_aqi != null) {
    lines.push(`Air quality: US AQI ${weatherData.airQuality.us_aqi}`);
  }

  return lines.join('\n');
}

export function buildSystemPrompt(weatherData, units, location) {
  return (
    'You are StormView\'s weather assistant, embedded in a weather radar app. ' +
    'Answer questions using ONLY the data below — never invent or recompute numbers. ' +
    'When asked to compare days (e.g. "which day is coldest"), use the line ' +
    'starting with "Precomputed answer" verbatim rather than working it out yourself. ' +
    'Be concise and conversational.\n\n' +
    buildWeatherContext(weatherData, units, location)
  );
}
