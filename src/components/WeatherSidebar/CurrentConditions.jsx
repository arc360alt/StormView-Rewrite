import { WeatherIcon } from '../ui/WeatherIcon';
import useAppStore from '../../store/useAppStore';
import './CurrentConditions.css';

function windDegToArrow(deg) {
  if (deg == null) return '—';
  const dirs = ['↑','↗','→','↘','↓','↙','←','↖'];
  return dirs[Math.round(deg / 45) % 8];
}

export function CurrentConditions({ data }) {
  const units = useAppStore((s) => s.units);
  const cu = data.current;

  const tempUnit = units === 'imperial' ? '°F' : '°C';
  const speedUnit = units === 'imperial' ? 'mph' : 'km/h';
  const distUnit = units === 'imperial' ? 'mi' : 'km';

  return (
    <div className="current-conditions sidebar-section">
      {/* Main temp + icon */}
      <div className="current-main">
        <div className="current-temp-block">
          <span className="current-temp">{cu.temp ?? '—'}</span>
          <span className="current-temp-unit">{tempUnit}</span>
        </div>
        <WeatherIcon code={cu.conditionCode} isDay={cu.isDay} size={52} />
      </div>

      <div className="current-condition-label">{cu.condition}</div>

      {cu.feelsLike != null && (
        <div className="current-feels">Feels like {cu.feelsLike}{tempUnit}</div>
      )}

      {/* High / Low (from daily[0] if available) */}
      {data.daily?.[0] && (
        <div className="current-hilow">
          <span className="hilow-high">↑ {data.daily[0].tempMax}{tempUnit}</span>
          <span className="hilow-sep" />
          <span className="hilow-low">↓ {data.daily[0].tempMin}{tempUnit}</span>
        </div>
      )}
    </div>
  );
}
