import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { WeatherIcon } from '../ui/WeatherIcon';
import { Droplets, Wind, ChevronDown, Sun, Gauge, Thermometer, CloudRain, Sunrise, Sunset } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import './DailyForecast.css';

function uvColor(uv) {
  if (uv <= 2) return '#4ADE80';
  if (uv <= 5) return '#FACC15';
  if (uv <= 7) return '#FB923C';
  if (uv <= 10) return '#F87171';
  return '#E879F9';
}

function uvLabel(uv) {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

function DetailItem({ icon, label, value, color, sub }) {
  return (
    <div className="dd-item">
      <div className="dd-icon" style={color ? { color } : {}}>{icon}</div>
      <div className="dd-info">
        <div className="dd-label">{label}</div>
        <div className="dd-value">{value ?? '—'}</div>
        {sub && <div className="dd-sub">{sub}</div>}
      </div>
    </div>
  );
}

function DayHourlyStrip({ hours }) {
  if (!hours.length) {
    return <p className="dd-no-data">No hourly data for this day</p>;
  }
  return (
    <div className="dd-hourly-scroll">
      {hours.map((h, i) => (
        <div key={i} className="dd-hourly-item">
          <span className="dd-h-time">{format(h.time, 'ha').toLowerCase()}</span>
          <WeatherIcon code={h.conditionCode} isDay={h.isDay} size={16} />
          {h.precipProb > 10 && (
            <span className="dd-h-precip">
              <Droplets size={8} />
              {h.precipProb}%
            </span>
          )}
          <span className="dd-h-temp">{h.temp}°</span>
        </div>
      ))}
    </div>
  );
}

const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());
const hasNum = (v) => Number.isFinite(v);

function DayDetail({ day, hourly, units }) {
  const speedUnit = units === 'imperial' ? 'mph' : 'km/h';
  const tempUnit  = units === 'imperial' ? '°F' : '°C';
  const precipUnit = units === 'imperial' ? 'in' : 'mm';

  const [dayStart, dayEnd] = useMemo(() => [
    startOfDay(day.date),
    endOfDay(day.date),
  ], [day.date]);

  // All hours for this calendar day
  const allDayHours = useMemo(
    () => hourly.filter((h) => h.time >= dayStart && h.time <= dayEnd),
    [hourly, dayStart, dayEnd]
  );

  // For Today: hide past hours (user sees them as "tomorrow" data since they start at 12am)
  const isToday = startOfDay(new Date()).getTime() === dayStart.getTime();
  const nowFloor = useMemo(() => {
    const d = new Date(); d.setMinutes(0, 0, 0); return d;
  }, []);
  const dayHours = useMemo(
    () => isToday ? allDayHours.filter((h) => h.time >= nowFloor) : allDayHours,
    [allDayHours, isToday, nowFloor]
  );

  const avgHumidity = useMemo(() => {
    const vals = allDayHours.map((h) => h.humidity).filter(hasNum);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [allDayHours]);

  const avgPressure = useMemo(() => {
    const vals = allDayHours.map((h) => h.pressure).filter(hasNum);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [allDayHours]);

  // Fall back to computing UV and feels-like from hourly when daily fields are null
  const uvMax = useMemo(() => {
    if (hasNum(day.uvIndexMax)) return day.uvIndexMax;
    const vals = allDayHours.map((h) => h.uvIndex).filter(hasNum);
    return vals.length ? Math.max(...vals) : null;
  }, [day.uvIndexMax, allDayHours]);

  const feelsHigh = useMemo(() => {
    if (hasNum(day.feelsMax)) return day.feelsMax;
    const vals = allDayHours.map((h) => h.feelsLike).filter(hasNum);
    return vals.length ? Math.round(Math.max(...vals)) : null;
  }, [day.feelsMax, allDayHours]);

  const feelsLow = useMemo(() => {
    if (hasNum(day.feelsMin)) return day.feelsMin;
    const vals = allDayHours.map((h) => h.feelsLike).filter(hasNum);
    return vals.length ? Math.round(Math.min(...vals)) : null;
  }, [day.feelsMin, allDayHours]);

  const details = [
    hasNum(day.windSpeedMax) ? {
      key: 'wind', icon: <Wind size={13} strokeWidth={1.8} />,
      label: 'Max Wind', value: `${day.windSpeedMax} ${speedUnit}`,
      color: '#94A3B8', sub: hasNum(day.windGustsMax) ? `Gusts ${day.windGustsMax} ${speedUnit}` : null,
    } : null,
    hasNum(uvMax) ? {
      key: 'uv', icon: <Sun size={13} strokeWidth={1.8} />,
      label: 'UV Index', value: `${uvMax} — ${uvLabel(uvMax)}`,
      color: uvColor(uvMax), sub: null,
    } : null,
    day.precipProb != null ? {
      key: 'precip', icon: <CloudRain size={13} strokeWidth={1.8} />,
      label: 'Precipitation',
      value: day.precipSum > 0 ? `${day.precipSum} ${precipUnit}` : `${day.precipProb}%`,
      color: '#60A5FA', sub: day.precipSum > 0 ? `${day.precipProb}% chance` : null,
    } : null,
    // sunrise(4) and sunset(5) are consecutive → they land in the same row (left/right columns)
    isValidDate(day.sunrise) ? {
      key: 'sunrise', icon: <Sunrise size={13} strokeWidth={1.8} />,
      label: 'Sunrise', value: format(day.sunrise, 'h:mm a'), color: '#FBBF24', sub: null,
    } : null,
    isValidDate(day.sunset) ? {
      key: 'sunset', icon: <Sunset size={13} strokeWidth={1.8} />,
      label: 'Sunset', value: format(day.sunset, 'h:mm a'), color: '#F97316', sub: null,
    } : null,
    avgHumidity != null ? {
      key: 'humidity', icon: <Droplets size={13} strokeWidth={1.8} />,
      label: 'Avg Humidity', value: `${avgHumidity}%`, color: '#60A5FA', sub: null,
    } : null,
    avgPressure != null ? {
      key: 'pressure', icon: <Gauge size={13} strokeWidth={1.8} />,
      label: 'Avg Pressure', value: `${avgPressure} hPa`, color: '#34D399', sub: null,
    } : null,
    hasNum(feelsHigh) ? {
      key: 'feels', icon: <Thermometer size={13} strokeWidth={1.8} />,
      label: 'Feels Like', value: `${feelsHigh}${tempUnit}`,
      color: '#A78BFA', sub: hasNum(feelsLow) ? `Low ${feelsLow}${tempUnit}` : null,
    } : null,
  ].filter(Boolean);

  // Split into two explicit columns — avoids all CSS percentage-width ambiguity
  const leftCol  = details.filter((_, i) => i % 2 === 0);
  const rightCol = details.filter((_, i) => i % 2 !== 0);

  return (
    <div className="day-detail">
      <div className="dd-section">
        <div className="dd-section-label">Hourly</div>
        <DayHourlyStrip hours={dayHours} />
      </div>
      {details.length > 0 && (
        <div className="dd-section">
          <div className="dd-section-label">Details</div>
          <div className="dd-grid">
            <div className="dd-col">
              {leftCol.map(({ key: k, ...rest }) => <DetailItem key={k} {...rest} />)}
            </div>
            <div className="dd-col">
              {rightCol.map(({ key: k, ...rest }) => <DetailItem key={k} {...rest} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DailyForecast({ data }) {
  const units = useAppStore((s) => s.units);
  const daily = data.daily ?? [];
  const hourly = data.hourly ?? [];
  const [expandedIdx, setExpandedIdx] = useState(null);

  if (daily.length === 0) return null;

  const allMax = daily.map((d) => d.tempMax);
  const allMin = daily.map((d) => d.tempMin);
  const globalMin = Math.min(...allMin);
  const globalMax = Math.max(...allMax);
  const globalRange = globalMax - globalMin || 1;

  return (
    <div className="daily-forecast sidebar-section">
      <div className="sidebar-section-title">7-Day Forecast</div>
      <div className="daily-list">
        {daily.map((d, i) => {
          const barStart = ((d.tempMin - globalMin) / globalRange) * 100;
          const barWidth = ((d.tempMax - d.tempMin) / globalRange) * 100;
          const isOpen = expandedIdx === i;

          return (
            <div key={i} className={`daily-card${isOpen ? ' daily-card--open' : ''}`}>
              <div
                className="daily-row"
                role="button"
                tabIndex={0}
                onClick={() => setExpandedIdx(isOpen ? null : i)}
                onKeyDown={(e) => e.key === 'Enter' && setExpandedIdx(isOpen ? null : i)}
              >
                <span className="daily-day">
                  {i === 0 ? 'Today' : format(d.date, 'EEE')}
                </span>
                <WeatherIcon code={d.conditionCode} isDay={true} size={16} />
                {d.precipProb > 10 ? (
                  <div className="daily-precip">
                    <Droplets size={10} style={{ color: '#60A5FA' }} />
                    <span>{d.precipProb}%</span>
                  </div>
                ) : (
                  <div className="daily-precip" />
                )}
                <span className="daily-low">{d.tempMin}°</span>
                <div className="daily-bar-wrap">
                  <div className="daily-bar" style={{ left: `${barStart}%`, width: `${barWidth}%` }} />
                </div>
                <span className="daily-high">{d.tempMax}°</span>
                <div className={`daily-chevron${isOpen ? ' daily-chevron--up' : ''}`}>
                  <ChevronDown size={12} strokeWidth={2.5} />
                </div>
              </div>

              <div className={`daily-expand${isOpen ? ' daily-expand--open' : ''}`}>
                <div className="daily-expand-inner">
                  <DayDetail day={d} hourly={hourly} units={units} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
