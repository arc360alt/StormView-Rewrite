import { useEffect, useRef, useCallback } from 'react';
import { fetchRadarFrames } from '../services/stormcast';
import useAppStore from '../store/useAppStore';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const FRAME_DURATIONS = { 0.5: 600, 1: 400, 2: 200 }; // ms per frame

export function useRadar() {
  const setRadarFrames    = useAppStore((s) => s.setRadarFrames);
  const setRadarCurrentIdx = useAppStore((s) => s.setRadarCurrentIdx);
  const setRadarPlaying   = useAppStore((s) => s.setRadarPlaying);
  const radarFrames       = useAppStore((s) => s.radarFrames);
  const radarCurrentIdx   = useAppStore((s) => s.radarCurrentIdx);
  const radarPlaying      = useAppStore((s) => s.radarPlaying);
  const radarSpeed        = useAppStore((s) => s.radarSpeed);
  const showNowcast       = useAppStore((s) => s.showNowcast);

  const animTimerRef = useRef(null);
  // Cache the full unfiltered frame list so showNowcast changes don't re-fetch
  const allFramesRef = useRef([]);

  // Completely stable — reads store snapshot at resolve time so settings hydration
  // doesn't recreate this and trigger a second fetch.
  const loadFrames = useCallback(async (signal) => {
    try {
      const allFrames = await fetchRadarFrames(signal);
      allFramesRef.current = allFrames;
      const { showNowcast: showNow, setRadarFrames: setFrames } = useAppStore.getState();
      const frames = showNow ? allFrames : allFrames.filter((f) => f.type === 'past');
      setFrames(frames);
    } catch (err) {
      if (err.name === 'AbortError') return; // React StrictMode cleanup — expected
      console.error('[useRadar] Failed to load radar frames:', err);
    }
  }, []);

  // Initial load and periodic refresh.
  // AbortController lets StrictMode's cleanup cancel the first (duplicate) fetch so
  // only one setRadarFrames call ever fires, preventing the double tile-load that
  // produces 80+ NS_BINDING_ABORTED errors in development.
  useEffect(() => {
    const controller = new AbortController();
    loadFrames(controller.signal);
    const interval = setInterval(() => loadFrames(new AbortController().signal), REFRESH_INTERVAL);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [loadFrames]);

  // When showNowcast toggles in settings, re-filter cached frames without re-fetching
  useEffect(() => {
    if (allFramesRef.current.length === 0) return;
    const frames = showNowcast
      ? allFramesRef.current
      : allFramesRef.current.filter((f) => f.type === 'past');
    setRadarFrames(frames);
  }, [showNowcast, setRadarFrames]);

  // Animation loop
  useEffect(() => {
    if (animTimerRef.current) clearInterval(animTimerRef.current);
    if (!radarPlaying || radarFrames.length === 0) return;

    const delay = FRAME_DURATIONS[radarSpeed] ?? 400;
    animTimerRef.current = setInterval(() => {
      useAppStore.setState((s) => {
        const nextIdx = s.radarCurrentIdx + 1;
        if (nextIdx >= s.radarFrames.length) return { radarCurrentIdx: 0 };
        return { radarCurrentIdx: nextIdx };
      });
    }, delay);

    return () => clearInterval(animTimerRef.current);
  }, [radarPlaying, radarSpeed, radarFrames.length]);

  const jumpToNow = useCallback(() => {
    if (radarFrames.length === 0) return;
    let idx = radarFrames.length - 1;
    for (let i = radarFrames.length - 1; i >= 0; i--) {
      if (radarFrames[i].type === 'past') { idx = i; break; }
    }
    setRadarCurrentIdx(idx);
    setRadarPlaying(false);
  }, [radarFrames, setRadarCurrentIdx, setRadarPlaying]);

  return { loadFrames, jumpToNow };
}
