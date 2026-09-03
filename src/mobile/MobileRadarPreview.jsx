import { lazy, Suspense } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { Radar, ChevronRight } from 'lucide-react';
import { RadarLayer } from '../components/Map/RadarLayer';
import { useRadar } from '../hooks/useRadar';
import { useTheme } from '../hooks/useTheme';
import useAppStore from '../store/useAppStore';
import './MobileRadarPreview.css';

const OpenMeteoRadarLayer = lazy(() =>
  import('../components/Map/OpenMeteoRadarLayer').then((m) => ({ default: m.OpenMeteoRadarLayer }))
);

/**
 * A small, non-interactive radar map centred on the user's location.
 * Tapping anywhere on it opens the full mobile radar experience.
 */
/* Same styled pin as the main map (see MapView.css → .location-pin) */
const locationIcon = (theme) =>
  L.divIcon({
    className: '',
    html: `<div class="location-pin ${theme === 'light' ? 'location-pin--light' : ''}">
             <div class="location-pin-dot"></div>
           </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

export function MobileRadarPreview({ onOpen }) {
  const location = useAppStore((s) => s.location);
  const radarSource = useAppStore((s) => s.radarSource);
  const theme = useTheme();

  // Keep radar frames warm so the preview (and the full view) have data ready.
  useRadar();

  if (!location) return null;

  return (
    <button className="m-radar-preview" onClick={onOpen} aria-label="Open radar">
      <div className="m-radar-preview-map">
        <MapContainer
          center={[location.lat, location.lon]}
          zoom={7}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
          className="m-radar-preview-leaflet"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className={theme === 'light' ? '' : 'tile-layer-dark'}
            maxZoom={19}
          />
          {radarSource === 'openmeteo'
            ? <Suspense fallback={null}><OpenMeteoRadarLayer /></Suspense>
            : <RadarLayer />}
          <Marker position={[location.lat, location.lon]} icon={locationIcon(theme)} />
        </MapContainer>
      </div>

      <div className="m-radar-preview-overlay">
        <div className="m-radar-preview-label">
          <Radar size={14} strokeWidth={2} />
          <span>Radar</span>
        </div>
        <div className="m-radar-preview-cta">
          Open <ChevronRight size={13} strokeWidth={2.5} />
        </div>
      </div>
    </button>
  );
}
