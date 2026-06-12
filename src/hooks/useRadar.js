import { useEffect, useRef, useCallback } from 'react';
import { fetchRadarFrames } from '../services/stormcast';
import useAppStore from '../store/useAppStore';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const FRAME_DURATIONS = { 0.5: 600, 1: 400, 2: 200 }; // ms per frame

export function useRadar() {
  const setRadarFrames = useAppStore((s) => s.setRadarFrames);
  const setRadarCurrentIdx = useAppStore((s) => s.setRadarCurrentIdx);
  const setRadarPlaying = useAppStore((s) => s.setRadarPlaying);
  const radarFrames = useAppStore((s) => s.radarFrames);
  const radarCurrentIdx = useAppStore((s) => s.radarCurrentIdx);
  const radarPlaying = useAppStore((s) => s.radarPlaying);
  const radarSpeed = useAppStore((s) => s.radarSpeed);
  const showNowcast = useAppStore((s) => s.showNowcast);

  const animTimerRef = useRef(null);
  const fetchTimerRef = useRef(null);

  const loadFrames = useCallback(async () => {
    try {
      const allFrames = await fetchRadarFrames();
      const frames = showNowcast ? allFrames : allFrames.filter((f) => f.type === 'past');
      setRadarFrames(frames);
    } catch (err) {
      console.error('[useRadar] Failed to load radar frames:', err);
    }
  }, [setRadarFrames, showNowcast]);

  // Initial load and periodic refresh
  useEffect(() => {
    loadFrames();
    fetchTimerRef.current = setInterval(loadFrames, REFRESH_INTERVAL);
    return () => clearInterval(fetchTimerRef.current);
  }, [loadFrames]);

  // Animation loop
  useEffect(() => {
    if (animTimerRef.current) clearInterval(animTimerRef.current);
    if (!radarPlaying || radarFrames.length === 0) return;

    const delay = FRAME_DURATIONS[radarSpeed] ?? 400;
    animTimerRef.current = setInterval(() => {
      useAppStore.setState((s) => {
        const nextIdx = s.radarCurrentIdx + 1;
        if (nextIdx >= s.radarFrames.length) {
          // brief pause at end before looping
          return { radarCurrentIdx: 0 };
        }
        return { radarCurrentIdx: nextIdx };
      });
    }, delay);

    return () => clearInterval(animTimerRef.current);
  }, [radarPlaying, radarSpeed, radarFrames.length]);

  const jumpToNow = useCallback(() => {
    if (radarFrames.length === 0) return;
    // Find last 'past' frame (closest to now)
    let idx = radarFrames.length - 1;
    for (let i = radarFrames.length - 1; i >= 0; i--) {
      if (radarFrames[i].type === 'past') { idx = i; break; }
    }
    setRadarCurrentIdx(idx);
    setRadarPlaying(false);
  }, [radarFrames, setRadarCurrentIdx, setRadarPlaying]);

  return { loadFrames, jumpToNow };
}
