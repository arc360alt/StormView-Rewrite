import './widgets.css';

/** Same "find the current hour" logic used elsewhere (HourlyForecast, the
 *  weather-assistant context builder) — starts the outlook at now, not midnight. */
function upcomingHours(hourly, count) {
  const nowMs = Date.now();
  let startIdx = 0;
  for (let i = 0; i < hourly.length; i++) {
    if (new Date(hourly[i].time).getTime() <= nowMs) startIdx = i;
    else break;
  }
  return hourly.slice(startIdx, startIdx + count);
}

export function PrecipOutlook({ data }) {
  const hourly = upcomingHours(data.hourly ?? [], 8);
  if (!hourly.length || hourly.every((h) => h.precipProb == null)) return null;

  return (
    <div className="widget-precip sidebar-section">
      <div className="sidebar-section-title">Precipitation Outlook</div>
      <div className="widget-precip-bars">
        {hourly.map((h, i) => {
          const pct = h.precipProb ?? 0;
          return (
            <div key={i} className="widget-precip-col">
              <div className="widget-precip-pct">{pct}%</div>
              <div className="widget-precip-track">
                <div className="widget-precip-fill" style={{ height: `${Math.max(pct, 3)}%` }} />
              </div>
              <div className="widget-precip-hour">
                {new Date(h.time).toLocaleTimeString(undefined, { hour: 'numeric' })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
