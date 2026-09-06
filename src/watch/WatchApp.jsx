import { useState, useEffect } from 'react';
import { WatchHome } from './WatchHome';
import { WatchRadar } from './WatchRadar';
import useAppStore from '../store/useAppStore';

/**
 * Root of the smartwatch experience (see useIsWatch). Two never-simultaneous
 * screens: the scrollable weather page and a focused radar view.
 */
export function WatchApp({ weatherData, loading, error, onRefresh }) {
  const [view, setView] = useState('home'); // 'home' | 'radar'
  const round = useAppStore((s) => s.watchRoundDisplay);

  // Let the *document* be the scroll container in watch mode — that's what the
  // Wear OS rotating crown scrolls. (Normally html/body/#root/.app are all
  // overflow:hidden and a nested div scrolls, which the crown can't reach.)
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add('is-watch');
    return () => el.classList.remove('is-watch');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('is-watch-round', !!round);
  }, [round]);

  // navigator.vibrate() is gated behind a user gesture — until the page has
  // seen one, every haptic call is silently dropped (that's why buzzing only
  // kicks in after the first tap, e.g. opening Settings). The rotating crown
  // does NOT count as a gesture, so scroll haptics can't self-start. Fire a
  // 1 ms no-op pulse on the very first touch/tap to unlock the API for
  // everything after it.
  useEffect(() => {
    let primed = false;
    const prime = () => {
      if (primed) return;
      primed = true;
      try { navigator.vibrate?.(1); } catch { /* ignore */ }
      events.forEach((e) => window.removeEventListener(e, prime, opts));
    };
    const events = ['touchstart', 'pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
    const opts = { capture: true, passive: true };
    events.forEach((e) => window.addEventListener(e, prime, opts));
    return () => events.forEach((e) => window.removeEventListener(e, prime, opts));
  }, []);

  if (view === 'radar') {
    return <WatchRadar onBack={() => setView('home')} />;
  }

  return (
    <WatchHome
      weatherData={weatherData}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      onOpenRadar={() => setView('radar')}
    />
  );
}
