import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAppStore = create(
  persist(
    (set, get) => ({
      // ---- Persisted settings ----
      theme: 'dark',           // 'dark' | 'light' | 'system'
      weatherAPI: 'openmeteo', // 'nws' | 'openmeteo'
      units: 'imperial',       // 'imperial' | 'metric'
      sidebarPosition: 'left', // 'left' | 'right'
      radarOpacity: 0.75,
      radarTileQuality: 512,   // URL image size: 256 (fast, blurry) or 512 (sharp)
      radarColorScheme: 7,     // 0-11 LibreWXR color scheme IDs (7 = Rainbow)
      showNowcast: true,
      showSatellite: false,
      showAlertPolygons: false,
      mapZoom: 7,
      mapLayer: 'radar',       // 'radar' | 'aqi'
      location: null,          // { lat, lon, name, state }
      notifNws: true,          // receive NWS weather alert notifications
      notifAqi: true,          // receive AQI unhealthy notifications

      // ---- Transient UI state ----
      settingsOpen: false,
      settingsTab: 'location', // 'location' | 'api' | 'display' | 'radar'
      // { loadedTiles, totalTiles, framesLoaded, framesTotal, startTime }
      radarTileProgress: null,
      dismissedWhatsNewVersion: null, // persisted — stores the version string user dismissed

      // ---- Radar playback state ----
      radarFrames: [],         // [{ time, path, host, type: 'past'|'nowcast' }]
      radarCurrentIdx: 0,
      radarPlaying: false,
      radarSpeed: 1,           // 0.5 | 1 | 2

      // ---- Setters: settings ----
      setTheme: (theme) => set({ theme }),
      setWeatherAPI: (api) => set({ weatherAPI: api }),
      setUnits: (units) => set({ units }),
      setSidebarPosition: (pos) => set({ sidebarPosition: pos }),
      setRadarOpacity: (v) => set({ radarOpacity: v }),
      setRadarTileQuality: (v) => set({ radarTileQuality: v }),
      setRadarColorScheme: (v) => set({ radarColorScheme: v }),
      setShowNowcast: (v) => set({ showNowcast: v }),
      setShowSatellite: (v) => set({ showSatellite: v }),
      setShowAlertPolygons: (v) => set({ showAlertPolygons: v }),
      setMapZoom: (v) => set({ mapZoom: v }),
      setMapLayer: (v) => set({ mapLayer: v }),
      setLocation: (loc) => set({ location: loc }),
      setNotifNws: (v) => set({ notifNws: v }),
      setNotifAqi: (v) => set({ notifAqi: v }),

      // ---- Setters: UI ----
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setSettingsTab: (tab) => set({ settingsTab: tab }),
      setRadarTileProgress: (p) => set({ radarTileProgress: p }),
      setDismissedWhatsNewVersion: (v) => set({ dismissedWhatsNewVersion: v }),

      // ---- Setters: radar ----
      setRadarFrames: (frames) => set({
        radarFrames: frames,
        radarCurrentIdx: (() => {
          // Default to the most-recent observed (last 'past') frame, not nowcast
          for (let i = frames.length - 1; i >= 0; i--) {
            if (frames[i].type === 'past') return i;
          }
          return frames.length > 0 ? frames.length - 1 : 0;
        })(),
      }),
      setRadarCurrentIdx: (idx) => set({ radarCurrentIdx: idx }),
      setRadarPlaying: (v) => set({ radarPlaying: v }),
      setRadarSpeed: (v) => set({ radarSpeed: v }),

      // ---- Helpers ----
      resolvedTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      },

      getUnitLabel: (type) => {
        const { units } = get();
        if (type === 'temp') return units === 'imperial' ? '°F' : '°C';
        if (type === 'speed') return units === 'imperial' ? 'mph' : 'km/h';
        if (type === 'distance') return units === 'imperial' ? 'mi' : 'km';
        if (type === 'pressure') return 'hPa';
        return '';
      },
    }),
    {
      name: 'stormview-v1',
      version: 1,
      // Keep persisted values on version bump; new keys fall back to initial state defaults.
      migrate: (state) => state,
      // Explicit merge: spread defaults first so any new keys added to the store
      // always have a valid initial value even when loading older stored data.
      merge: (persisted, current) => ({ ...current, ...persisted }),
      partialize: (s) => ({
        theme: s.theme,
        weatherAPI: s.weatherAPI,
        units: s.units,
        sidebarPosition: s.sidebarPosition,
        radarOpacity: s.radarOpacity,
        radarTileQuality: s.radarTileQuality,
        radarColorScheme: s.radarColorScheme,
        showNowcast: s.showNowcast,
        showSatellite: s.showSatellite,
        showAlertPolygons: s.showAlertPolygons,
        mapZoom: s.mapZoom,
        mapLayer: s.mapLayer,
        location: s.location,
        notifNws: s.notifNws,
        notifAqi: s.notifAqi,
        dismissedWhatsNewVersion: s.dismissedWhatsNewVersion,
      }),
    }
  )
);

export default useAppStore;
