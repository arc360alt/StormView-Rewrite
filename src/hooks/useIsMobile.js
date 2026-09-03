import { useState, useEffect } from 'react';

const BREAKPOINT = 768;

// A phone regardless of orientation: narrow viewport, OR a touch device with a
// phone-like user agent (covers landscape phones wider than the breakpoint).
function detectMobile() {
  if (typeof window === 'undefined') return false;
  const narrow = window.innerWidth <= BREAKPOINT;
  const ua = navigator.userAgent || '';
  const phoneUA = /Android|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  return narrow || (phoneUA && coarse);
}

export function useIsMobile() {
  const [mobile, setMobile] = useState(detectMobile);
  useEffect(() => {
    const handler = () => setMobile(detectMobile());
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);
  return mobile;
}
