import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import './WeatherAlerts.css';

const SEVERITY_CONFIG = {
  Extreme:  { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Extreme' },
  Severe:   { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'Severe' },
  Moderate: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', label: 'Moderate' },
  Minor:    { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', label: 'Minor' },
  Unknown:  { color: '#94A3B8', bg: 'rgba(148,163,184,0.10)', label: 'Alert' },
};

function AlertCard({ alert }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.Unknown;

  return (
    <div
      className="alert-card"
      style={{ borderColor: `${cfg.color}40`, background: cfg.bg }}
    >
      <div className="alert-header" onClick={() => setExpanded(!expanded)}>
        <AlertTriangle size={14} style={{ color: cfg.color, flexShrink: 0 }} strokeWidth={2} />
        <div className="alert-header-text">
          <span className="alert-title">{alert.title}</span>
          <span className="alert-severity" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
        <button className="alert-toggle" aria-label="expand">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {expanded && (
        <div className="alert-body">
          {alert.end && (
            <div className="alert-time">
              Until {format(alert.end, 'EEE h:mm a')}
            </div>
          )}
          <div className="alert-scroll">
            {alert.description && (
              <p className="alert-description">{alert.description}</p>
            )}
            {alert.instruction && (
              <p className="alert-instruction">{alert.instruction}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function WeatherAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="weather-alerts sidebar-section">
      <div className="sidebar-section-title">
        Active Alerts ({alerts.length})
      </div>
      <div className="alerts-list">
        {alerts.map((a) => (
          <AlertCard key={a.id ?? a.title} alert={a} />
        ))}
      </div>
    </div>
  );
}
