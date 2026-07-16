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
      created_at       INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Migrate existing databases that were created before aqi_alert_active was added
  try {
    db.exec('ALTER TABLE subscriptions ADD COLUMN aqi_alert_active INTEGER DEFAULT 0');
  } catch {} // column already exists — that's fine

  console.log('[db] Subscriptions database ready.');
}

function saveSubscription(subscription, lat, lon, locationName) {
  db.prepare(`
    INSERT INTO subscriptions (endpoint, p256dh, auth, lat, lon, location_name)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh        = excluded.p256dh,
      auth          = excluded.auth,
      lat           = excluded.lat,
      lon           = excluded.lon,
      location_name = excluded.location_name
  `).run(
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    lat, lon,
    locationName || ''
  );
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

// 1 = we have already notified for this AQI episode, 0 = ready to notify again
function setAqiAlertActive(endpoint, active) {
  db.prepare('UPDATE subscriptions SET aqi_alert_active = ? WHERE endpoint = ?')
    .run(active ? 1 : 0, endpoint);
}

module.exports = {
  initDB,
  saveSubscription,
  removeSubscription,
  getAllSubscriptions,
  updateSeenAlerts,
  setAqiAlertActive,
};
