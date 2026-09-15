import { Thermometer } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import './widgets.css';

function explain(delta, cu) {
  if (Math.abs(delta) < 3) return 'Feels about the same as the actual temperature.';
  if (delta < 0) {
    if (cu.windSpeed != null && cu.windSpeed >= 10) return `Wind is making it feel ${Math.abs(delta)}° cooler.`;
    return `Feels ${Math.abs(delta)}° cooler than the actual temperature.`;
  }
  if (cu.humidity != null && cu.humidity >= 60) return `Humidity is making it feel ${delta}° warmer.`;
  return `Feels ${delta}° warmer than the actual temperature.`;
}

export function FeelsLike({ data }) {
  const units = useAppStore((s) => s.units);
  const cu = data.current ?? {};
  if (cu.temp == null || cu.feelsLike == null) return null;

  const tempUnit = units === 'imperial' ? '°F' : '°C';
  const delta = Math.round(cu.feelsLike - cu.temp);

  return (
    <div className="widget-feelslike sidebar-section">
      <div className="sidebar-section-title">Feels Like</div>
      <div className="widget-feelslike-body">
        <div className="widget-feelslike-icon">
          <Thermometer size={20} strokeWidth={1.8} />
        </div>
        <div className="widget-feelslike-compare">
          <div className="widget-feelslike-stat">
            <span className="widget-feelslike-value">{Math.round(cu.temp)}{tempUnit}</span>
            <span className="widget-feelslike-label">Actual</span>
          </div>
          <div className="widget-feelslike-stat">
            <span className="widget-feelslike-value" style={{ color: 'var(--accent)' }}>
              {Math.round(cu.feelsLike)}{tempUnit}
            </span>
            <span className="widget-feelslike-label">Feels Like</span>
          </div>
        </div>
      </div>
      <div className="widget-feelslike-desc">{explain(delta, cu)}</div>
    </div>
  );
}
