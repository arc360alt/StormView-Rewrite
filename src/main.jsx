import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Install a lightweight console.error buffer BEFORE React renders.
// Other components' useEffects fire before <ErrorReporter>'s useEffect, so any
// errors they emit would otherwise be missed. ErrorReporter drains this queue on mount.
const _origConsoleError = console.error;
window.__preInitErrors = { queue: [], origError: _origConsoleError };
console.error = (...args) => {
  _origConsoleError.apply(console, args);
  window.__preInitErrors?.queue.push(args);
};

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
