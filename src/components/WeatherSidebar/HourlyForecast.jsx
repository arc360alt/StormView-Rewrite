import { format } from 'date-fns';
import { WeatherIcon } from '../ui/WeatherIcon';
import { Droplets } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import './HourlyForecast.css';

export function HourlyForecast({ data }) {
  const units = useAppStore((s) => s.units);
  const tempUnit = units === 'imperial' ? '°' : '°';

  const allHourly = data.hourly ?? [];
  // Find the most recent hourly slot at or before now — that's the "current" hour
  const now = Date.now();
  let startIdx = 0;
  for (let i = 0; i < allHourly.length; i++) {
    if (allHourly[i].time.getTime() <= now) startIdx = i;
    else break;
  }
  const hourly = allHourly.slice(startIdx, startIdx + 24);

  if (hourly.length === 0) return null;

  return (
    <div className="hourly-forecast sidebar-section">
      <div className="sidebar-section-title">Hourly</div>
      <div className="hourly-scroll">
        {hourly.map((h, i) => (
          <div key={i} className="hourly-item">
            <span className="hourly-time">
              {i === 0 ? 'Now' : format(h.time, 'ha')}
            </span>
            <WeatherIcon code={h.conditionCode} isDay={h.isDay} size={18} />
            {h.precipProb > 10 && (
              <div className="hourly-precip">
                <Droplets size={9} style={{ color: '#60A5FA' }} />
                <span>{h.precipProb}%</span>
              </div>
            )}
            <span className="hourly-temp">{h.temp}{tempUnit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
