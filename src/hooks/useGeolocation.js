import { useState, useCallback } from 'react';
import { reverseGeocode } from '../services/geocoding';

/**
 * Returns { requestLocation, loading, error }
 * On success, calls onSuccess({ lat, lon, name, state, country })
 * On failure, calls onFailure()
 */
export function useGeolocation({ onSuccess, onFailure } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      onFailure?.();
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const loc = await reverseGeocode(lat, lon);
          onSuccess?.(loc);
        } catch {
          setError('Could not determine your city name.');
          onSuccess?.({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'My Location', state: '', country: '' });
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        const msg =
          err.code === 1 ? 'Location access denied. Please set your location manually.'
          : err.code === 2 ? 'Location unavailable. Please set your location manually.'
          : 'Location request timed out. Please set your location manually.';
        setError(msg);
        onFailure?.();
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [onSuccess, onFailure]);

  return { requestLocation, loading, error };
}
