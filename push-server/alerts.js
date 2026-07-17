const webpush = require('web-push');
const {
  getAllSubscriptions,
  updateSeenAlerts,
  removeSubscription,
  setAqiAlertActive,
} = require('./db');

const NWS_UA    = 'StormView/1.0 (github.com/arc360alt/StormView-Rewrite)';
const NWS_HDRS  = { 'User-Agent': NWS_UA, Accept: 'application/geo+json' };

// Zone cache: "lat,lon" → { zones: string[], stateCode: string, expires: number }
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

// ── Point-in-polygon (ray casting) ───────────────────────────────────────────
function ptInRing(pt, ring) {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInGeometry(lat, lon, geometry) {
  const pt = [lon, lat]; // GeoJSON is [lon, lat]
  if (geometry.type === 'Polygon') return ptInRing(pt, geometry.coordinates[0]);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some((p) => ptInRing(pt, p[0]));
  return false;
}

// Resolve lat/lon → NWS zone IDs + state code via /points.
// Cached for 24 h since zone assignments don't change.
async function resolveZones(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = ZONE_CACHE.get(key);
  if (cached && Date.now() < cached.expires) return cached;

  try {
    const res = await fetch(`https://api.weather.gov/points/${key}`, {
      headers: NWS_HDRS,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[nws] /points HTTP ${res.status} for ${key} — outside NWS coverage`);
      return null;
    }
    const data  = await res.json();
    const p     = data.properties ?? {};
    const zones = [
      p.forecastZone?.split('/').pop(),
      p.county?.split('/').pop(),
    ].filter(Boolean);
    if (zones.length === 0) {
      console.warn(`[nws] No zones returned for ${key}`);
      return null;
    }
    const stateCode = zones[0].slice(0, 2); // 'NDZ014' → 'ND'
    console.log(`[nws] Zones for ${key}: ${zones.join(', ')} (state: ${stateCode})`);
    const entry = { zones, stateCode, expires: Date.now() + 24 * 60 * 60 * 1000 };
    ZONE_CACHE.set(key, entry);
    return entry;
  } catch (err) {
    console.warn(`[nws] Zone lookup failed for ${key}:`, err.message);
    return null;
  }
}

async function fetchNwsAlerts(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;

  // Resolve zones + state code
  const zoneInfo = await resolveZones(lat, lon);
  if (!zoneInfo) return [];
  const { zones, stateCode } = zoneInfo;

  // Fetch ALL active alerts for the state, then filter locally.
  // This catches both UGC-tagged alerts (zone match) and polygon-only
  // warnings like tornado/SVR that may not carry county UGC codes.
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?area=${stateCode}&status=actual`,
      { headers: NWS_HDRS, signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) {
      console.warn(`[nws] State alert query HTTP ${res.status} for ${stateCode}`);
      return [];
    }
    const data     = await res.json();
    const features = data.features ?? [];

    const matched = features.filter((f) => {
      const ugc = f.properties?.geocode?.UGC ?? [];
      if (zones.some((z) => ugc.includes(z))) return true;
      if (f.geometry) return pointInGeometry(lat, lon, f.geometry);
      return false;
    });

    console.log(`[nws] ${stateCode} has ${features.length} alert(s); ${matched.length} match ${zones.join(',')}`);
    return matched;
  } catch (err) {
    console.warn(`[nws] State alert query failed for ${stateCode}:`, err.message);
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
