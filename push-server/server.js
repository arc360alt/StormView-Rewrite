require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const webpush  = require('web-push');
const cron     = require('node-cron');
const { initDB, saveSubscription, removeSubscription } = require('./db');
const { checkAndSendAlerts, checkAqiAlerts } = require('./alerts');

// ── Validate required env vars ────────────────────────────────────────────────
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CONTACT_EMAIL } = process.env;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('ERROR: VAPID keys are missing. Run:  npm run generate-keys');
  process.exit(1);
}

// ── Setup ─────────────────────────────────────────────────────────────────────
webpush.setVapidDetails(
  `mailto:${CONTACT_EMAIL || 'admin@example.com'}`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

initDB();

const app = express();

// Allow requests from the frontend origin (and localhost in dev)
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? [process.env.FRONTEND_ORIGIN, 'http://localhost:5173', 'http://localhost:4173']
  : '*';
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }));

// Frontend fetches this to get the public key for push subscription setup
app.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Called when a user enables notifications
app.post('/subscribe', (req, res) => {
  const { subscription, lat, lon, locationName } = req.body;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: 'Invalid push subscription object.' });
  }
  if (lat == null || lon == null) {
    return res.status(400).json({ error: 'lat and lon are required.' });
  }

  try {
    saveSubscription(subscription, lat, lon, locationName);
    console.log(`[subscribe] Saved subscription for ${locationName || `${lat},${lon}`}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[subscribe] DB error:', err.message);
    res.status(500).json({ error: 'Failed to save subscription.' });
  }
});

// Called when a user disables notifications
app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required.' });
  removeSubscription(endpoint);
  console.log(`[unsubscribe] Removed …${endpoint.slice(-16)}`);
  res.json({ ok: true });
});

// ── NWS alert polling — every 5 minutes ──────────────────────────────────────
cron.schedule('*/5 * * * *', () => {
  checkAndSendAlerts().catch((err) => console.error('[cron] NWS check failed:', err));
});

// ── AQI alert polling — every 30 minutes (AQI changes slowly) ────────────────
cron.schedule('*/30 * * * *', () => {
  checkAqiAlerts().catch((err) => console.error('[cron] AQI check failed:', err));
});

// Run both once at startup
checkAndSendAlerts().catch(console.error);
checkAqiAlerts().catch(console.error);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`StormView Push API listening on port ${PORT}`);
  console.log(`Polling NWS alerts every 5 minutes.`);
});
