/**
 * Tiny haptic ticks for watch mode, via the Vibration API (supported by Wear OS
 * Chrome). No-ops silently where vibration isn't available.
 *
 * ── Tune the feel here ──────────────────────────────────────────────
 *   TAP_MS         pulse length for button taps / discrete actions
 *   ZOOM_MS        pulse length for each radar zoom step
 *   SCROLL_MS      pulse length for each scroll detent
 *   SCROLL_STEP_PX scroll distance between detent ticks (bigger = fewer)
 *   MIN_GAP_MS     minimum time between any two pulses
 *
 *   Larger *_MS = stronger/longer buzz (the API can't change amplitude, only
 *   duration). Set a value to 0 to silence that one; set all three to 0 to
 *   disable haptics entirely.
 */
export const TAP_MS         = 4;
export const ZOOM_MS        = 5;
export const SCROLL_MS      = 2;
export const SCROLL_STEP_PX = 46;
export const MIN_GAP_MS     = 24;

let lastAt = 0;

/** A short pulse. Rate-limited so continuous input doesn't buzz constantly. */
export function tick(ms = TAP_MS, minGap = MIN_GAP_MS) {
  if (!ms) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const now = Date.now();
  if (now - lastAt < minGap) return;
  lastAt = now;
  try { navigator.vibrate(ms); } catch { /* ignore */ }
}

/** Accumulates a moving value and ticks once per `stepPx` of travel. */
export function makeScrollHaptic(stepPx = SCROLL_STEP_PX, ms = SCROLL_MS) {
  let acc = 0;
  let prev = null;
  return (value) => {
    if (prev !== null) {
      acc += Math.abs(value - prev);
      if (acc >= stepPx) { acc %= stepPx; tick(ms); }
    }
    prev = value;
  };
}
