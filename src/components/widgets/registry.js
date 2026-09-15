import { WeatherAlerts } from '../WeatherSidebar/WeatherAlerts';
import { HourlyForecast } from '../WeatherSidebar/HourlyForecast';
import { DailyForecast } from '../WeatherSidebar/DailyForecast';
import { WeatherDetails } from '../WeatherSidebar/WeatherDetails';
import { SunriseSunset } from './SunriseSunset';
import { AirQualityWidget } from './AirQualityWidget';
import { WindCompass } from './WindCompass';
import { WIDGET_LABELS } from './defaults';

/**
 * Registry of optional, reorderable/toggleable weather sections shown after
 * the fixed current-conditions hero (and, on mobile/watch, the radar preview)
 * on the home screen of all three UI trees. `current` and the radar preview
 * are navigation/hero fixtures and intentionally not part of this list.
 */
export const WIDGET_REGISTRY = {
  alerts: { label: WIDGET_LABELS.alerts, Component: WeatherAlerts, alertsProp: true },
  hourly: { label: WIDGET_LABELS.hourly, Component: HourlyForecast },
  daily: { label: WIDGET_LABELS.daily, Component: DailyForecast },
  sunrise: { label: WIDGET_LABELS.sunrise, Component: SunriseSunset },
  details: { label: WIDGET_LABELS.details, Component: WeatherDetails },
  aqi: { label: WIDGET_LABELS.aqi, Component: AirQualityWidget },
  windCompass: { label: WIDGET_LABELS.windCompass, Component: WindCompass },
};

export { DEFAULT_WIDGETS } from './defaults';
