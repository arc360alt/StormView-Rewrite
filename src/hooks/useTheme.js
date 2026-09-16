import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { deriveThemeVars, isLightBg, COLOR_PRESETS, THEME_VAR_KEYS } from '../utils/themeColor';

export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const colorPreset = useAppStore((s) => s.colorPreset);
  const customTheme = useAppStore((s) => s.customTheme);

  useEffect(() => {
    const root = document.documentElement;
    const clearInlineVars = () => THEME_VAR_KEYS.forEach((k) => root.style.removeProperty(k));

    // Applies the light/dark mode attribute, then layers the color preset's
    // vars on top (as inline styles) if one is selected — or clears any
    // previous override so the plain stylesheet block takes over.
    const applyForMode = (mode) => {
      root.setAttribute('data-theme', mode);
      const base = colorPreset !== 'default' ? COLOR_PRESETS[colorPreset]?.[mode] : null;
      if (base) {
        const vars = deriveThemeVars(base);
        Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
      } else {
        clearInlineVars();
      }
    };

    if (theme === 'custom') {
      root.setAttribute('data-theme', 'custom');
      const vars = deriveThemeVars(customTheme);
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
      return;
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyForMode(mq.matches ? 'dark' : 'light');
      const handler = (e) => applyForMode(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }

    applyForMode(theme); // 'dark' | 'light'
  }, [theme, colorPreset, customTheme]);

  const resolvedTheme = (() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (theme === 'custom') {
      return isLightBg(customTheme.bg) ? 'light' : 'dark';
    }
    return theme;
  })();

  return resolvedTheme;
}
