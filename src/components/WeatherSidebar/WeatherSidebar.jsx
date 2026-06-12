import { MapPin, RefreshCw } from 'lucide-react';
import { WeatherContent } from './WeatherContent';
import { Spinner } from '../ui/Spinner';
import useAppStore from '../../store/useAppStore';
import './WeatherSidebar.css';

export function WeatherSidebar({ weatherData, loading, error, onRefresh }) {
  const location = useAppStore((s) => s.location);
  const sidebarPosition = useAppStore((s) => s.sidebarPosition);
  const weatherAPI = useAppStore((s) => s.weatherAPI);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);

  const posClass = sidebarPosition === 'right' ? 'weather-sidebar--right' : 'weather-sidebar--left';

  const handleSetLocation = () => {
    setSettingsTab('location');
    setSettingsOpen(true);
  };

  return (
    <div className={`weather-sidebar ${posClass}`}>
      <div className="sidebar-glass">
        {/* Header */}
        <div className="sidebar-header">
          {location ? (
            <div className="sidebar-location">
              <MapPin size={13} strokeWidth={2} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span className="sidebar-location-name">{location.name}</span>
              {location.state && (
                <span className="sidebar-location-state">{location.state}</span>
              )}
              <button
                onClick={onRefresh}
                style={{
                  marginLeft: 'auto', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-secondary)', padding: 4,
                  borderRadius: 6, display: 'flex', alignItems: 'center',
                }}
                title="Refresh weather"
              >
                {loading ? <Spinner size={13} /> : <RefreshCw size={13} strokeWidth={1.8} />}
              </button>
            </div>
          ) : (
            <div className="sidebar-location">
              <MapPin size={13} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <button
                onClick={handleSetLocation}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--accent)', fontSize: 13, fontWeight: 500, padding: 0,
                }}
              >
                Set your location
              </button>
            </div>
          )}
          {weatherAPI && location && (
            <div className="sidebar-api-badge">
              <span className="sidebar-api-badge-dot" />
              {weatherAPI === 'nws' ? 'NWS' : 'Open-Meteo'}
              {weatherData?.nwsFallback && ' (fallback)'}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="sidebar-body">
          <WeatherContent
            weatherData={weatherData}
            loading={loading}
            error={error}
            onOpenSettings={handleSetLocation}
          />
        </div>
      </div>
    </div>
  );
}
