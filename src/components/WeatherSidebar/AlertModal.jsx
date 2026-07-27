import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import './AlertModal.css';

const SEV = {
  Extreme:  { color: '#EF4444', bg: 'rgba(239,68,68,0.14)',  cardBorder: 'rgba(239,68,68,0.35)',  label: 'Extreme'  },
  Severe:   { color: '#F97316', bg: 'rgba(249,115,22,0.13)', cardBorder: 'rgba(249,115,22,0.35)', label: 'Severe'   },
  Moderate: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', cardBorder: 'rgba(251,191,36,0.35)', label: 'Moderate' },
  Minor:    { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', cardBorder: 'rgba(96,165,250,0.35)', label: 'Minor'    },
  Unknown:  { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', cardBorder: 'rgba(148,163,184,0.25)', label: 'Alert'  },
};

function FullAlertCard({ alert }) {
  const cfg = SEV[alert.severity] ?? SEV.Unknown;
  return (
    <div className="alert-full-card" style={{ borderColor: cfg.cardBorder, background: cfg.bg }}>
      <div className="alert-full-card-header">
        <AlertTriangle size={14} style={{ color: cfg.color, flexShrink: 0 }} strokeWidth={2.5} />
        <span className="alert-full-card-title">{alert.title}</span>
        <span
          className="alert-full-card-badge"
          style={{ background: `${cfg.color}25`, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>
      <div className="alert-full-card-body">
        <div className="alert-full-card-meta">
          {alert.end && <span>Until {format(alert.end, 'EEE, MMM d · h:mm a')}</span>}
          {alert.certainty !== 'Unknown' && <span>{alert.certainty}</span>}
        </div>
        {alert.headline && (
          <p className="alert-full-card-desc" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
            {alert.headline}
          </p>
        )}
        {alert.description && (
          <p className="alert-full-card-desc">{alert.description}</p>
        )}
        {alert.instruction && (
          <p className="alert-full-card-instruction">{alert.instruction}</p>
        )}
      </div>
    </div>
  );
}

export function AlertModal({ alerts, onClose }) {
  return createPortal(
    <div className="alert-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="alert-modal-panel" role="dialog" aria-modal="true">
        <div className="alert-modal-header">
          <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} strokeWidth={2.5} />
          <span className="alert-modal-title">
            Active Alerts {alerts.length > 1 ? `(${alerts.length})` : ''}
          </span>
          <button className="alert-modal-close" onClick={onClose} aria-label="Close">
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <div className="alert-modal-body">
          {alerts.map((a) => (
            <FullAlertCard key={a.id} alert={a} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
