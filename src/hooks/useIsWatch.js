import { useMemo } from 'react';

/**
 * Watch mode: a stripped-down layout tuned for smartwatch displays
 * (Pixel Watch / Wear OS). Opt in with `?watch` (or `?mode=watch`) in the URL;
 * a Wear OS user agent also triggers it automatically.
 *
 * The query string doesn't change during a session, so this never needs to
 * re-evaluate.
 */
export function useIsWatch() {
  return useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.has('watch') || p.get('mode') === 'watch') return true;
    } catch { /* ignore */ }
    return /Wear ?OS|Watch/i.test(navigator.userAgent || '');
  }, []);
}
