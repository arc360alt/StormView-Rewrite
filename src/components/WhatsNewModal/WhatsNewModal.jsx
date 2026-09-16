import { useState } from 'react';
import { X, LayoutGrid, Palette, Sparkles, Activity } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import './WhatsNewModal.css';

// ─── DEVELOPER: bump version to re-show for all users; set name for this release ─
export const WHATS_NEW_VERSION = '3.6.0';
export const WHATS_NEW_NAME    = 'Widgets, themes & AI assistant';
// ─────────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: LayoutGrid,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    title: 'Customizable Widgets',
    desc: 'A new Widgets tab in Settings lets you show, hide, and reorder your homepage sections — plus three new ones to add: Sunrise & Sunset, Air Quality, and a Wind Compass.',
  },
  {
    icon: Palette,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.12)',
    title: 'More Color Themes',
    desc: 'Four new built-in themes — Ocean, Sunset, Forest, and Crimson — plus a full custom theme builder to pick your own background, accent, and text colors.',
  },
  {
    icon: Sparkles,
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.12)',
    title: 'On-Device Weather Assistant',
    desc: 'A new floating chat button runs a small AI model right in your browser — nothing is sent to a server. Ask it about your forecast, alerts, or air quality and it answers using your real, live data.',
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
  const [sessionDismissed, setSessionDismissed] = useState(false);

  // Show when: location is set, not dismissed for this session, and this
  // version hasn't been permanently dismissed.
  const shouldShow = !!location && !sessionDismissed && dismissedVersion !== WHATS_NEW_VERSION;

  if (!shouldShow) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      if (neverShow) {
        // Permanently dismissed for this version — persists across reloads
        setDismissedVersion(WHATS_NEW_VERSION);
      } else {
        // Session-only — plain local state, resets on next page load. (This
        // used to be faked with a sentinel string written to the persisted
        // store specifically so it wouldn't equal WHATS_NEW_VERSION — which
        // meant `shouldShow` above stayed true forever, the component never
        // unmounted, and its full-screen fixed overlay sat invisibly on top
        // of the whole app eating every touch/click until a reload.)
        setSessionDismissed(true);
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
