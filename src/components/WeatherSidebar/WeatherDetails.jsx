import {
  Droplets, Wind, Eye, Gauge, Thermometer,
  Sun, Cloud, ArrowUp, Activity,
} from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import './WeatherDetails.css';

function uvLabel(uv) {
  if (uv == null) return { label: '—', color: 'var(--text-muted)' };
  if (uv <= 2)  return { label: `${uv} Low`,       color: '#4ADE80' };
  if (uv <= 5)  return { label: `${uv} Moderate`,  color: '#FACC15' };
  if (uv <= 7)  return { label: `${uv} High`,       color: '#FB923C' };
  if (uv <= 10) return { label: `${uv} Very High`,  color: '#F87171' };
  return { label: `${uv} Extreme`, color: '#E879F9' };
}

function aqiLabel(aqi) {
  if (aqi == null) return { label: '—', color: 'var(--text-muted)' };
  if (aqi <= 50)  return { label: `${aqi} Good`,       color: '#4ADE80' };
  if (aqi <= 100) return { label: `${aqi} Moderate`,   color: '#FACC15' };
  if (aqi <= 150) return { label: `${aqi} Sensitive`,  color: '#FB923C' };
  if (aqi <= 200) return { label: `${aqi} Unhealthy`,  color: '#F87171' };
  if (aqi <= 300) return { label: `${aqi} Very High`,  color: '#C084FC' };
  return                  { label: `${aqi} Hazardous`, color: '#EF4444' };
}


function windDirLabel(deg) {
  if (deg == null) return '—';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function WeatherDetails({ data }) {
  const units = useAppStore((s) => s.units);
  const cu = data.current;
  const aq = data.airQuality ?? {};

  const speedUnit = units === 'imperial' ? 'mph' : 'km/h';
  const distUnit  = units === 'imperial' ? 'mi' : 'km';
  const tempUnit  = units === 'imperial' ? '°F' : '°C';
  const uv     = uvLabel(cu.uvIndex);
  const aqi     = aqiLabel(aq.aqi);
  const windDir = cu.windDirectionLabel ?? windDirLabel(cu.windDirection);

  const items = [
    {
      icon: <Droplets size={15} strokeWidth={1.8} />,
      label: 'Humidity',
      value: cu.humidity != null ? `${cu.humidity}%` : '—',
      color: '#60A5FA',
    },
    {
      icon: <Wind size={15} strokeWidth={1.8} />,
      label: 'Wind',
      value: cu.windSpeed != null ? `${windDir} ${cu.windSpeed} ${speedUnit}` : '—',
      sub: cu.windGusts != null ? `Gusts ${cu.windGusts} ${speedUnit}` : null,
      color: '#94A3B8',
    },
    {
      icon: <Eye size={15} strokeWidth={1.8} />,
      label: 'Visibility',
      value: cu.visibility != null ? `${cu.visibility} ${distUnit}` : '—',
      color: '#A78BFA',
    },
    {
      icon: <Gauge size={15} strokeWidth={1.8} />,
      label: 'Pressure',
      value: cu.pressure != null ? `${cu.pressure} hPa` : '—',
      color: '#34D399',
    },
    {
      icon: <Thermometer size={15} strokeWidth={1.8} />,
      label: 'Dew Point',
      value: cu.dewPoint != null ? `${cu.dewPoint}${tempUnit}` : '—',
      color: '#6EE7B7',
    },
    {
      icon: <Sun size={15} strokeWidth={1.8} />,
      label: 'UV Index',
      value: uv.label,
      valueColor: uv.color,
      color: '#FBBF24',
    },
    {
      icon: <Cloud size={15} strokeWidth={1.8} />,
      label: 'Cloud Cover',
      value: cu.cloudCover != null ? `${cu.cloudCover}%` : '—',
      color: '#94A3B8',
    },
    {
      icon: <ArrowUp size={15} strokeWidth={1.8} />,
      label: 'Precip.',
      value: cu.precipitation != null
        ? `${cu.precipitation} ${units === 'imperial' ? 'in' : 'mm'}`
        : (cu.precipProb != null ? `${cu.precipProb}% chance` : '—'),
      color: '#60A5FA',
    },
    aq.aqi != null ? {
      icon: <Activity size={15} strokeWidth={1.8} />,
      label: 'Air Quality',
      value: aqi.label,
      valueColor: aqi.color,
      color: '#94A3B8',
      sub: 'US AQI',
    } : null,
  ].filter(Boolean).filter((i) => i.value !== '—' || i.label === 'Humidity' || i.label === 'UV Index');

  return (
    <div className="weather-details sidebar-section">
      <div className="sidebar-section-title">Details</div>
      <div className="details-grid">
        {items.map((item) => (
          <div key={item.label} className="detail-card">
            <div className="detail-icon" style={{ color: item.color }}>{item.icon}</div>
            <div className="detail-info">
              <div className="detail-label">{item.label}</div>
              <div className="detail-value" style={item.valueColor ? { color: item.valueColor } : {}}>
                {item.value}
              </div>
              {item.sub && <div className="detail-sub">{item.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
