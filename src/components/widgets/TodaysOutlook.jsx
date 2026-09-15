import useAppStore from '../../store/useAppStore';
import './widgets.css';

export function TodaysOutlook({ data }) {
  const units = useAppStore((s) => s.units);
  const cu = data.current ?? {};
  const aq = data.airQuality ?? {};
  if (cu.temp == null) return null;

  const isMetric = units === 'metric';
  const tips = [];

  if ((cu.precipProb ?? 0) >= 40 || (cu.precipitation ?? 0) > 0) {
    tips.push({ emoji: '🌂', text: 'Bring an umbrella' });
  }
  if (cu.uvIndex != null && cu.uvIndex >= 6) {
    tips.push({ emoji: '🕶️', text: 'High UV — wear sunscreen' });
  }
  const gustThreshold = isMetric ? 48 : 30;
  if ((cu.windGusts ?? cu.windSpeed ?? 0) >= gustThreshold) {
    tips.push({ emoji: '💨', text: 'Windy — secure loose objects' });
  }
  if (aq.us_aqi != null && aq.us_aqi >= 100) {
    tips.push({ emoji: '😷', text: 'Poor air quality — limit outdoor exertion' });
  }
  const coldThreshold = isMetric ? 0 : 32;
  const hotThreshold = isMetric ? 32 : 90;
  if (cu.temp <= coldThreshold) {
    tips.push({ emoji: '🧊', text: 'Freezing — bundle up' });
  } else if (cu.temp >= hotThreshold) {
    tips.push({ emoji: '🥵', text: 'Very hot — stay hydrated' });
  }
  if (tips.length === 0) {
    tips.push({ emoji: '✅', text: 'Great day to be outside' });
  }

  return (
    <div className="widget-outlook sidebar-section">
      <div className="sidebar-section-title">Today's Outlook</div>
      <div className="widget-outlook-list">
        {tips.map((t, i) => (
          <div key={i} className="widget-outlook-tip">
            <span className="widget-outlook-emoji">{t.emoji}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
