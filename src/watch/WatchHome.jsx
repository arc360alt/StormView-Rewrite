import { useEffect, useRef } from 'react';
import { MapPin, RefreshCw, AlertCircle, Settings } from 'lucide-react';
import { MobileCurrent } from '../mobile/MobileCurrent';
import { MobileRadarPreview } from '../mobile/MobileRadarPreview';
import { AlertBanner } from '../components/WeatherSidebar/AlertBanner';
import { WeatherAlerts } from '../components/WeatherSidebar/WeatherAlerts';
import { HourlyForecast } from '../components/WeatherSidebar/HourlyForecast';
import { DailyForecast } from '../components/WeatherSidebar/DailyForecast';
import { WeatherDetails } from '../components/WeatherSidebar/WeatherDetails';
import { Spinner } from '../components/ui/Spinner';
import { useNwsAlerts } from '../hooks/useNwsAlerts';
import useAppStore from '../store/useAppStore';
import { tick, makeScrollHaptic } from './haptics';
import '../mobile/MobileHome.css'; // .m-current / .m-radar-preview classes used by reused components
import './watch.css';

/**
 * Scrollable weather page for smartwatches. Same sections as the mobile page —
 * current conditions, hourly, 7-day, radar, details — just packed tighter and
 * padded to clear a round display's edges.
 */
export function WatchHome({ weatherData, loading, error, onRefresh, onOpenRadar }) {
  const alerts = useNwsAlerts();
  const location = useAppStore((s) => s.location);
  const round = useAppStore((s) => s.watchRoundDisplay);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);

  const openLocationSettings = () => {
    setSettingsTab('location');
    setSettingsOpen(true);
  };

  // In watch mode the *document* is the scroll container (WatchApp sets
  // .is-watch on <html>). The Wear OS crown scrolls that natively; some builds
  // only do so once a scrollable element has focus, and a few deliver the
  // rotation as `wheel` events on the root — cover both.
  const rootRef = useRef(null);
  useEffect(() => {
    rootRef.current?.focus?.({ preventScroll: true });
    const doc = document.scrollingElement || document.documentElement;

    const onWheel = (e) => {
      const step =
        e.deltaMode === 1 ? e.deltaY * 24
        : e.deltaMode === 2 ? e.deltaY * window.innerHeight
        : e.deltaY;
      if (!step) return;
      e.preventDefault();          // take full control — no double-scroll
      window.scrollBy(0, step);
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    // Light haptic detents while scrolling, like the rest of Wear OS
    const scrollHaptic = makeScrollHaptic();
    const onScroll = () => scrollHaptic(doc.scrollTop);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div
      className={`watch-app watch-home${round ? ' watch-app--round' : ''}`}
      ref={rootRef}
      tabIndex={0}
    >
      <header className="w-header">
        <MapPin size={12} strokeWidth={2.2} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        {location ? (
          <span className="w-header-loc">{location.name}</span>
        ) : (
          <button className="w-header-set" onClick={openLocationSettings}>Set location</button>
        )}
        {location && (
          <button
            className="w-icon-btn"
            onClick={() => { tick(); onRefresh(); }}
            aria-label="Refresh"
          >
            {loading ? <Spinner size={13} /> : <RefreshCw size={13} strokeWidth={2} />}
          </button>
        )}
        <button
          className="w-icon-btn"
          onClick={() => { tick(); setSettingsOpen(true); }}
          aria-label="Settings"
        >
          <Settings size={13} strokeWidth={2} />
        </button>
      </header>

      <AlertBanner alerts={alerts} />

      {!location ? (
        <div className="w-empty">
          <MapPin size={26} style={{ color: 'var(--text-muted)' }} />
          <span>Set a location on your phone or here</span>
          <button className="w-empty-btn" onClick={openLocationSettings}>Settings</button>
        </div>
      ) : loading && !weatherData ? (
        <div className="w-empty"><Spinner size={20} /><span>Loading…</span></div>
      ) : error && !weatherData ? (
        <div className="w-empty">
          <AlertCircle size={24} style={{ color: 'var(--danger)' }} />
          <span>{error}</span>
        </div>
      ) : weatherData ? (
        <div className="w-body">
          {error && <div className="w-notice">{error}</div>}

          <MobileCurrent data={weatherData} />

          <WeatherAlerts alerts={weatherData.alerts} />

          <div className="w-card">
            <HourlyForecast data={weatherData} />
          </div>

          <div className="w-card">
            <DailyForecast data={weatherData} />
          </div>

          <MobileRadarPreview onOpen={() => { tick(); onOpenRadar(); }} />

          <div className="w-card">
            <WeatherDetails data={weatherData} />
          </div>

          <div className="w-foot">StormView</div>
        </div>
      ) : null}
    </div>
  );
}
