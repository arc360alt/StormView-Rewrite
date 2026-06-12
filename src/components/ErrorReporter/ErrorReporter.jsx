import { useState, useEffect, useCallback, useRef } from 'react';
import './ErrorReporter.css';

const GITHUB          = 'https://github.com/arc360alt/StormView-Rewrite';
const MAX_SHOW        = 4;
const AUTO_DISMISS_MS = 12000;

let uid = 0;

const IS_DEV_WARNING = (msg) =>
  msg.startsWith('Warning:') || msg.startsWith('Each child in a list');

function argsToMsg(args) {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.message;
      try { return JSON.stringify(a); } catch { return String(a); }
    })
    .join(' ')
    .trim();
}

export function ErrorReporter() {
  const [toasts, setToasts] = useState([]);
  const seenRef  = useRef(new Set());
  const guardRef = useRef(false);

  const push = useCallback((message) => {
    if (guardRef.current) return;
    const key = message.slice(0, 120);
    if (seenRef.current.has(key)) return;
    seenRef.current.add(key);

    const id = ++uid;
    guardRef.current = true;
    setToasts((prev) => [...prev.slice(-(MAX_SHOW - 1)), { id, message }]);
    guardRef.current = false;

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      seenRef.current.delete(key);
    }, AUTO_DISMISS_MS);
  }, []);

  useEffect(() => {
    // ---- Restore pre-init buffer and grab the real original console.error ----
    const preInit = window.__preInitErrors;
    if (preInit) {
      // Put back the real console.error so our closure below saves the true original
      console.error = preInit.origError;
      window.__preInitErrors = null;
    }

    const origError = console.error;

    // ---- Install live interceptors ----
    console.error = (...args) => {
      origError.apply(console, args);
      const msg = argsToMsg(args);
      if (!msg || IS_DEV_WARNING(msg)) return;
      push(msg.slice(0, 300));
    };

    const onError = (e) => {
      if (e.message) push(e.message.slice(0, 300));
    };

    const onUnhandled = (e) => {
      const msg = e.reason instanceof Error
        ? e.reason.message
        : typeof e.reason === 'string' ? e.reason : 'Unhandled promise rejection';
      push(msg.slice(0, 300));
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);

    // ---- Drain any errors that fired before this component mounted ----
    if (preInit?.queue?.length) {
      for (const args of preInit.queue) {
        const msg = argsToMsg(args);
        if (msg && !IS_DEV_WARNING(msg)) push(msg.slice(0, 300));
      }
    }

    return () => {
      console.error = origError;
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, [push]);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="err-stack" role="alert" aria-live="polite">
      {toasts.map((t) => {
        const issueUrl = `${GITHUB}/issues/new?title=${
          encodeURIComponent('Error: ' + t.message.slice(0, 80))
        }&body=${
          encodeURIComponent(
            '## Error\n\n```\n' + t.message + '\n```\n\n## Steps to reproduce\n\n1. \n\n## Browser\n\n' +
            navigator.userAgent
          )
        }`;
        return (
          <div key={t.id} className="err-toast">
            <div className="err-toast-top">
              <span className="err-toast-badge">Error</span>
              <button className="err-toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
            </div>
            <p className="err-toast-msg">{t.message}</p>
            <a className="err-toast-report" href={issueUrl} target="_blank" rel="noopener noreferrer">
              Report on GitHub →
            </a>
          </div>
        );
      })}
    </div>
  );
}
