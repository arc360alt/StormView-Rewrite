import { Activity } from 'lucide-react';
import { getAqiCategory } from '../../services/airquality';
import useAppStore from '../../store/useAppStore';
import './widgets.css';

const POLLUTANTS = [
  { key: 'pm2_5', label: 'PM2.5', unit: 'µg/m³' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³' },
  { key: 'ozone', label: 'Ozone', unit: 'µg/m³' },
  { key: 'nitrogen_dioxide', label: 'NO₂', unit: 'µg/m³' },
];

export function AirQualityWidget({ data }) {
  const showPollutants = useAppStore((s) => s.aqiShowPollutants);
  const aq = data.airQuality;
  if (aq?.us_aqi == null) return null;

  const category = getAqiCategory(aq.us_aqi);
  const pct = Math.min(100, (aq.us_aqi / 300) * 100);

  return (
    <div className="widget-aqi sidebar-section">
      <div className="sidebar-section-title">Air Quality</div>
      <div className="widget-aqi-top">
        <div className="widget-aqi-icon" style={{ color: category?.color }}>
          <Activity size={20} strokeWidth={1.8} />
        </div>
        <div>
          <div className="widget-aqi-number" style={{ color: category?.color }}>
            {aq.us_aqi}
          </div>
          <div className="widget-aqi-category">{category?.label ?? '—'}</div>
        </div>
      </div>

      <div className="widget-aqi-bar-track">
        <div
          className="widget-aqi-bar-fill"
          style={{ width: `${pct}%`, background: category?.color }}
        />
      </div>

      {category?.desc && <div className="widget-aqi-desc">{category.desc}</div>}

      {showPollutants && (
        <div className="widget-aqi-pollutants">
          {POLLUTANTS.filter((p) => aq[p.key] != null).map((p) => (
            <div key={p.key} className="widget-aqi-pollutant">
              <span className="widget-aqi-pollutant-label">{p.label}</span>
              <span className="widget-aqi-pollutant-value">
                {Math.round(aq[p.key])} <span className="widget-aqi-pollutant-unit">{p.unit}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
