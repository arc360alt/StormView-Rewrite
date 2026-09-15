import './widgets.css';

const PHASES = [
  { name: 'New Moon', emoji: '🌑', max: 1 / 16 },
  { name: 'Waxing Crescent', emoji: '🌒', max: 3 / 16 },
  { name: 'First Quarter', emoji: '🌓', max: 5 / 16 },
  { name: 'Waxing Gibbous', emoji: '🌔', max: 7 / 16 },
  { name: 'Full Moon', emoji: '🌕', max: 9 / 16 },
  { name: 'Waning Gibbous', emoji: '🌖', max: 11 / 16 },
  { name: 'Last Quarter', emoji: '🌗', max: 13 / 16 },
  { name: 'Waning Crescent', emoji: '🌘', max: 15 / 16 },
  { name: 'New Moon', emoji: '🌑', max: 1 },
];

/** Fraction through the ~29.53-day synodic month (0 = new moon, 0.5 = full moon). */
function moonPhaseFraction(date) {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const synodicMonth = 29.53058867;
  const diffDays = (date.getTime() - knownNewMoon) / 86400000;
  let phase = (diffDays % synodicMonth) / synodicMonth;
  if (phase < 0) phase += 1;
  return phase;
}

export function MoonPhase() {
  const phase = moonPhaseFraction(new Date());
  const entry = PHASES.find((p) => phase <= p.max) ?? PHASES[PHASES.length - 1];
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100);

  return (
    <div className="widget-moon sidebar-section">
      <div className="sidebar-section-title">Moon Phase</div>
      <div className="widget-moon-body">
        <span className="widget-moon-emoji">{entry.emoji}</span>
        <div>
          <div className="widget-moon-name">{entry.name}</div>
          <div className="widget-moon-illum">{illumination}% illuminated</div>
        </div>
      </div>
    </div>
  );
}
