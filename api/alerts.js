const webpush = require('web-push');
const {
  getAllSubscriptions,
  updateSeenAlerts,
  removeSubscription,
  setAqiAlertActive,
} = require('./db');

const NWS_UA = 'StormView/1.0 (github.com/arc360alt/StormView-Rewrite)';

// AQI threshold to trigger a notification
const AQI_WARN_THRESHOLD  = 200; // send notification at or above this
const AQI_CLEAR_THRESHOLD = 150; // reset the episode once AQI drops below this

// ── Shared push helper ────────────────────────────────────────────────────────
async function sendPush(sub, payload, ttl = 300) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: ttl }
    );
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`[push] Removing expired subscription …${sub.endpoint.slice(-16)}`);
      removeSubscription(sub.endpoint);
      return 'expired';
    }
    console.error(`[push] Failed for …${sub.endpoint.slice(-16)}:`, err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NWS WEATHER ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

function severityEmoji(severity, certainty) {
  if (severity === 'Extreme')                            return '🚨';
  if (severity === 'Severe')                             return '⚠️';
  if (severity === 'Moderate' && certainty === 'Likely') return '⚡';
  return 'ℹ️';
}

async function fetchNwsAlerts(lat, lon) {
  const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}&limit=20`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': NWS_UA, Accept: 'application/geo+json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) return []; // outside NWS coverage
    if (!res.ok) {
      console.warn(`[nws] Returned ${res.status} for ${lat},${lon}`);
      return [];
    }
    const data = await res.json();
    return data.features ?? [];
  } catch (err) {
    console.warn(`[nws] Fetch failed for ${lat},${lon}:`, err.message);
    return [];
  }
}

// Checks NWS alerts for every subscriber and sends pushes for new ones
async function checkAndSendAlerts() {
  const subs = getAllSubscriptions();
  if (subs.length === 0) return;
  console.log(`[nws] Checking ${subs.length} subscription(s)…`);

  for (const sub of subs) {
    const alerts  = await fetchNwsAlerts(sub.lat, sub.lon);
    const seenIds = JSON.parse(sub.seen_alert_ids || '[]');
    const newAlerts = alerts.filter((a) => !seenIds.includes(a.id));

    let dead = false;
    for (const alert of newAlerts) {
      if (dead) break;
      const p     = alert.properties;
      const emoji = severityEmoji(p.severity, p.certainty);
      const result = await sendPush(sub, {
        title: `${emoji} ${p.event}`,
        body:  p.headline ?? (p.description ?? '').slice(0, 140),
        tag:   alert.id,
        url:   '/',
      });
      if (result === 'expired') { dead = true; break; }
      if (result) console.log(`[nws] Sent "${p.event}" to …${sub.endpoint.slice(-16)}`);
    }

    if (!dead && newAlerts.length > 0) {
      updateSeenAlerts(sub.endpoint, [...seenIds, ...newAlerts.map((a) => a.id)]);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AQI ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchAqi(lat, lon) {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&current=us_aqi&timezone=auto`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.current?.us_aqi ?? null;
  } catch (err) {
    console.warn(`[aqi] Fetch failed for ${lat},${lon}:`, err.message);
    return null;
  }
}

function aqiCategory(aqi) {
  if (aqi >= 300) return { emoji: '🟣', label: 'Very Unhealthy', advice: 'Everyone should avoid all outdoor activity and stay indoors.' };
  if (aqi >= 200) return { emoji: '🔴', label: 'Unhealthy',      advice: 'Avoid prolonged outdoor activity. Sensitive groups should stay indoors.' };
  // Shouldn't be called below 200, but guard anyway
  return           { emoji: '🟠', label: 'Unhealthy for Sensitive Groups', advice: 'Sensitive individuals should limit outdoor activity.' };
}

// Checks AQI for every subscriber; notifies once per "episode" (resets when AQI recovers)
async function checkAqiAlerts() {
  const subs = getAllSubscriptions();
  if (subs.length === 0) return;
  console.log(`[aqi] Checking ${subs.length} subscription(s)…`);

  for (const sub of subs) {
    const aqi = await fetchAqi(sub.lat, sub.lon);
    if (aqi == null) continue;

    const alreadyNotified = !!sub.aqi_alert_active;

    if (aqi >= AQI_WARN_THRESHOLD && !alreadyNotified) {
      // New episode — send notification
      const cat    = aqiCategory(aqi);
      const loc    = sub.location_name || `${sub.lat.toFixed(2)}, ${sub.lon.toFixed(2)}`;
      const result = await sendPush(sub, {
        title: `${cat.emoji} ${cat.label} Air Quality — ${loc}`,
        body:  `AQI is ${aqi}. ${cat.advice}`,
        tag:   `aqi-${sub.endpoint.slice(-10)}`,
        url:   '/',
      }, 3600); // 1-hour TTL — AQI changes slowly
      if (result === 'expired') continue;
      if (result) {
        console.log(`[aqi] Sent AQI=${aqi} alert to …${sub.endpoint.slice(-16)}`);
        setAqiAlertActive(sub.endpoint, true);
      }
    } else if (aqi < AQI_CLEAR_THRESHOLD && alreadyNotified) {
      // Episode over — reset so we can notify again next time it spikes
      setAqiAlertActive(sub.endpoint, false);
      console.log(`[aqi] AQI cleared (${aqi}) for …${sub.endpoint.slice(-16)}`);
    }
  }
}

module.exports = { checkAndSendAlerts, checkAqiAlerts };
