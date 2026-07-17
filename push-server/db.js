const Database = require('better-sqlite3');
const path = require('path');

let db;

function initDB() {
  db = new Database(path.join(__dirname, 'subscriptions.db'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint         TEXT    UNIQUE NOT NULL,
      p256dh           TEXT    NOT NULL,
      auth             TEXT    NOT NULL,
      lat              REAL    NOT NULL,
      lon              REAL    NOT NULL,
      location_name    TEXT    DEFAULT '',
      seen_alert_ids   TEXT    DEFAULT '[]',
      aqi_alert_active INTEGER DEFAULT 0,
      nws_enabled      INTEGER DEFAULT 1,
      aqi_enabled      INTEGER DEFAULT 1,
      created_at       INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Migrations for databases created before these columns existed
  try { db.exec('ALTER TABLE subscriptions ADD COLUMN aqi_alert_active INTEGER DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE subscriptions ADD COLUMN nws_enabled INTEGER DEFAULT 1'); } catch {}
  try { db.exec('ALTER TABLE subscriptions ADD COLUMN aqi_enabled INTEGER DEFAULT 1'); } catch {}

  console.log('[db] Subscriptions database ready.');
}

function saveSubscription(subscription, lat, lon, locationName) {
  db.prepare(`
    INSERT INTO subscriptions (endpoint, p256dh, auth, lat, lon, location_name)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh           = excluded.p256dh,
      auth             = excluded.auth,
      lat              = excluded.lat,
      lon              = excluded.lon,
      location_name    = excluded.location_name,
      seen_alert_ids   = CASE
        WHEN ABS(subscriptions.lat - excluded.lat) > 0.01
          OR ABS(subscriptions.lon - excluded.lon) > 0.01
        THEN '[]'
        ELSE subscriptions.seen_alert_ids
      END,
      aqi_alert_active = CASE
        WHEN ABS(subscriptions.lat - excluded.lat) > 0.1
          OR ABS(subscriptions.lon - excluded.lon) > 0.1
        THEN 0
        ELSE subscriptions.aqi_alert_active
      END
  `).run(
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    lat, lon,
    locationName || ''
  );
}

// Update only the alert type preferences for an existing subscription
function updatePreferences(endpoint, nwsEnabled, aqiEnabled) {
  db.prepare(
    'UPDATE subscriptions SET nws_enabled = ?, aqi_enabled = ? WHERE endpoint = ?'
  ).run(nwsEnabled ? 1 : 0, aqiEnabled ? 1 : 0, endpoint);
}

function removeSubscription(endpoint) {
  db.prepare('DELETE FROM subscriptions WHERE endpoint = ?').run(endpoint);
}

function getAllSubscriptions() {
  return db.prepare('SELECT * FROM subscriptions').all();
}

function updateSeenAlerts(endpoint, alertIds) {
  const trimmed = alertIds.slice(-100);
  db.prepare('UPDATE subscriptions SET seen_alert_ids = ? WHERE endpoint = ?')
    .run(JSON.stringify(trimmed), endpoint);
}

function setAqiAlertActive(endpoint, active) {
  db.prepare('UPDATE subscriptions SET aqi_alert_active = ? WHERE endpoint = ?')
    .run(active ? 1 : 0, endpoint);
}

module.exports = {
  initDB,
  saveSubscription,
  updatePreferences,
  removeSubscription,
  getAllSubscriptions,
  updateSeenAlerts,
  setAqiAlertActive,
};
