import { useState, useEffect, useCallback, useRef } from 'react';
import useAppStore from '../store/useAppStore';

const API = import.meta.env.VITE_PUSH_API_URL ?? '';

function urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64  = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function getVapidPublicKey() {
  const res = await fetch(`${API}/vapid-public-key`);
  if (!res.ok) throw new Error('Could not reach the notification server.');
  const { publicKey } = await res.json();
  return publicKey;
}

export function usePushNotifications() {
  const location    = useAppStore((s) => s.location);
  const notifNws    = useAppStore((s) => s.notifNws);
  const notifAqi    = useAppStore((s) => s.notifAqi);
  const setNotifNws = useAppStore((s) => s.setNotifNws);
  const setNotifAqi = useAppStore((s) => s.setNotifAqi);

  const [supported,  setSupported]  = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  // Detect support and check existing subscription on mount
  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (!ok) return;

    setPermission(Notification.permission);
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub));
    });
  }, []);

  // ── Location sync ──────────────────────────────────────────────────────────
  const lastSynced = useRef(null);

  useEffect(() => {
    if (!subscribed || !location) return;

    const prev = lastSynced.current;
    const unchanged = prev &&
      Math.abs(prev.lat - location.lat) < 0.001 &&
      Math.abs(prev.lon - location.lon) < 0.001 &&
      prev.name === location.name;
    if (unchanged) return;

    lastSynced.current = location;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) return;
        return fetch(`${API}/subscribe`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            subscription: sub,
            lat:          location.lat,
            lon:          location.lon,
            locationName: location.name,
          }),
        });
      })
      .catch((err) => console.warn('[notifications] Location sync failed:', err.message));
  }, [location, subscribed]);

  // ── Preference sync ────────────────────────────────────────────────────────
  // Fires immediately when either preference changes (if subscribed).
  const lastPrefs = useRef(null);

  useEffect(() => {
    if (!subscribed) return;

    const prev = lastPrefs.current;
    if (prev && prev.nws === notifNws && prev.aqi === notifAqi) return;
    lastPrefs.current = { nws: notifNws, aqi: notifAqi };

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) return;
        return fetch(`${API}/preferences`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            endpoint:   sub.endpoint,
            nwsEnabled: notifNws,
            aqiEnabled: notifAqi,
          }),
        });
      })
      .catch((err) => console.warn('[notifications] Preference sync failed:', err.message));
  }, [notifNws, notifAqi, subscribed]);

  // ── Subscribe ──────────────────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    if (!location) return false;
    setLoading(true);
    setError(null);
    try {
      const reg  = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError('Notification permission was denied.');
        return false;
      }

      const publicKey    = await getVapidPublicKey();
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch(`${API}/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          subscription,
          lat:          location.lat,
          lon:          location.lon,
          locationName: location.name,
        }),
      });
      if (!res.ok) throw new Error('Notification server rejected the subscription.');

      setSubscribed(true);

      // Sync stored preferences immediately after subscribing (in case they differ from server defaults)
      await fetch(`${API}/preferences`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          endpoint:   subscription.endpoint,
          nwsEnabled: notifNws,
          aqiEnabled: notifAqi,
        }),
      }).catch(() => {});

      return true;
    } catch (err) {
      setError(err.message ?? 'Failed to enable notifications.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [location, notifNws, notifAqi]);

  // ── Unsubscribe ────────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${API}/unsubscribe`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      setError(err.message ?? 'Failed to disable notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    supported, permission, subscribed, loading, error,
    subscribe, unsubscribe,
    notifNws, notifAqi, setNotifNws, setNotifAqi,
  };
}
