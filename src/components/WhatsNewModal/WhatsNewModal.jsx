import { useState } from 'react';
import { X, Wind, Layers, Radar, Activity } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import './WhatsNewModal.css';

// ─── DEVELOPER: bump version to re-show for all users; set name for this release ─
export const WHATS_NEW_VERSION = '3.5.0';
export const WHATS_NEW_NAME    = 'New mobile interface';
// ─────────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Layers,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    title: 'New Mobile Layout',
    desc: 'Completly remade mobile interface for a better user experience.',
  },
  {
    icon: Wind,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    title: 'Hourly Info Panel',
    desc: 'Adds a new panel that shows up when you click on one of the hours under the hourly section that gives you more weather info about that specific hour.',
  },
  {
    icon: Radar,
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.12)',
    title: 'Open-Meteo Radar',
    desc: 'A new radar source you can pick in Settings → Radar. Global model data rendered right in your browser — very fast, with a dropdown to switch between precipitation, temperature, clouds, wind and dozens of other layers.',
  },
  {
    icon: Activity,
    color: 'var(--accent)',
    bg: 'var(--accent-dim)',
    title: 'Bug Fixes & Improvements',
    desc: 'Don\'t need to explain this one really.',
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
