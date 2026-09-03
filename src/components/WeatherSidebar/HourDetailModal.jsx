import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import {
  X, Droplets, Wind, Sun, Gauge, Thermometer, Eye, CloudRain, Compass,
} from 'lucide-react';
import { WeatherIcon, getWeatherLabel } from '../ui/WeatherIcon';
import useAppStore from '../../store/useAppStore';
import './HourDetailModal.css';

function uvInfo(uv) {
  if (uv == null) return null;
  const r = Math.round(uv);
  if (uv <= 2)  return { text: `${r} · Low`,       color: '#4ADE80' };
  if (uv <= 5)  return { text: `${r} · Moderate`,  color: '#FACC15' };
  if (uv <= 7)  return { text: `${r} · High`,      color: '#FB923C' };
  if (uv <= 10) return { text: `${r} · Very High`, color: '#F87171' };
  return { text: `${r} · Extreme`, color: '#E879F9' };
}

const has = (v) => v !== null && v !== undefined && v !== '';

/**
 * Popup with the full breakdown for a single forecast hour.
 * Shared by the desktop sidebar and the mobile weather page.
 */
export function HourDetailModal({ hour, onClose }) {
  const units = useAppStore((s) => s.units);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!hour) return null;

  const tempUnit  = units === 'imperial' ? '°F' : '°C';
  const speedUnit = units === 'imperial' ? 'mph' : 'km/h';
  const distUnit  = units === 'imperial' ? 'mi' : 'km';
  const precipUnit = units === 'imperial' ? 'in' : 'mm';

  const conditionLabel = hour.condition || getWeatherLabel(hour.conditionCode);
  const uv = uvInfo(hour.uvIndex);
  const windDir = hour.windDirectionLabel
    ?? (has(hour.windDirection) ? `${hour.windDirection}°` : null);

  const rows = [
    has(hour.feelsLike) && {
      icon: <Thermometer size={15} strokeWidth={1.8} />, color: '#A78BFA',
      label: 'Feels Like', value: `${hour.feelsLike}${tempUnit}`,
    },
    has(hour.precipProb) && {
      icon: <Droplets size={15} strokeWidth={1.8} />, color: '#60A5FA',
      label: 'Precip. Chance', value: `${hour.precipProb}%`,
    },
    has(hour.precipitation) && hour.precipitation > 0 && {
      icon: <CloudRain size={15} strokeWidth={1.8} />, color: '#60A5FA',
      label: 'Precip. Amount', value: `${hour.precipitation} ${precipUnit}`,
    },
    uv && {
      icon: <Sun size={15} strokeWidth={1.8} />, color: '#FBBF24',
      label: 'UV Index', value: uv.text, valueColor: uv.color,
    },
    has(hour.windSpeed) && {
      icon: <Wind size={15} strokeWidth={1.8} />, color: '#94A3B8',
      label: 'Wind', value: windDir ? `${windDir} ${hour.windSpeed} ${speedUnit}` : `${hour.windSpeed} ${speedUnit}`,
    },
    has(windDir) && !has(hour.windSpeed) && {
      icon: <Compass size={15} strokeWidth={1.8} />, color: '#94A3B8',
      label: 'Wind Direction', value: windDir,
    },
    has(hour.humidity) && {
      icon: <Droplets size={15} strokeWidth={1.8} />, color: '#6EE7B7',
      label: 'Humidity', value: `${hour.humidity}%`,
    },
    has(hour.pressure) && {
      icon: <Gauge size={15} strokeWidth={1.8} />, color: '#34D399',
      label: 'Pressure', value: `${hour.pressure} hPa`,
    },
    has(hour.visibility) && {
      icon: <Eye size={15} strokeWidth={1.8} />, color: '#A78BFA',
      label: 'Visibility', value: `${hour.visibility} ${distUnit}`,
    },
  ].filter(Boolean);

  return createPortal(
    <div className="hour-modal-overlay" onClick={onClose}>
      <div className="hour-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="hour-modal-header">
          <div className="hour-modal-when">
            <div className="hour-modal-time">{format(hour.time, 'h:mm a')}</div>
            <div className="hour-modal-date">{format(hour.time, 'EEEE, MMM d')}</div>
          </div>
          <button className="hour-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="hour-modal-summary">
          <WeatherIcon code={hour.conditionCode} isDay={hour.isDay} size={42} />
          <div>
            <div className="hour-modal-temp">{hour.temp}{tempUnit}</div>
            <div className="hour-modal-condition">{conditionLabel}</div>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="hour-modal-grid">
            {rows.map((r) => (
              <div key={r.label} className="hour-modal-cell">
                <div className="hour-modal-cell-icon" style={{ color: r.color }}>{r.icon}</div>
                <div className="hour-modal-cell-text">
                  <div className="hour-modal-cell-label">{r.label}</div>
                  <div
                    className="hour-modal-cell-value"
                    style={r.valueColor ? { color: r.valueColor } : undefined}
                  >
                    {r.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
