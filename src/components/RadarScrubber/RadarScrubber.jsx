import { useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipForward, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { getFrameLabel } from '../../services/stormcast';
import { Spinner } from '../ui/Spinner';
import useAppStore from '../../store/useAppStore';
import { useRadar } from '../../hooks/useRadar';
import './RadarScrubber.css';

const SPEEDS = [0.5, 1, 2];

export function RadarScrubber({ isMobile = false }) {
  const radarFrames    = useAppStore((s) => s.radarFrames);
  const currentIdx     = useAppStore((s) => s.radarCurrentIdx);
  const playing        = useAppStore((s) => s.radarPlaying);
  const speed          = useAppStore((s) => s.radarSpeed);
  const sidebarPosition = useAppStore((s) => s.sidebarPosition);
  const showNowcast    = useAppStore((s) => s.showNowcast);

  const setCurrentIdx  = useAppStore((s) => s.setRadarCurrentIdx);
  const setPlaying     = useAppStore((s) => s.setRadarPlaying);
  const setSpeed       = useAppStore((s) => s.setRadarSpeed);

  const { loadFrames, jumpToNow } = useRadar();

  const timelineRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [loading, setLoading] = useState(false);

  const totalFrames = radarFrames.length;
  const currentFrame = radarFrames[currentIdx] ?? null;
  const isNowcast = currentFrame?.type === 'nowcast';

  // Count past vs nowcast
  const pastCount = radarFrames.filter((f) => f.type === 'past').length;
  const nowcastCount = radarFrames.filter((f) => f.type === 'nowcast').length;

  /* ---- Position → index mapping ---- */
  const posToIdx = useCallback((clientX) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || totalFrames === 0) return 0;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * (totalFrames - 1));
  }, [totalFrames]);

  const idxToPct = (idx) => totalFrames > 1 ? (idx / (totalFrames - 1)) * 100 : 0;

  /* ---- Mouse/touch handlers ---- */
  const handleTimelineMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setPlaying(false);
    setCurrentIdx(posToIdx(e.clientX));
    const onMove = (me) => setCurrentIdx(posToIdx(me.clientX));
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTimelineMouseMove = (e) => {
    if (!dragging) {
      setHoverIdx(posToIdx(e.clientX));
    }
  };

  const handleTimelineMouseLeave = () => {
    if (!dragging) setHoverIdx(null);
  };

  /* ---- Touch ---- */
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setDragging(true);
    setPlaying(false);
    setCurrentIdx(posToIdx(touch.clientX));
  };
  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    setCurrentIdx(posToIdx(touch.clientX));
  };
  const handleTouchEnd = () => setDragging(false);

  /* ---- Refresh ---- */
  const handleRefresh = async () => {
    setLoading(true);
    await loadFrames();
    setLoading(false);
  };

  /* ---- Time display ---- */
  const displayFrame = hoverIdx != null ? radarFrames[hoverIdx] : currentFrame;
  const displayTime = displayFrame ? new Date(displayFrame.time * 1000) : null;

  /* ---- Nowcast region positions ---- */
  // Use midpoint between last past tick and first nowcast tick so the first
  // nowcast tick falls fully inside the green region rather than straddling the edge.
  const nowcastStartPct = pastCount > 0 && pastCount < totalFrames && totalFrames > 1
    ? ((pastCount - 0.5) / (totalFrames - 1)) * 100 : null;

  // Desktop: base class centers on full viewport with 340px margins — already clears any sidebar.
  // The broken --sidebar-left override was shifting the pill too far right; just use base class.
  const wrapClass = isMobile ? 'scrubber-wrap scrubber-wrap--mobile' : 'scrubber-wrap';

  if (totalFrames === 0 && !loading) {
    return (
      <div className={wrapClass}>
        <div className="scrubber-pill">
          <div className="scrubber-empty">
            <Spinner size={14} />
            <span>Loading radar data…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      <div className="scrubber-pill">
        {/* ---- Top Controls Row ---- */}
        <div className="scrubber-top">
          {/* Play / Pause */}
          <button
            className="scrubber-play-btn"
            onClick={() => setPlaying(!playing)}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={14} strokeWidth={2.5} /> : <Play size={14} strokeWidth={2.5} style={{ marginLeft: 1 }} />}
          </button>

          {/* Speed selector */}
          <div className="scrubber-speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`speed-btn ${speed === s ? 'speed-btn--active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Time display */}
          <div className="scrubber-time-display">
            {displayTime ? (
              <>
                <div className="scrubber-time-main">
                  {format(displayTime, 'h:mm a')}
                  {(hoverIdx != null ? radarFrames[hoverIdx] : currentFrame)?.type === 'nowcast' && (
                    <span className="scrubber-nowcast-tag">Forecast</span>
                  )}
                </div>
                <div className="scrubber-time-date">
                  {format(displayTime, 'EEE, MMM d')}
                </div>
              </>
            ) : (
              <div className="scrubber-time-main" style={{ color: 'var(--text-muted)' }}>—</div>
            )}
          </div>

          {/* Actions */}
          <div className="scrubber-actions">
            <button
              className="scrubber-action-btn"
              onClick={jumpToNow}
              title="Jump to now"
            >
              <SkipForward size={11} strokeWidth={2} />
              Now
            </button>
            <button
              className={`scrubber-action-btn ${loading ? 'scrubber-action-btn--active' : ''}`}
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh radar"
            >
              {loading
                ? <Spinner size={11} />
                : <RefreshCw size={11} strokeWidth={2} />
              }
            </button>
          </div>
        </div>

        {/* ---- Timeline ---- */}
        <div
          className="scrubber-timeline"
          ref={timelineRef}
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Track */}
          <div className="timeline-track">
            {/* Past fill */}
            <div
              className="timeline-past-fill"
              style={{ width: `${idxToPct(Math.min(currentIdx, pastCount - 1))}%` }}
            />
            {/* Nowcast region */}
            {nowcastStartPct != null && nowcastCount > 0 && (
              <div
                className="timeline-nowcast-region"
                style={{
                  left: `${nowcastStartPct}%`,
                  width: `${100 - nowcastStartPct}%`,
                }}
              />
            )}
          </div>

          {/* Tick marks */}
          <div className="timeline-ticks">
            {radarFrames.map((f, i) => (
              <div
                key={i}
                className={[
                  'timeline-tick',
                  f.type === 'past' ? 'timeline-tick--past' : 'timeline-tick--nowcast',
                  i === currentIdx ? 'timeline-tick--active' : '',
                ].join(' ')}
                style={{ left: `${idxToPct(i)}%` }}
              />
            ))}
          </div>

          {/* Thumb */}
          {totalFrames > 0 && (
            <div
              className={`timeline-thumb ${dragging ? 'timeline-thumb--dragging' : ''}`}
              style={{ left: `${idxToPct(currentIdx)}%` }}
            />
          )}

          {/* Hover tooltip */}
          {hoverIdx != null && radarFrames[hoverIdx] && (
            <div
              className="timeline-tooltip"
              style={{ left: `${idxToPct(hoverIdx)}%` }}
            >
              {format(new Date(radarFrames[hoverIdx].time * 1000), 'h:mm a')}
              {radarFrames[hoverIdx].type === 'nowcast' && ' · Forecast'}
            </div>
          )}
        </div>

        {/* ---- Legend ---- */}
        <div className="scrubber-legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: 'var(--accent)' }} />
            <span>{pastCount} past frames</span>
          </div>
          {nowcastCount > 0 && (
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--nowcast-color)' }} />
              <span>{nowcastCount} nowcast frames</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
