const webpush = require('web-push');
const {
  getAllSubscriptions,
  updateSeenAlerts,
  removeSubscription,
  setAqiAlertActive,
} = require('./db');

const NWS_UA    = 'StormView/1.0 (github.com/arc360alt/StormView-Rewrite)';
const NWS_HDRS  = { 'User-Agent': NWS_UA, Accept: 'application/geo+json' };

// Zone cache: "lat,lon" → { zones: string[], expires: number }
// NWS zone IDs rarely change, so cache for 24 h to avoid /points lookups on every poll.
const ZONE_CACHE = new Map();

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

// Resolve lat/lon → NWS forecast + county zone IDs via /points.
// Zone-based queries are far more reliable than ?point= for coastal/boundary areas.
async function resolveZones(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = ZONE_CACHE.get(key);
  if (cached && Date.now() < cached.expires) return cached.zones;

  try {
    const res = await fetch(`https://api.weather.gov/points/${key}`, {
      headers: NWS_HDRS,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[nws] Zone lookup HTTP ${res.status} for ${key} — outside NWS coverage`);
      return null;
    }
    const data = await res.json();
    const p     = data.properties ?? {};
    const zones = [
      p.forecastZone?.split('/').pop(),
      p.county?.split('/').pop(),
    ].filter(Boolean);
    if (zones.length === 0) {
      console.warn(`[nws] No zones returned for ${key}`);
      return null;
    }
    console.log(`[nws] Zones for ${key}: ${zones.join(', ')}`);
    ZONE_CACHE.set(key, { zones, expires: Date.now() + 24 * 60 * 60 * 1000 });
    return zones;
  } catch (err) {
    console.warn(`[nws] Zone lookup failed for ${key}:`, err.message);
    return null;
  }
}

async function fetchNwsAlerts(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;

  // ── Step 1: point-based query ─────────────────────────────────────────────
  // NWS does server-side polygon intersection, so this correctly finds polygon-
  // based warnings (tornado, SVR) even when the warning isn't tagged with a
  // specific county UGC code. Zone-based queries miss these.
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${key}&limit=20`,
      { headers: NWS_HDRS, signal: AbortSignal.timeout(10_000) }
    );
    if (res.ok) {
      const data = await res.json();
      return data.features ?? [];
    }
    // 400 = point outside NWS coverage (ocean / offshore) → fall through to zone-based
    if (res.status !== 400 && res.status !== 404) {
      console.warn(`[nws] Point query HTTP ${res.status} for ${key}`);
    }
  } catch (err) {
    console.warn(`[nws] Point query failed for ${key}:`, err.message);
  }

  // ── Step 2: zone-based fallback ───────────────────────────────────────────
  // Used when the point is over water / outside NWS point coverage.
  const zones = await resolveZones(lat, lon);
  if (!zones) return [];

  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?zone=${zones.join(',')}&limit=20`,
      { headers: NWS_HDRS, signal: AbortSignal.timeout(10_000) }
    );
    if (res.status === 404 || res.status === 400) return [];
    if (!res.ok) {
      console.warn(`[nws] Zone query HTTP ${res.status} for ${key}`);
      return [];
    }
    const data = await res.json();
    return data.features ?? [];
  } catch (err) {
    console.warn(`[nws] Zone query failed for ${key}:`, err.message);
    return [];
  }
}

// Checks NWS alerts for every subscriber and sends pushes for new ones
async function checkAndSendAlerts() {
  const subs = getAllSubscriptions();
  if (subs.length === 0) return;
  console.log(`[nws] Checking ${subs.length} subscription(s)…`);

  for (const sub of subs) {
    if (!sub.nws_enabled) continue; // user opted out of NWS alerts

    const loc    = sub.location_name || `${sub.lat.toFixed(4)},${sub.lon.toFixed(4)}`;
    const alerts = await fetchNwsAlerts(sub.lat, sub.lon);

    // Prune seen_alert_ids: only keep IDs that are still present in the current
    // NWS response. This prevents stale IDs from silently suppressing future
    // notifications — e.g. if a previous server session already saw a warning
    // that's still active, old seen IDs get cleared once the warning expires and
    // a new warning is later issued. It also means if the warning is STILL active
    // and we already notified, we don't re-notify (still-active ID stays in seen).
    const rawSeen   = JSON.parse(sub.seen_alert_ids || '[]');
    const activeIds = alerts.map((a) => a.id);
    const seenIds   = rawSeen.filter((id) => activeIds.includes(id));
    const newAlerts = alerts.filter((a) => !seenIds.includes(a.id));

    if (alerts.length === 0) {
      console.log(`[nws] No active alerts for ${loc}`);
    } else if (newAlerts.length === 0) {
      console.log(`[nws] ${alerts.length} alert(s) for ${loc} — all already notified`);
    } else {
      console.log(`[nws] ${newAlerts.length} new / ${alerts.length} total alert(s) for ${loc}`);
    }

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
      if (result) console.log(`[nws] ✓ Sent "${p.event}" to ${loc}`);
    }

    if (!dead) {
      // Persist: currently-active IDs we've seen + any new ones just notified
      const updatedSeen = [...new Set([...seenIds, ...newAlerts.map((a) => a.id)])];
      if (JSON.stringify(updatedSeen.sort()) !== JSON.stringify(rawSeen.slice().sort())) {
        updateSeenAlerts(sub.endpoint, updatedSeen);
      }
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
    if (!sub.aqi_enabled) continue; // user opted out of AQI alerts

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
