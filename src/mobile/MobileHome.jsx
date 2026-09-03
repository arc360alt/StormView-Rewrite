import { MapPin, RefreshCw, AlertCircle, Settings } from 'lucide-react';
import { MobileCurrent } from './MobileCurrent';
import { MobileRadarPreview } from './MobileRadarPreview';
import { AlertBanner } from '../components/WeatherSidebar/AlertBanner';
import { WeatherAlerts } from '../components/WeatherSidebar/WeatherAlerts';
import { HourlyForecast } from '../components/WeatherSidebar/HourlyForecast';
import { DailyForecast } from '../components/WeatherSidebar/DailyForecast';
import { WeatherDetails } from '../components/WeatherSidebar/WeatherDetails';
import { Spinner } from '../components/ui/Spinner';
import { useNwsAlerts } from '../hooks/useNwsAlerts';
import useAppStore from '../store/useAppStore';
import './MobileHome.css';

function NoLocation({ onOpenSettings }) {
  return (
    <div className="m-empty">
      <MapPin size={30} style={{ color: 'var(--text-muted)' }} />
      <span>Set a location to see weather</span>
      <button className="m-empty-btn" onClick={onOpenSettings}>Open Settings</button>
    </div>
  );
}

/**
 * The scrollable mobile weather page. Order matches the mobile layout spec:
 * current conditions → hourly → 7-day → radar preview → full details.
 */
export function MobileHome({ weatherData, loading, error, onRefresh, onOpenRadar }) {
  const alerts = useNwsAlerts();
  const location = useAppStore((s) => s.location);
  const weatherAPI = useAppStore((s) => s.weatherAPI);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);

  const openLocationSettings = () => {
    setSettingsTab('location');
    setSettingsOpen(true);
  };

  return (
    <div className="mobile-home">
      {/* Header */}
      <header className="m-header">
        <div className="m-header-loc">
          <MapPin size={14} strokeWidth={2} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          {location ? (
            <>
              <span className="m-header-loc-name">{location.name}</span>
              {location.state && <span className="m-header-loc-state">{location.state}</span>}
            </>
          ) : (
            <button className="m-header-set" onClick={openLocationSettings}>Set your location</button>
          )}
        </div>
        <div className="m-header-actions">
          {location && (
            <button className="m-header-btn" onClick={onRefresh} aria-label="Refresh weather">
              {loading ? <Spinner size={15} /> : <RefreshCw size={15} strokeWidth={1.8} />}
            </button>
          )}
          <button
            className="m-header-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <Settings size={16} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {weatherAPI && location && (
        <div className="m-api-badge">
          <span className="m-api-badge-dot" />
          {weatherAPI === 'nws' ? 'NWS' : 'Open-Meteo'}
          {weatherData?.nwsFallback && ' (fallback)'}
        </div>
      )}

      <AlertBanner alerts={alerts} />

      {/* Content */}
      {!location ? (
        <NoLocation onOpenSettings={openLocationSettings} />
      ) : loading && !weatherData ? (
        <div className="m-loading"><Spinner size={22} /><span>Loading weather…</span></div>
      ) : error && !weatherData ? (
        <div className="m-empty">
          <AlertCircle size={28} style={{ color: 'var(--danger)' }} />
          <span>{error}</span>
        </div>
      ) : weatherData ? (
        <div className="m-body">
          {error && <div className="m-notice">{error}</div>}

          <MobileCurrent data={weatherData} />

          <WeatherAlerts alerts={weatherData.alerts} />

          <div className="m-card">
            <HourlyForecast data={weatherData} />
          </div>

          <div className="m-card">
            <DailyForecast data={weatherData} />
          </div>

          <MobileRadarPreview onOpen={onOpenRadar} />

          <div className="m-card">
            <WeatherDetails data={weatherData} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
