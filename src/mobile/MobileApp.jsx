import { useState } from 'react';
import { MobileHome } from './MobileHome';
import { MobileRadar } from './MobileRadar';

/**
 * Root of the dedicated mobile experience.
 *
 * The desktop app renders a full-screen map with a floating weather sidebar.
 * On phones we instead show a scrollable weather page (MobileHome) and let the
 * user jump into a focused radar view (MobileRadar) via the radar preview card.
 * These are two completely separate screens — never shown at the same time.
 */
export function MobileApp({ weatherData, loading, error, onRefresh }) {
  const [view, setView] = useState('home'); // 'home' | 'radar'

  if (view === 'radar') {
    return <MobileRadar onBack={() => setView('home')} />;
  }

  return (
    <MobileHome
      weatherData={weatherData}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      onOpenRadar={() => setView('radar')}
    />
  );
}
