import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchNWSWeather } from '../services/nws';
import { fetchOpenMeteoWeather } from '../services/openmeteo';
import useAppStore from '../store/useAppStore';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function useWeather() {
  const location = useAppStore((s) => s.location);
  const weatherAPI = useAppStore((s) => s.weatherAPI);
  const units = useAppStore((s) => s.units);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  const fetchWeather = useCallback(async () => {
    if (!location?.lat || !location?.lon) return;

    abortRef.current?.abort();
    setLoading(true);
    setError(null);

    try {
      let result;
      if (weatherAPI === 'nws') {
        result = await fetchNWSWeather(location.lat, location.lon, units);
      } else {
        result = await fetchOpenMeteoWeather(location.lat, location.lon, units);
      }
      setData(result);
    } catch (err) {
      console.error('[useWeather] fetch failed:', err);
      // Auto-fallback: if NWS fails (outside US), try Open-Meteo
      if (weatherAPI === 'nws') {
        try {
          const fallback = await fetchOpenMeteoWeather(location.lat, location.lon, units);
          setData({ ...fallback, nwsFallback: true });
          setError('NWS is only available in the US. Showing Open-Meteo data instead.');
        } catch (err2) {
          setError(err2.message || 'Failed to fetch weather data.');
        }
      } else {
        setError(err.message || 'Failed to fetch weather data.');
      }
    } finally {
      setLoading(false);
    }
  }, [location, weatherAPI, units]);

  useEffect(() => {
    fetchWeather();
    timerRef.current = setInterval(fetchWeather, REFRESH_INTERVAL);
    return () => {
      clearInterval(timerRef.current);
    };
  }, [fetchWeather]);

  return { data, loading, error, refetch: fetchWeather };
}
