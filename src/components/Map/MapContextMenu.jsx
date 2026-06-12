import { useEffect, useRef, useState } from 'react';
import { MapPin, Crosshair, Copy, ExternalLink } from 'lucide-react';
import { reverseGeocode } from '../../services/geocoding';
import useAppStore from '../../store/useAppStore';
import { Spinner } from '../ui/Spinner';
import './MapContextMenu.css';

export function MapContextMenu({ lat, lon, x, y, onClose, mapRef }) {
  const setLocation = useAppStore((s) => s.setLocation);
  const menuRef = useRef(null);
  const [locLoading, setLocLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleSetLocation = async () => {
    setLocLoading(true);
    try {
      const loc = await reverseGeocode(lat, lon);
      setLocation(loc);
      onClose();
    } catch {
      setLocLoading(false);
    }
  };

  const handleCenterMap = () => {
    mapRef.current?.setView([lat, lon], undefined, { animate: true });
    onClose();
  };

  const handleCopyCoords = async () => {
    await navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    setCopied(true);
    setTimeout(onClose, 700);
  };

  const handleOpenMaps = () => {
    window.open(`https://maps.google.com/?q=${lat},${lon}`, '_blank', 'noopener');
    onClose();
  };

  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;

  return (
    <div ref={menuRef} className="map-ctx" style={{ left: x, top: y }}>
      <div className="map-ctx-coords">
        <span>{latStr}</span>
        <span className="map-ctx-coords-sep">·</span>
        <span>{lonStr}</span>
      </div>

      <div className="map-ctx-sep" />

      <button className="map-ctx-item" onClick={handleSetLocation} disabled={locLoading}>
        {locLoading ? <Spinner size={13} /> : <MapPin size={13} strokeWidth={2} />}
        Set Weather Location Here
      </button>

      <button className="map-ctx-item" onClick={handleCenterMap}>
        <Crosshair size={13} strokeWidth={2} />
        Center Map Here
      </button>

      <div className="map-ctx-sep" />

      <button className="map-ctx-item" onClick={handleCopyCoords}>
        <Copy size={13} strokeWidth={2} />
        {copied ? 'Copied!' : 'Copy Coordinates'}
      </button>

      <button className="map-ctx-item map-ctx-item--dim" onClick={handleOpenMaps}>
        <ExternalLink size={13} strokeWidth={2} />
        Open in Google Maps
      </button>
    </div>
  );
}
