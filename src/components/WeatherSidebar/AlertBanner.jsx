import { useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { AlertModal } from './AlertModal';
import './AlertBanner.css';

const SEV = {
  Extreme:  { bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.4)',   text: '#fca5a5' },
  Severe:   { bg: 'rgba(249,115,22,0.16)',  border: 'rgba(249,115,22,0.4)',  text: '#fdba74' },
  Moderate: { bg: 'rgba(251,191,36,0.14)',  border: 'rgba(251,191,36,0.4)',  text: '#fde68a' },
  Minor:    { bg: 'rgba(96,165,250,0.14)',  border: 'rgba(96,165,250,0.4)',  text: '#93c5fd' },
  Unknown:  { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', text: '#cbd5e1' },
};

export function AlertBanner({ alerts }) {
  const [idx, setIdx]       = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  if (!alerts || alerts.length === 0) return null;

  const safeIdx = Math.min(idx, alerts.length - 1);
  const alert   = alerts[safeIdx];
  const cfg     = SEV[alert.severity] ?? SEV.Unknown;
  const multi   = alerts.length > 1;

  const prev = () => setIdx((i) => (i - 1 + alerts.length) % alerts.length);
  const next = () => setIdx((i) => (i + 1) % alerts.length);

  return (
    <>
      <div
        className="alert-banner"
        style={{ background: cfg.bg, borderBottomColor: cfg.border }}
      >
        <AlertTriangle size={13} style={{ color: cfg.text, flexShrink: 0 }} strokeWidth={2.5} />

        <span className="alert-banner-title" style={{ color: cfg.text }}>
          {alert.title}
        </span>

        {multi && (
          <div className="alert-banner-nav">
            <button className="alert-banner-arrow" style={{ color: cfg.text }} onClick={prev} aria-label="Previous alert">
              <ChevronLeft size={13} strokeWidth={2.5} />
            </button>
            <span className="alert-banner-counter" style={{ color: cfg.text }}>
              {safeIdx + 1}/{alerts.length}
            </span>
            <button className="alert-banner-arrow" style={{ color: cfg.text }} onClick={next} aria-label="Next alert">
              <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        )}

        <button
          className="alert-banner-btn"
          style={{ color: cfg.text, borderColor: `${cfg.text}55` }}
          onClick={() => setModalOpen(true)}
        >
          {multi ? 'See All' : 'Details'}
        </button>
      </div>

      {modalOpen && <AlertModal alerts={alerts} onClose={() => setModalOpen(false)} />}
    </>
  );
}
