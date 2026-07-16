import { useState } from 'react';
import { X, Wind, Layers, BarChart3, Activity } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import './WhatsNewModal.css';

// ─── DEVELOPER: bump version to re-show for all users; set name for this release ─
export const WHATS_NEW_VERSION = '3.3.0';
export const WHATS_NEW_NAME    = 'Air Quality';
// ─────────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Layers,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    title: 'Air Quality Map Layer',
    desc: 'Switch between Radar and AQI in Settings → Radar. The AQI mode shows a live color-coded gradient across the map — green for clean air, scaling through yellow, orange, red, and purple as air quality worsens.',
  },
  {
    icon: Wind,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    title: 'Click to Inspect AQI',
    desc: 'In AQI mode, click anywhere on the map for a precise reading at that exact location — including the US AQI number, category, and a full breakdown of PM2.5, PM10, Ozone, NO₂, SO₂, and CO.',
  },
  {
    icon: Activity,
    color: 'var(--accent)',
    bg: 'var(--accent-dim)',
    title: 'AQI in Weather Details',
    desc: 'The current Air Quality Index for your location now appears in the weather details panel alongside humidity, UV index, wind, and the rest of your conditions.',
  },
];

export function WhatsNewModal() {
  const dismissedVersion    = useAppStore((s) => s.dismissedWhatsNewVersion);
  const setDismissedVersion = useAppStore((s) => s.setDismissedWhatsNewVersion);
  const location            = useAppStore((s) => s.location);

  const [neverShow, setNeverShow] = useState(false);
  const [closing,   setClosing]   = useState(false);

  // Show when: location is set AND this version hasn't been permanently dismissed
  const shouldShow = !!location && dismissedVersion !== WHATS_NEW_VERSION;

  if (!shouldShow) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      if (neverShow) {
        // Permanently dismissed for this version — persists across reloads
        setDismissedVersion(WHATS_NEW_VERSION);
      } else {
        // Session-only: use a prefix so it never matches the real version string,
        // meaning the modal will show again on next page load
        setDismissedVersion('__seen__' + WHATS_NEW_VERSION);
      }
    }, 200);
  };

  return (
    <div className={`wn-overlay ${closing ? 'wn-overlay--out' : ''}`}>
      <div className={`wn-modal ${closing ? 'wn-modal--out' : ''}`}>

        {/* Header */}
        <div className="wn-header">
          <div className="wn-header-left">
            <div className="wn-eyebrow">
              <div className="wn-badge">v{WHATS_NEW_VERSION}</div>
              <span className="wn-eyebrow-text">What's New in StormView</span>
            </div>
            <div className="wn-title">{WHATS_NEW_NAME}</div>
          </div>
          <button className="wn-close" onClick={handleClose} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Feature list */}
        <div className="wn-body">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div className="wn-item" key={title}>
              <div className="wn-item-icon" style={{ color, background: bg }}>
                <Icon size={16} strokeWidth={2} />
              </div>
              <div className="wn-item-text">
                <div className="wn-item-title">{title}</div>
                <div className="wn-item-desc">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="wn-footer">
          <label className="wn-checkbox-label">
            <input
              type="checkbox"
              className="wn-checkbox"
              checked={neverShow}
              onChange={(e) => setNeverShow(e.target.checked)}
            />
            <span>Don't show again until the next update</span>
          </label>
          <button className="wn-btn-close" onClick={handleClose}>
            Got it
          </button>
        </div>

      </div>
    </div>
  );
}
