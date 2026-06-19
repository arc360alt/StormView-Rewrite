import { X, Rocket, Bug, ExternalLink, FlaskConical } from 'lucide-react';
import './BetaModal.css';

export function BetaModal({ onClose }) {
  return (
    <div className="bm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bm-modal">

        {/* Close button */}
        <button className="bm-close" onClick={onClose} aria-label="Close">
          <X size={15} strokeWidth={2} />
        </button>

        {/* Top section — dev build teaser */}
        <div className="bm-top">
          <div className="bm-top-icon">
            <FlaskConical size={20} strokeWidth={1.8} />
          </div>
          <div className="bm-top-label">Development Build</div>
          <h2 className="bm-top-heading">
            Want to try tomorrow's StormView today?
          </h2>
          <p className="bm-top-desc">
            Our dev build gets new features, UI experiments, and radar improvements
            weeks before they reach the main app. It updates continuously — refreshing
            is all you need.
          </p>
          <a
            className="bm-btn bm-btn--accent"
            href="https://stormview.develop.arc360hub.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Rocket size={14} strokeWidth={2} />
            Open Dev Build
            <ExternalLink size={12} strokeWidth={2} className="bm-btn-ext" />
          </a>
        </div>

        {/* Divider */}
        <div className="bm-divider" />

        {/* Bottom section — beta notice */}
        <div className="bm-bottom">
          <div className="bm-bottom-heading">
            <span className="bm-beta-tag">BETA</span>
            StormView is under heavy development
          </div>
          <p className="bm-bottom-desc">
            You may run into bugs, missing features, or rough edges as we build things out.
            If something breaks or doesn't look right, reporting it goes a long way —
            every bug report helps.
          </p>
          <a
            className="bm-btn bm-btn--ghost"
            href="https://github.com/arc360alt/StormView-Rewrite/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Bug size={14} strokeWidth={2} />
            Report an Issue on GitHub
            <ExternalLink size={12} strokeWidth={2} className="bm-btn-ext" />
          </a>
        </div>

      </div>
    </div>
  );
}
