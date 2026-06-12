import { useState, useRef, useCallback } from 'react';
import { Search, MapPin, Navigation } from 'lucide-react';
import { searchLocation } from '../../services/geocoding';
import { useGeolocation } from '../../hooks/useGeolocation';
import { Spinner } from '../ui/Spinner';
import useAppStore from '../../store/useAppStore';

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export function LocationSettings() {
  const location = useAppStore((s) => s.location);
  const setLocation = useAppStore((s) => s.setLocation);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await searchLocation(q);
      setResults(res.slice(0, 5));
    } catch {
      setSearchError('Search failed. Try again.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const debouncedSearch = useDebounce(doSearch, 400);

  const handleInput = (e) => {
    setQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  const selectResult = (r) => {
    setLocation(r);
    setQuery('');
    setResults([]);
  };

  const { requestLocation, loading: gpsLoading, error: gpsError } = useGeolocation({
    onSuccess: (loc) => setLocation(loc),
  });

  return (
    <div>
      {location && (
        <div className="current-location-display">
          <div className="loc-name">
            <MapPin size={12} strokeWidth={2} style={{ display: 'inline', marginRight: 4, color: 'var(--accent)' }} />
            {location.name}{location.state ? `, ${location.state}` : ''}
            {location.country && location.country !== 'US' ? ` · ${location.country}` : ''}
          </div>
          <div className="loc-coords">{location.lat?.toFixed(4)}, {location.lon?.toFixed(4)}</div>
        </div>
      )}

      {gpsError && <div className="settings-error">{gpsError}</div>}
      {searchError && <div className="settings-error">{searchError}</div>}

      <div className="location-search">
        <input
          type="text"
          className="location-search-input"
          placeholder="Search city, zip, or address…"
          value={query}
          onChange={handleInput}
          autoComplete="off"
          spellCheck={false}
        />
        <span className="location-search-icon">
          {searching ? <Spinner size={14} /> : <Search size={14} strokeWidth={1.8} />}
        </span>
      </div>

      {results.length > 0 && (
        <div className="location-results">
          {results.map((r, i) => (
            <div key={i} className="location-result-item" onClick={() => selectResult(r)}>
              <MapPin size={12} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div className="location-result-name">{r.name}{r.state ? `, ${r.state}` : ''}</div>
                <div className="location-result-sub">{r.display}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="location-gps-btn" onClick={requestLocation} disabled={gpsLoading}>
        {gpsLoading ? <Spinner size={14} /> : <Navigation size={14} strokeWidth={1.8} />}
        Use my current location
      </button>
    </div>
  );
}
