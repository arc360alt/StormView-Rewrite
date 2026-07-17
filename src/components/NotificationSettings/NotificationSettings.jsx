import { Bell, BellOff, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import './NotificationSettings.css';

export function NotificationSettings({ supported, permission, subscribed, loading, error, subscribe, unsubscribe }) {
  const location = useAppStore((s) => s.location);

  const handleEnable = async () => {
    await subscribe();
  };

  // ── Not supported ────────────────────────────────────────────────────────────
  if (!supported) {
    return (
      <div className="notif-unsupported">
        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
        <div>
          <div className="notif-unsupported-title">Notifications not available</div>
          <div className="notif-unsupported-body">
            On iOS, open StormView in Safari and use <strong>Share → Add to Home Screen</strong>,
            then re-open from the home screen icon. On Android, make sure you're using Chrome or Firefox.
          </div>
        </div>
      </div>
    );
  }

  // ── Permission permanently blocked ───────────────────────────────────────────
  if (permission === 'denied') {
    return (
      <div className="notif-unsupported">
        <BellOff size={18} style={{ flexShrink: 0 }} />
        <div>
          <div className="notif-unsupported-title">Notifications are blocked</div>
          <div className="notif-unsupported-body">
            Open your browser or OS settings and allow notifications for this site, then come back here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notif-section">
      {/* Status card */}
      <div className={`notif-status ${subscribed ? 'notif-status--on' : 'notif-status--off'}`}>
        {subscribed
          ? <CheckCircle size={16} strokeWidth={2} />
          : <Bell size={16} strokeWidth={2} />}
        <div className="notif-status-text">
          <div className="notif-status-title">
            {subscribed ? 'Notifications enabled' : 'Notifications off'}
          </div>
          <div className="notif-status-sub">
            {subscribed
              ? `Alerts for ${location?.name ?? 'your location'} will arrive even when the app is closed.`
              : 'Enable to receive NWS weather alerts for your location.'}
          </div>
        </div>
      </div>

      {/* Action button */}
      {subscribed ? (
        <button className="notif-btn notif-btn--off" onClick={unsubscribe} disabled={loading}>
          {loading ? <Loader size={15} className="notif-spin" /> : <BellOff size={15} />}
          Disable Notifications
        </button>
      ) : (
        <button
          className="notif-btn notif-btn--on"
          onClick={handleEnable}
          disabled={loading || !location}
        >
          {loading ? <Loader size={15} className="notif-spin" /> : <Bell size={15} />}
          Enable NWS Alert Notifications
        </button>
      )}

      {!location && !subscribed && (
        <p className="notif-hint">Set your location first so we know which alerts to send you.</p>
      )}

      {error && <div className="notif-error">{error}</div>}

      {/* Info */}
      <div className="notif-info">
        <div className="notif-info-title">What you'll receive</div>
        <ul className="notif-info-list">
          <li>Tornado Warnings &amp; Watches</li>
          <li>Severe Thunderstorm Warnings</li>
          <li>Flash Flood Warnings</li>
          <li>Winter Storm Warnings &amp; Advisories</li>
          <li>All other active NWS alerts for your area</li>
        </ul>
        <p className="notif-info-note">US coverage only — powered by the National Weather Service. Alerts are checked every 5 minutes.</p>
      </div>
    </div>
  );
}
