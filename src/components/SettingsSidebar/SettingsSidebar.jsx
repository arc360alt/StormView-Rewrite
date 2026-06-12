import { X } from 'lucide-react';
import { LocationSettings } from './LocationSettings';
import { Toggle } from '../ui/Toggle';
import useAppStore from '../../store/useAppStore';
import './SettingsSidebar.css';

const TABS = [
  { id: 'location', label: 'Location' },
  { id: 'api',      label: 'Weather' },
  { id: 'display',  label: 'Display' },
  { id: 'radar',    label: 'Radar' },
];

/* RainViewer-compatible color schemes (1-8) */
const COLOR_SCHEMES = [
  { id: 1, name: 'Titan',     gradient: 'linear-gradient(90deg, #00000000, #0000ff, #00ff00, #ffff00, #ff0000)' },
  { id: 2, name: 'RainViewer',    gradient: 'linear-gradient(90deg, #00000000, #008000, #00ff00, #ffff00, #ff8000, #ff0000)' },
  { id: 3, name: 'Purple',   gradient: 'linear-gradient(90deg, #00000000, #6600cc, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)' },
  { id: 4, name: 'Nexrad', gradient: 'linear-gradient(90deg, #000, #004000, #008000, #00c000, #ffff00, #ff8000, #ff0000, #cc00cc)' },
  { id: 5, name: 'Green',  gradient: 'linear-gradient(90deg, #000, #003366, #006699, #0099cc, #66ccff, #ffffff)' },
  { id: 6, name: 'Default',    gradient: 'linear-gradient(90deg, #00000000, #220033, #440066, #8800cc, #ff44ff, #ffaaff)' },
  { id: 7, name: 'Default but different', gradient: 'linear-gradient(90deg, #00000000, #003380, #0066cc, #00aaff, #aaddff, #ffffff)' },
  { id: 8, name: 'Dark Sky',     gradient: 'linear-gradient(90deg, #000, #222, #555, #999, #ccc, #fff)' },
];

function SegControl({ options, value, onChange }) {
  return (
    <div className="seg-control">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`seg-btn ${value === opt.value ? 'seg-btn--active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SettingsSlider({ label, value, min, max, step = 0.01, format, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="settings-slider-wrap">
      <div className="settings-slider-top">
        <span className="settings-slider-label">{label}</span>
        <span className="settings-slider-value">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        className="settings-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--pct': `${pct}%` }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function LocationTab() {
  return (
    <div className="settings-group">
      <div className="settings-group-label">Your Location</div>
      <LocationSettings />
    </div>
  );
}

function APITab() {
  const weatherAPI = useAppStore((s) => s.weatherAPI);
  const setWeatherAPI = useAppStore((s) => s.setWeatherAPI);
  const units = useAppStore((s) => s.units);
  const setUnits = useAppStore((s) => s.setUnits);

  return (
    <>
      <div className="settings-group">
        <div className="settings-group-label">Weather Provider</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Data Source</div>
            <div className="settings-row-sub">NWS is US-only. Open-Meteo is global.</div>
          </div>
          <SegControl
            options={[
              { label: 'NWS', value: 'nws' },
              { label: 'Open-Meteo', value: 'openmeteo' },
            ]}
            value={weatherAPI}
            onChange={setWeatherAPI}
          />
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-label">Units</div>
        <div className="settings-row">
          <div className="settings-row-label">Temperature & Speed</div>
          <SegControl
            options={[
              { label: 'Imperial', value: 'imperial' },
              { label: 'Metric', value: 'metric' },
            ]}
            value={units}
            onChange={setUnits}
          />
        </div>
      </div>
    </>
  );
}

function DisplayTab() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const sidebarPosition = useAppStore((s) => s.sidebarPosition);
  const setSidebarPosition = useAppStore((s) => s.setSidebarPosition);

  return (
    <>
      <div className="settings-group">
        <div className="settings-group-label">Theme</div>
        <div className="settings-row">
          <div className="settings-row-label">Color Mode</div>
          <SegControl
            options={[
              { label: 'Dark', value: 'dark' },
              { label: 'Light', value: 'light' },
              { label: 'System', value: 'system' },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-label">Layout</div>
        <div className="settings-row">
          <div className="settings-row-label">Sidebar Position</div>
          <SegControl
            options={[
              { label: 'Left', value: 'left' },
              { label: 'Right', value: 'right' },
            ]}
            value={sidebarPosition}
            onChange={setSidebarPosition}
          />
        </div>
      </div>
    </>
  );
}

function RadarTab() {
  const radarOpacity = useAppStore((s) => s.radarOpacity);
  const setRadarOpacity = useAppStore((s) => s.setRadarOpacity);
  const radarColorScheme = useAppStore((s) => s.radarColorScheme);
  const setRadarColorScheme = useAppStore((s) => s.setRadarColorScheme);
  const showNowcast = useAppStore((s) => s.showNowcast);
  const setShowNowcast = useAppStore((s) => s.setShowNowcast);
  const showSatellite = useAppStore((s) => s.showSatellite);
  const setShowSatellite = useAppStore((s) => s.setShowSatellite);
  const showAlertPolygons = useAppStore((s) => s.showAlertPolygons);
  const setShowAlertPolygons = useAppStore((s) => s.setShowAlertPolygons);

  return (
    <>
      <div className="settings-group">
        <div className="settings-group-label">Radar Options</div>
        <SettingsSlider
          label="Radar Opacity"
          value={radarOpacity}
          min={0.1}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={setRadarOpacity}
        />
        <div className="settings-row" style={{ marginTop: 6 }}>
          <Toggle
            checked={showNowcast}
            onChange={setShowNowcast}
            label="Show 90-min Nowcast"
          />
        </div>
        <div className="settings-row">
          <Toggle
            checked={showSatellite}
            onChange={setShowSatellite}
            label="Satellite Imagery"
          />
        </div>
        <div className="settings-row">
          <Toggle
            checked={showAlertPolygons}
            onChange={setShowAlertPolygons}
            label="NWS Warning Polygons"
          />
        </div>
        {showAlertPolygons && (
          <div style={{
            padding: '8px 10px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-xs)',
            fontSize: 11,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginTop: 4,
          }}>
            Overlays active NWS warning polygons (US only). Click any polygon for full details.
          </div>
        )}
      </div>

      <div className="settings-group">
        <div className="settings-group-label">Color Scheme</div>
        <div className="color-scheme-grid">
          {COLOR_SCHEMES.map((cs) => (
            <button
              key={cs.id}
              className={`color-scheme-btn ${radarColorScheme === cs.id ? 'color-scheme-btn--active' : ''}`}
              onClick={() => setRadarColorScheme(cs.id)}
            >
              <div className="color-scheme-swatch" style={{ background: cs.gradient }} />
              <span className="color-scheme-name">{cs.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

const TAB_CONTENT = {
  location: <LocationTab />,
  api: <APITab />,
  display: <DisplayTab />,
  radar: <RadarTab />,
};

export function SettingsSidebar() {
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const settingsTab = useAppStore((s) => s.settingsTab);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);

  if (!settingsOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-backdrop" onClick={() => setSettingsOpen(false)} />
      <div className="settings-panel">
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <button className="settings-close" onClick={() => setSettingsOpen(false)}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="settings-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`settings-tab ${settingsTab === t.id ? 'settings-tab--active' : ''}`}
              onClick={() => setSettingsTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {TAB_CONTENT[settingsTab] ?? <LocationTab />}
        </div>
      </div>
    </div>
  );
}
