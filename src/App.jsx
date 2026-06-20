import { useEffect, useState } from 'react';
import { Settings, MapPin, Navigation } from 'lucide-react';
import { MapView } from './components/Map/MapView';
import { WeatherSidebar } from './components/WeatherSidebar/WeatherSidebar';
import { MobileWeatherBtn, WeatherBottomSheet } from './components/WeatherBottomSheet/WeatherBottomSheet';
import { SettingsSidebar } from './components/SettingsSidebar/SettingsSidebar';
import { RadarScrubber } from './components/RadarScrubber/RadarScrubber';
import { ErrorReporter } from './components/ErrorReporter/ErrorReporter';
import { RadarLoadingBar } from './components/RadarLoadingBar/RadarLoadingBar';
import { WhatsNewModal } from './components/WhatsNewModal/WhatsNewModal';
import { BetaModal } from './components/BetaModal/BetaModal';
import { Spinner } from './components/ui/Spinner';
import { useWeather } from './hooks/useWeather';
import { useTheme } from './hooks/useTheme';
import { useIsMobile } from './hooks/useIsMobile';
import { useGeolocation } from './hooks/useGeolocation';
import useAppStore from './store/useAppStore';
import './App.css';

function GeoModal({ onAccept, onManual, loading, error }) {
  return (
    <div className="geo-modal-overlay">
      <div className="geo-modal">
        <div className="geo-modal-icon">
          <MapPin size={26} strokeWidth={1.8} />
        </div>
        <div className="geo-modal-title">Welcome to StormView</div>
        <div className="geo-modal-desc">
          To show weather and radar for your area, we need your location.
          You can also set it manually in settings.
        </div>
        {error && <div className="geo-error">{error}</div>}
        <div className="geo-modal-actions">
          <button className="geo-btn-primary" onClick={onAccept} disabled={loading}>
            {loading ? <Spinner size={16} color="#fff" /> : <Navigation size={16} strokeWidth={2} />}
            Use My Location
          </button>
          <button className="geo-btn-secondary" onClick={onManual}>
            Set Location Manually
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  useTheme();
  const isMobile = useIsMobile();

  const location        = useAppStore((s) => s.location);
  const settingsOpen    = useAppStore((s) => s.settingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setSettingsTab  = useAppStore((s) => s.setSettingsTab);
  const setLocation     = useAppStore((s) => s.setLocation);

  const [showGeoModal, setShowGeoModal] = useState(false);
  const [weatherSheetOpen, setWeatherSheetOpen] = useState(false);
  const [showBetaModal, setShowBetaModal] = useState(false);

  useEffect(() => {
    if (!location) setShowGeoModal(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { requestLocation, loading: geoLoading, error: geoError } = useGeolocation({
    onSuccess: (loc) => { setLocation(loc); setShowGeoModal(false); },
    onFailure: () => {},
  });

  const handleManualLocation = () => {
    setShowGeoModal(false);
    setSettingsTab('location');
    setSettingsOpen(true);
  };

  const { data: weatherData, loading: weatherLoading, error: weatherError, refetch } = useWeather();

  // Close bottom sheet when switching to desktop
  useEffect(() => {
    if (!isMobile) setWeatherSheetOpen(false);
  }, [isMobile]);

  return (
    <div className="app">
      <MapView />

      {/* Desktop: full sidebar */}
      {!isMobile && (
        <WeatherSidebar
          weatherData={weatherData}
          loading={weatherLoading}
          error={weatherError}
          onRefresh={refetch}
        />
      )}

      {/* Top-right corner: beta chip + settings gear */}
      <div className="app-top-corner">
        <button
          className="app-beta-chip"
          onClick={() => setShowBetaModal(true)}
          title="StormView is in beta"
        >
          BETA
        </button>
        <button
          className={`app-settings-btn ${settingsOpen ? 'app-settings-btn--active' : ''}`}
          onClick={() => setSettingsOpen(!settingsOpen)}
          title="Settings"
        >
          <Settings size={18} strokeWidth={1.8} />
        </button>
      </div>

      {/* Bottom stack: weather button (mobile) stacked above radar scrubber */}
      <div className={`app-bottom-stack${isMobile ? ' app-bottom-stack--mobile' : ''}`}>
        {isMobile && (
          <MobileWeatherBtn
            weatherData={weatherData}
            loading={weatherLoading}
            open={weatherSheetOpen}
            onClick={() => setWeatherSheetOpen((v) => !v)}
          />
        )}
        <RadarScrubber isMobile={isMobile} />
      </div>

      {/* Mobile: sliding bottom sheet */}
      {isMobile && (
        <WeatherBottomSheet
          weatherData={weatherData}
          loading={weatherLoading}
          error={weatherError}
          onRefresh={refetch}
          open={weatherSheetOpen}
          onClose={() => setWeatherSheetOpen(false)}
        />
      )}

      {/* Settings panel */}
      <SettingsSidebar />

      {/* Radar tile caching progress — top-center */}
      <RadarLoadingBar />

      {/* Runtime error toasts */}
      <ErrorReporter />

      {/* What's New modal — shows after location is set, once per version */}
      <WhatsNewModal />

      {/* Beta info modal */}
      {showBetaModal && <BetaModal onClose={() => setShowBetaModal(false)} />}

      {/* First-launch geo modal */}
      {showGeoModal && (
        <GeoModal
          onAccept={requestLocation}
          onManual={handleManualLocation}
          loading={geoLoading}
          error={geoError}
        />
      )}
    </div>
  );
}
