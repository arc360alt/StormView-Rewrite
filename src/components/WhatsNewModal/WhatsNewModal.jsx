import { useState } from 'react';
import { X, Zap, Layers, BarChart3, Satellite, AlertTriangle, CloudRain, Palette, Cpu } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import './WhatsNewModal.css';

// ─── DEVELOPER: bump version to re-show for all users; set name for this release ─
export const WHATS_NEW_VERSION = '3.2.0';
export const WHATS_NEW_NAME    = 'Small fixes and iomprovements';
// ─────────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Cpu,
    color: 'var(--accent)',
    bg: 'var(--accent-dim)',
    title: 'Switch the server',
    desc: 'The LibreWXR instance has been switched to the one provided by LibreWXR themselfs as I do not have a good enough server to run this yet.',
  },
  {
    icon: Zap,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    title: 'UI Fixes',
    desc: 'The app now works on smaller screens much better now with this new update!',
  },
  {
    icon: BarChart3,
    color: 'var(--accent)',
    bg: 'var(--accent-dim)',
    title: 'Speed Improvements',
    desc: 'A bunch of changes have been made to the radar to improve its speed.',
  },
  // {
  //  icon: AlertTriangle,
  //  color: 'var(--warning)',
  //  bg: 'var(--warning-dim)',
  //  title: 'NWS Warning Polygons',
  //  desc: 'Active weather warnings are drawn directly on the map. Click any polygon for full details (US only).',
  // },
  //{
  //  icon: Palette,
  //  color: '#f472b6',
  //  bg: 'rgba(244,114,182,0.12)',
  //  title: '12 Radar Color Schemes',
  //  desc: 'Choose from Rainbow, NEXRAD III, Weather Channel, Dark Sky, and 8 others in Settings → Radar.',
  // },
  //{
  //  icon: Layers,
  //  color: 'var(--accent)',
  //  bg: 'var(--accent-dim)',
  //  title: 'Smarter Tile Loading',
  //  desc: 'A windowed renderer keeps only the frames you need in memory, cutting requests and load time.',
  //},
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
