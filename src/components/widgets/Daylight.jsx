import { Sun } from 'lucide-react';
import './widgets.css';

function fmtDuration(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

export function Daylight({ data }) {
  const cu = data.current ?? {};
  const today = data.daily?.[0];
  const sunrise = cu.sunrise ?? today?.sunrise;
  const sunset = cu.sunset ?? today?.sunset;
  if (!sunrise || !sunset) return null;

  const sunriseMs = new Date(sunrise).getTime();
  const sunsetMs = new Date(sunset).getTime();
  const nowMs = Date.now();
  const total = sunsetMs - sunriseMs;
  const elapsed = nowMs - sunriseMs;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const isDaytime = nowMs >= sunriseMs && nowMs <= sunsetMs;

  return (
    <div className="widget-daylight sidebar-section">
      <div className="sidebar-section-title">Daylight</div>
      <div className="widget-daylight-top">
        <Sun size={18} strokeWidth={1.8} style={{ color: '#FBBF24' }} />
        <span className="widget-daylight-total">{fmtDuration(total)} of daylight</span>
      </div>
      <div className="widget-daylight-track">
        <div className="widget-daylight-fill" style={{ width: `${pct}%` }} />
        {isDaytime && <div className="widget-daylight-sun" style={{ left: `${pct}%` }} />}
      </div>
      <div className="widget-daylight-times">
        <span>{new Date(sunrise).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
        <span>{new Date(sunset).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
      </div>
      {!isDaytime && (
        <div className="widget-daylight-note">
          {nowMs < sunriseMs ? 'Before sunrise' : 'After sunset'}
        </div>
      )}
    </div>
  );
}
