import { useState, useEffect } from 'react';

const BREAKPOINT = 768;

export function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= BREAKPOINT);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}
