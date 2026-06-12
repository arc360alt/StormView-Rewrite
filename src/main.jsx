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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
