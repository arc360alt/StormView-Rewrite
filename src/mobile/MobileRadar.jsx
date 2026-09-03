import { useEffect } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { MapView } from '../components/Map/MapView';
import { RadarScrubber } from '../components/RadarScrubber/RadarScrubber';
import useAppStore from '../store/useAppStore';
import './MobileRadar.css';

/**
 * Full-screen mobile radar experience. Same map + scrubber as desktop, but
 * without the "open forecast panel" button — just a back button (top-left)
 * that returns to the mobile weather page.
 */
export function MobileRadar({ onBack }) {
  const mapLayer = useAppStore((s) => s.mapLayer);
  const setMapLayer = useAppStore((s) => s.setMapLayer);
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  // This screen is specifically the radar view — make sure the radar layer is on.
  useEffect(() => {
    if (mapLayer !== 'radar') setMapLayer('radar');
  }, [mapLayer, setMapLayer]);

  return (
    <div className="mobile-radar">
      <MapView />

      <button className="mobile-radar-back" onClick={onBack}>
        <ChevronLeft size={18} strokeWidth={2.2} />
        Back
      </button>

      {/* Glass settings gear — same control as the desktop overlay */}
      <div className="app-top-corner">
        <button
          className={`app-settings-btn ${settingsOpen ? 'app-settings-btn--active' : ''}`}
          onClick={() => setSettingsOpen(!settingsOpen)}
          title="Settings"
        >
          <Settings size={18} strokeWidth={1.8} />
        </button>
      </div>

      <div className="app-bottom-stack app-bottom-stack--mobile">
        <RadarScrubber isMobile />
      </div>
    </div>
  );
}
