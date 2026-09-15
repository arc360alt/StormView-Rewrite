/** Small hex-color helpers used to derive a full custom theme from a
 *  handful of user-picked base colors, and to preview presets in Settings. */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mix(hexA, hexB, weight) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * weight);
  const g = Math.round(a.g + (b.g - a.g) * weight);
  const bl = Math.round(a.b + (b.b - a.b) * weight);
  return `rgb(${r}, ${g}, ${bl})`;
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Whether a background color reads as a "light" theme (for callers that
 *  branch on theme === 'light', e.g. map tile filters). */
export function isLightBg(hex) {
  return luminance(hex) >= 0.5;
}

/** Curated built-in themes selectable from Settings, beyond the custom builder. */
export const THEME_PRESETS = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'system', label: 'System' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'forest', label: 'Forest' },
  { id: 'crimson', label: 'Crimson' },
  { id: 'custom', label: 'Custom' },
];

/** Swatch preview colors for the CSS-defined presets (bg/accent only — just
 *  enough to render a small gradient chip in Settings without reading computed
 *  styles). Must stay in sync with the `[data-theme="..."]` blocks in index.css. */
export const PRESET_PREVIEW = {
  dark: { bg: '#090910', accent: '#4f8ef5' },
  light: { bg: '#e8edf5', accent: '#2563eb' },
  ocean: { bg: '#071620', accent: '#22d3ee' },
  sunset: { bg: '#1a0f0a', accent: '#fb923c' },
  forest: { bg: '#0c1410', accent: '#4ade80' },
  crimson: { bg: '#160709', accent: '#f43f5e' },
};

/**
 * Expands the user's ~8 picked base colors into the full CSS variable set the
 * app uses, so the custom-theme picker doesn't need one input per variable.
 * Returns a plain object of `--css-var: value` pairs to apply as inline styles
 * on `documentElement` (which naturally override the stylesheet).
 */
export function deriveThemeVars(custom) {
  const { bg, surface, textPrimary, textSecondary, accent, warning, danger, success } = custom;
  const isDark = luminance(bg) < 0.5;
  const mixColor = isDark ? '#ffffff' : '#000000';

  return {
    '--bg': bg,
    '--surface': surface,
    '--surface-elevated': mix(surface, mixColor, isDark ? 0.06 : 0.04),
    '--surface-hover': rgba(mixColor, isDark ? 0.05 : 0.04),
    '--surface-active': rgba(mixColor, 0.08),
    '--border': rgba(mixColor, 0.07),
    '--border-strong': rgba(mixColor, 0.14),

    '--text-primary': textPrimary,
    '--text-secondary': textSecondary,
    '--text-muted': rgba(textSecondary, 0.55),

    '--accent': accent,
    '--accent-light': mix(accent, '#ffffff', 0.25),
    '--accent-dim': rgba(accent, isDark ? 0.14 : 0.10),
    '--accent-glow': rgba(accent, isDark ? 0.35 : 0.25),

    '--nowcast-color': isDark ? '#34d399' : '#059669',
    '--nowcast-dim': isDark ? 'rgba(52, 211, 153, 0.14)' : 'rgba(5, 150, 105, 0.10)',

    '--warning': warning,
    '--warning-dim': rgba(warning, isDark ? 0.14 : 0.10),
    '--danger': danger,
    '--danger-dim': rgba(danger, isDark ? 0.14 : 0.10),
    '--success': success,

    '--glass-bg': rgba(bg, isDark ? 0.86 : 0.84),
    '--glass-border': rgba(mixColor, 0.07),
    '--scrubber-bg': rgba(bg, 0.82),

    '--shadow-sm': isDark ? '0 2px 10px rgba(0, 0, 0, 0.4)' : '0 2px 10px rgba(0, 0, 0, 0.08)',
    '--shadow-md': isDark ? '0 6px 28px rgba(0, 0, 0, 0.5)' : '0 6px 28px rgba(0, 0, 0, 0.12)',
    '--shadow-lg': isDark ? '0 12px 56px rgba(0, 0, 0, 0.6)' : '0 12px 56px rgba(0, 0, 0, 0.16)',
    '--shadow-glow': `0 0 ${isDark ? 32 : 24}px ${rgba(accent, isDark ? 0.35 : 0.25)}`,

    '--scrollbar-thumb': rgba(mixColor, isDark ? 0.12 : 0.14),
  };
}
