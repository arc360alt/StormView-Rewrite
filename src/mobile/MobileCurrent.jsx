import { format } from 'date-fns';
import { Sunrise, Sunset, Droplets, Thermometer } from 'lucide-react';
import { WeatherIcon, getWeatherLabel } from '../components/ui/WeatherIcon';
import useAppStore from '../store/useAppStore';

/** Precip chance isn't on Open-Meteo's "current" block — derive it from the
 *  current hour, falling back to today's daily max. */
function currentPrecipChance(data) {
  const cu = data.current ?? {};
  if (cu.precipProb != null) return cu.precipProb;

  const hourly = data.hourly ?? [];
  if (hourly.length) {
    const now = Date.now();
    let idx = 0;
    for (let i = 0; i < hourly.length; i++) {
      if (hourly[i].time.getTime() <= now) idx = i;
      else break;
    }
    if (hourly[idx]?.precipProb != null) return hourly[idx].precipProb;
  }
  return data.daily?.[0]?.precipProb ?? null;
}

/**
 * The temperature "gauge" at the top of the mobile page — current temp with a
 * condition icon, the condition label, feels-like, today's high/low and the
 * current precipitation chance.
 */
export function MobileCurrent({ data }) {
  const units = useAppStore((s) => s.units);
  const cu = data.current ?? {};

  const tempUnit = units === 'imperial' ? '°F' : '°C';
  const today = data.daily?.[0];
  const precip = currentPrecipChance(data);
  const conditionLabel = cu.condition || getWeatherLabel(cu.conditionCode);

  return (
    <section className="m-current">
      <div className="m-current-top">
        <WeatherIcon code={cu.conditionCode} isDay={cu.isDay} size={44} />
        <div className="m-current-temp">
          <span className="m-current-temp-num">{cu.temp ?? '—'}</span>
          <span className="m-current-temp-unit">{tempUnit}</span>
        </div>
      </div>

      <div className="m-current-condition">{conditionLabel}</div>

      <div className="m-current-stats">
        {cu.feelsLike != null && (
          <span className="m-current-stat">
            <Thermometer size={13} strokeWidth={1.8} style={{ color: '#A78BFA' }} />
            Feels {cu.feelsLike}{tempUnit}
          </span>
        )}
        {today && (
          <span className="m-current-stat">
            <span className="m-hilow-high">H {today.tempMax}°</span>
            <span className="m-hilow-low">L {today.tempMin}°</span>
          </span>
        )}
        {precip != null && (
          <span className="m-current-stat">
            <Droplets size={13} strokeWidth={1.8} style={{ color: '#60A5FA' }} />
            {precip}% precip
          </span>
        )}
      </div>

      {(cu.sunrise || today?.sunrise) && (
        <div className="m-current-sun">
          <span className="m-current-stat">
            <Sunrise size={13} strokeWidth={1.8} style={{ color: '#FBBF24' }} />
            {format(cu.sunrise ?? today.sunrise, 'h:mm a')}
          </span>
          <span className="m-current-stat">
            <Sunset size={13} strokeWidth={1.8} style={{ color: '#F97316' }} />
            {format(cu.sunset ?? today.sunset, 'h:mm a')}
          </span>
        </div>
      )}
    </section>
  );
}
