import {
  Sun, Moon, Cloud, CloudSun, CloudMoon, CloudRain, CloudSnow,
  CloudLightning, CloudFog, CloudDrizzle, Wind, Zap,
} from 'lucide-react';

/* WMO code → { Icon, nightIcon, color, label } */
const WMO_MAP = {
  0:  { icon: Sun,           night: Moon,      color: '#FFD43B', label: 'Clear Sky' },
  1:  { icon: Sun,           night: Moon,      color: '#FFD43B', label: 'Mainly Clear' },
  2:  { icon: CloudSun,      night: CloudMoon, color: '#94A3B8', label: 'Partly Cloudy' },
  3:  { icon: Cloud,         night: Cloud,     color: '#64748B', label: 'Overcast' },
  45: { icon: CloudFog,      night: CloudFog,  color: '#94A3B8', label: 'Fog' },
  48: { icon: CloudFog,      night: CloudFog,  color: '#94A3B8', label: 'Icy Fog' },
  51: { icon: CloudDrizzle,  night: CloudDrizzle, color: '#93C5FD', label: 'Light Drizzle' },
  53: { icon: CloudDrizzle,  night: CloudDrizzle, color: '#60A5FA', label: 'Drizzle' },
  55: { icon: CloudDrizzle,  night: CloudDrizzle, color: '#3B82F6', label: 'Heavy Drizzle' },
  56: { icon: CloudDrizzle,  night: CloudDrizzle, color: '#BAE6FD', label: 'Freezing Drizzle' },
  57: { icon: CloudDrizzle,  night: CloudDrizzle, color: '#7DD3FC', label: 'Heavy Freezing Drizzle' },
  61: { icon: CloudRain,     night: CloudRain, color: '#60A5FA', label: 'Light Rain' },
  63: { icon: CloudRain,     night: CloudRain, color: '#3B82F6', label: 'Rain' },
  65: { icon: CloudRain,     night: CloudRain, color: '#1D4ED8', label: 'Heavy Rain' },
  66: { icon: CloudRain,     night: CloudRain, color: '#BAE6FD', label: 'Freezing Rain' },
  67: { icon: CloudRain,     night: CloudRain, color: '#7DD3FC', label: 'Heavy Freezing Rain' },
  71: { icon: CloudSnow,     night: CloudSnow, color: '#E0F2FE', label: 'Light Snow' },
  73: { icon: CloudSnow,     night: CloudSnow, color: '#BAE6FD', label: 'Snow' },
  75: { icon: CloudSnow,     night: CloudSnow, color: '#7DD3FC', label: 'Heavy Snow' },
  77: { icon: CloudSnow,     night: CloudSnow, color: '#BAE6FD', label: 'Snow Grains' },
  80: { icon: CloudRain,     night: CloudRain, color: '#60A5FA', label: 'Light Showers' },
  81: { icon: CloudRain,     night: CloudRain, color: '#3B82F6', label: 'Showers' },
  82: { icon: CloudRain,     night: CloudRain, color: '#1D4ED8', label: 'Violent Showers' },
  85: { icon: CloudSnow,     night: CloudSnow, color: '#BAE6FD', label: 'Snow Showers' },
  86: { icon: CloudSnow,     night: CloudSnow, color: '#7DD3FC', label: 'Heavy Snow Showers' },
  95: { icon: CloudLightning, night: CloudLightning, color: '#FBBF24', label: 'Thunderstorm' },
  96: { icon: CloudLightning, night: CloudLightning, color: '#F59E0B', label: 'Thunderstorm w/ Hail' },
  99: { icon: CloudLightning, night: CloudLightning, color: '#EF4444', label: 'Severe Thunderstorm' },
};

const FALLBACK = { icon: Cloud, night: Cloud, color: '#94A3B8', label: 'Unknown' };

/**
 * Renders a weather icon for a given WMO condition code.
 * Props: code (number), isDay (bool), size (number), color (override string)
 */
export function WeatherIcon({ code, isDay = true, size = 24, color, className = '' }) {
  const def = WMO_MAP[code] ?? FALLBACK;
  const Icon = isDay ? def.icon : def.night;
  const iconColor = color ?? def.color;

  return (
    <Icon
      size={size}
      color={iconColor}
      strokeWidth={1.6}
      className={className}
      style={{ flexShrink: 0 }}
    />
  );
}

export function getWeatherColor(code) {
  return (WMO_MAP[code] ?? FALLBACK).color;
}

export function getWeatherLabel(code) {
  return (WMO_MAP[code] ?? FALLBACK).label;
}
