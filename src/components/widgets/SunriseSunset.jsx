import { format } from 'date-fns';
import { Sunrise, Sunset } from 'lucide-react';
import './widgets.css';

export function SunriseSunset({ data }) {
  const cu = data.current ?? {};
  const today = data.daily?.[0];
  const sunrise = cu.sunrise ?? today?.sunrise;
  const sunset = cu.sunset ?? today?.sunset;

  if (!sunrise && !sunset) return null;

  return (
    <div className="widget-sunrise sidebar-section">
      <div className="sidebar-section-title">Sun</div>
      <div className="widget-sunrise-row">
        {sunrise && (
          <div className="widget-sunrise-item">
            <Sunrise size={18} strokeWidth={1.8} style={{ color: '#FBBF24' }} />
            <div>
              <div className="widget-sunrise-label">Sunrise</div>
              <div className="widget-sunrise-value">{format(sunrise, 'h:mm a')}</div>
            </div>
          </div>
        )}
        {sunset && (
          <div className="widget-sunrise-item">
            <Sunset size={18} strokeWidth={1.8} style={{ color: '#F97316' }} />
            <div>
              <div className="widget-sunrise-label">Sunset</div>
              <div className="widget-sunrise-value">{format(sunset, 'h:mm a')}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
