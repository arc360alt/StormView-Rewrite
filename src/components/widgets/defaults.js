/**
 * Pure widget id/label/default-order data, kept separate from `registry.js`
 * (which imports the actual section components). The store needs the default
 * order but must NOT pull in component modules that import the store back —
 * that would create a circular import.
 */
export const WIDGET_LABELS = {
  alerts: 'Weather Alerts',
  hourly: 'Hourly Forecast',
  daily: 'Daily Forecast',
  sunrise: 'Sunrise & Sunset',
  details: 'Weather Details',
  aqi: 'Air Quality',
  windCompass: 'Wind Compass',
};

export const DEFAULT_WIDGETS = [
  { id: 'alerts', enabled: true },
  { id: 'hourly', enabled: true },
  { id: 'daily', enabled: true },
  { id: 'sunrise', enabled: true },
  { id: 'details', enabled: true },
  { id: 'aqi', enabled: false },
  { id: 'windCompass', enabled: false },
];
