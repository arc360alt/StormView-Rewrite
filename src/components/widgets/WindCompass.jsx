import useAppStore from '../../store/useAppStore';
import './widgets.css';

function windDirLabel(deg) {
  if (deg == null) return '—';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

const TICKS = ['N', 'E', 'S', 'W'];

export function WindCompass({ data }) {
  const units = useAppStore((s) => s.units);
  const cu = data.current ?? {};
  if (cu.windSpeed == null || cu.windDirection == null) return null;

  const speedUnit = units === 'imperial' ? 'mph' : 'km/h';
  const dirLabel = cu.windDirectionLabel ?? windDirLabel(cu.windDirection);

  return (
    <div className="widget-wind sidebar-section">
      <div className="sidebar-section-title">Wind</div>
      <div className="widget-wind-body">
        <div className="widget-wind-rose">
          <svg viewBox="0 0 100 100" className="widget-wind-rose-svg">
            <circle cx="50" cy="50" r="46" className="widget-wind-rose-ring" />
            <circle cx="50" cy="50" r="30" className="widget-wind-rose-ring widget-wind-rose-ring--inner" />
            {TICKS.map((t, i) => {
              const angle = i * 90;
              const rad = (angle - 90) * (Math.PI / 180);
              const x = 50 + 40 * Math.cos(rad);
              const y = 50 + 40 * Math.sin(rad);
              return (
                <text key={t} x={x} y={y} className="widget-wind-rose-tick" textAnchor="middle" dominantBaseline="middle">
                  {t}
                </text>
              );
            })}
            <g style={{ transform: `rotate(${cu.windDirection}deg)`, transformOrigin: '50px 50px' }}>
              <line x1="50" y1="50" x2="50" y2="16" className="widget-wind-rose-arrow" />
              <polygon points="50,10 44,22 56,22" className="widget-wind-rose-arrowhead" />
            </g>
          </svg>
        </div>
        <div className="widget-wind-stats">
          <div className="widget-wind-speed">
            {cu.windSpeed}<span className="widget-wind-unit"> {speedUnit}</span>
          </div>
          <div className="widget-wind-dir">From {dirLabel}</div>
          {cu.windGusts != null && (
            <div className="widget-wind-gusts">Gusts {cu.windGusts} {speedUnit}</div>
          )}
        </div>
      </div>
    </div>
  );
}
