import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { deriveThemeVars, isLightBg } from '../utils/themeColor';

export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const customTheme = useAppStore((s) => s.customTheme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (t) => root.setAttribute('data-theme', t);

    // Custom vars only apply while theme === 'custom' — clear them otherwise
    // so switching to any other preset falls back to its plain stylesheet.
    const clearCustomVars = () => {
      Object.keys(deriveThemeVars(customTheme)).forEach((k) => root.style.removeProperty(k));
    };

    if (theme === 'system') {
      clearCustomVars();
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const handler = (e) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else if (theme === 'custom') {
      apply('custom');
      const vars = deriveThemeVars(customTheme);
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    } else {
      clearCustomVars();
      apply(theme);
    }
  }, [theme, customTheme]);

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
