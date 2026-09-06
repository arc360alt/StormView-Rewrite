import { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { MapView } from '../components/Map/MapView';
import { RadarScrubber } from '../components/RadarScrubber/RadarScrubber';
import useAppStore from '../store/useAppStore';
import { tick, ZOOM_MS } from './haptics';
import './watch.css';

// ~130 px of crown scroll per zoom level.
const ZOOM_STEP_PX = 130;

/**
 * Full-screen radar for the watch. Same map + scrubber as everywhere else, no
 * forecast-panel button — just a back button.
 *
 * Zooming with the rotating crown: there's nothing scrollable on a full-screen
 * map, so the crown emits nothing. We keep a tall invisible spacer in the
 * document flow so the crown *does* scroll the page, then translate that scroll
 * into map zoom and snap the scroll position back to centre.
 */
export function WatchRadar({ onBack }) {
  const mapLayer = useAppStore((s) => s.mapLayer);
  const setMapLayer = useAppStore((s) => s.setMapLayer);
  const round = useAppStore((s) => s.watchRoundDisplay);

  const mapObj = useRef(null);

  useEffect(() => {
    if (mapLayer !== 'radar') setMapLayer('radar');
  }, [mapLayer, setMapLayer]);

  useEffect(() => {
    const doc = document.scrollingElement || document.documentElement;
    const mid = () => Math.max(0, (doc.scrollHeight - doc.clientHeight) / 2);

    let center = mid();
    doc.scrollTop = center;
    let last = doc.scrollTop;
    let accum = 0;
    let lastScrollAt = 0;

    const recenter = () => { center = mid(); doc.scrollTop = center; last = center; accum = 0; };

    const onScroll = () => {
      lastScrollAt = Date.now();
      const cur = doc.scrollTop;
      accum += cur - last;
      last = cur;

      const map = mapObj.current;
      if (map) {
        while (accum >= ZOOM_STEP_PX) { map.zoomOut(1); accum -= ZOOM_STEP_PX; tick(ZOOM_MS); }
        while (accum <= -ZOOM_STEP_PX) { map.zoomIn(1); accum += ZOOM_STEP_PX; tick(ZOOM_MS); }
      }

      // Keep headroom in both directions
      const margin = doc.clientHeight * 0.4;
      if (cur < margin || cur > center * 2 - margin) {
        doc.scrollTop = center;
        last = center;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', recenter);
    const id = setTimeout(recenter, 60); // after layout settles

    // Secondary path: some builds deliver the crown as wheel events without any
    // scrollable movement. Skip it if the scroll path just handled the input.
    const onWheel = (e) => {
      const map = mapObj.current;
      if (!map || !e.deltaY || Date.now() - lastScrollAt < 250) return;
      map.setZoom(map.getZoom() + (e.deltaY < 0 ? 1 : -1));
      tick(ZOOM_MS);
    };
    window.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', recenter);
      window.removeEventListener('wheel', onWheel);
      clearTimeout(id);
    };
  }, []);

  return (
    <>
      <div className={`watch-app watch-radar${round ? ' watch-app--round' : ''}`}>
        <MapView onMap={(m) => { mapObj.current = m; }} />

        <button
          className="watch-radar-back"
          onClick={() => { tick(); onBack(); }}
          aria-label="Back"
        >
          <ChevronLeft size={18} strokeWidth={2.4} />
        </button>

        <div className="app-bottom-stack app-bottom-stack--mobile watch-scrubber">
          <RadarScrubber isMobile />
        </div>
      </div>

      {/* Kept in normal flow so the document has room for the crown to scroll */}
      <div className="watch-radar-sink" aria-hidden="true" />
    </>
  );
}
