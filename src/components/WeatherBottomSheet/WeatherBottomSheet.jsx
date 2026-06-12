import { useRef, useState, useEffect } from 'react';
import { MapPin, ChevronUp, RefreshCw } from 'lucide-react';
import { WeatherContent } from '../WeatherSidebar/WeatherContent';
import { WeatherIcon } from '../ui/WeatherIcon';
import { Spinner } from '../ui/Spinner';
import useAppStore from '../../store/useAppStore';
import './WeatherBottomSheet.css';

/** Floating pill button that opens the sheet */
export function MobileWeatherBtn({ weatherData, loading, open, onClick }) {
  const cu = weatherData?.current;
  const units = useAppStore((s) => s.units);
  const tempUnit = units === 'imperial' ? '°F' : '°C';

  return (
    <button
      className={`mobile-weather-btn ${open ? 'mobile-weather-btn--open' : ''}`}
      onClick={onClick}
    >
      {loading && !weatherData ? (
        <Spinner size={18} />
      ) : cu ? (
        <WeatherIcon code={cu.conditionCode} isDay={cu.isDay} size={20} />
      ) : (
        <MapPin size={18} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
      )}

      <div>
        {cu ? (
          <>
            <div className="mobile-weather-btn-temp">{cu.temp}{tempUnit}</div>
            <div className="mobile-weather-btn-condition">{cu.condition}</div>
          </>
        ) : (
          <div className="mobile-weather-btn-condition">
            {loading ? 'Loading…' : 'Tap for weather'}
          </div>
        )}
      </div>

      <ChevronUp size={16} strokeWidth={2} className="mobile-weather-btn-chevron" />
    </button>
  );
}

/** The sliding bottom sheet */
export function WeatherBottomSheet({ weatherData, loading, error, onRefresh, open, onClose }) {
  const location   = useAppStore((s) => s.location);
  const weatherAPI = useAppStore((s) => s.weatherAPI);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setSettingsTab  = useAppStore((s) => s.setSettingsTab);

  const sheetRef = useRef(null);
  const dragStartY = useRef(null);
  const dragDeltaY = useRef(0);

  const handleOpenSettings = () => {
    onClose();
    setSettingsTab('location');
    setSettingsOpen(true);
  };

  /* ---- Shared drag logic ---- */
  const applyDrag = (clientY) => {
    if (dragStartY.current == null) return;
    const delta = clientY - dragStartY.current;
    if (delta > 0) {
      dragDeltaY.current = delta;
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'none';
        sheetRef.current.style.transform = `translateY(${delta}px)`;
      }
    }
  };

  const finishDrag = () => {
    if (dragDeltaY.current > 80) {
      // Animate off-screen from current drag position before calling onClose.
      // Without this, the inline transform overrides the CSS class transition
      // and the sheet gets stuck at the drag-release position.
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.28s cubic-bezier(0.4, 0, 1, 1)';
        sheetRef.current.style.transform = 'translateY(110%)';
      }
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transition = '';
          sheetRef.current.style.transform = '';
        }
        onClose();
      }, 290);
    } else if (sheetRef.current) {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform = '';
    }
    dragStartY.current = null;
    dragDeltaY.current = 0;
  };

  /* ---- Touch ---- */
  const onTouchStart = (e) => {
    dragStartY.current = e.touches[0].clientY;
    dragDeltaY.current = 0;
  };
  const onTouchMove  = (e) => applyDrag(e.touches[0].clientY);
  const onTouchEnd   = () => finishDrag();

  /* ---- Mouse (desktop) ---- */
  const onMouseDown = (e) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragDeltaY.current = 0;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const onMove = (me) => applyDrag(me.clientY);
    const onUp = () => {
      finishDrag();
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Reset transform when opening
  useEffect(() => {
    if (open && sheetRef.current) {
      sheetRef.current.style.transform = '';
      sheetRef.current.style.transition = '';
    }
  }, [open]);

  return (
    <>
      {open && <div className="bottom-sheet-backdrop" onClick={onClose} />}

      <div
        ref={sheetRef}
        className={`bottom-sheet ${open ? 'bottom-sheet--open' : ''}`}
      >
        {/* Drag handle */}
        <div
          className="bottom-sheet-handle-area"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="bottom-sheet-handle" />
        </div>

        {/* Header */}
        <div className="bottom-sheet-header">
          <div className="bottom-sheet-location">
            <MapPin size={13} strokeWidth={2} style={{ color: 'var(--accent)' }} />
            <span className="bottom-sheet-location-name">
              {location?.name ?? 'No location set'}
            </span>
            {location?.state && (
              <span className="bottom-sheet-location-state">{location.state}</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {location && (
              <div className="bottom-sheet-api-badge">
                <span className="bottom-sheet-api-dot" />
                {weatherAPI === 'nws' ? 'NWS' : 'Open-Meteo'}
              </div>
            )}
            <button
              onClick={onRefresh}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center',
              }}
            >
              {loading ? <Spinner size={13} /> : <RefreshCw size={13} strokeWidth={1.8} />}
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="bottom-sheet-body">
          <WeatherContent
            weatherData={weatherData}
            loading={loading}
            error={error}
            onOpenSettings={handleOpenSettings}
          />
        </div>
      </div>
    </>
  );
}
