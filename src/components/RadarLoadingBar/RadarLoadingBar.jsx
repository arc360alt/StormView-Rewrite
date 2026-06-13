import { useState, useEffect, useRef } from 'react';
import useAppStore from '../../store/useAppStore';
import './RadarLoadingBar.css';

export function RadarLoadingBar() {
  const progress = useAppStore((s) => s.radarTileProgress);

  // Keep the bar visible for 2s after completion so the user sees "100%"
  const [visible, setVisible]       = useState(false);
  const [doneFlash, setDoneFlash]   = useState(false);
  const hideTimerRef = useRef(null);

  const p          = progress ?? { loadedTiles: 0, totalTiles: 0, framesLoaded: 0, framesTotal: 0, startTime: null };
  const isLoading  = p.totalTiles > 0 && p.loadedTiles < p.totalTiles;
  const pct        = p.totalTiles > 0 ? Math.round((p.loadedTiles / p.totalTiles) * 100) : 0;

  // ETA — recalculated on every render (store updates per-tile)
  let etaText = '';
  if (isLoading && p.startTime && p.loadedTiles > 0) {
    const elapsed  = (Date.now() - p.startTime) / 1000;
    const rate     = p.loadedTiles / elapsed;          // tiles/s
    const remaining = (p.totalTiles - p.loadedTiles) / rate;
    if      (remaining < 2)  etaText = 'almost done';
    else if (remaining < 60) etaText = `~${Math.ceil(remaining)}s left`;
    else                     etaText = `~${Math.ceil(remaining / 60)}m left`;
  }

  useEffect(() => {
    clearTimeout(hideTimerRef.current);
    if (isLoading) {
      setVisible(true);
      setDoneFlash(false);
    } else if (p.totalTiles > 0) {
      // Brief "done" flash before fading out
      setDoneFlash(true);
      hideTimerRef.current = setTimeout(() => setVisible(false), 2000);
    } else {
      // progress reset to null (new load starting or no data) — hide immediately
      setDoneFlash(false);
      setVisible(false);
    }
    return () => clearTimeout(hideTimerRef.current);
  }, [isLoading, p.totalTiles]);

  if (!visible) return null;

  const displayPct     = doneFlash && !isLoading ? 100 : pct;
  const displayFrames  = doneFlash && !isLoading ? p.framesTotal : p.framesLoaded;

  return (
    <div className={`rload-wrap ${doneFlash && !isLoading ? 'rload-wrap--done' : ''}`}>
      <div className="rload-pill">
        <div className="rload-label">Radar tiles</div>

        <div className="rload-track">
          <div className="rload-fill" style={{ width: `${displayPct}%` }} />
        </div>

        <div className="rload-stats">
          <span className="rload-pct">{displayPct}%</span>
          <span className="rload-sep">·</span>
          <span className="rload-frames">
            {displayFrames}/{p.framesTotal} frames
          </span>
          {etaText && (
            <>
              <span className="rload-sep">·</span>
              <span className="rload-eta">{etaText}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
