import { useState, useEffect, useCallback } from 'react';
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
  const location = useAppStore((s) => s.location);

  const [supported,  setSupported]  = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  // Detect support and check existing subscription
  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (!ok) return;

    setPermission(Notification.permission);
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub));
    });
  }, []);

  // Auto-sync location to server whenever it changes and the user is subscribed.
  // Uses the same /subscribe upsert endpoint so only lat/lon/name are updated —
  // the push keys stay untouched.
  useEffect(() => {
    if (!subscribed || !location) return;

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

  // Subscribe: request permission → create push subscription → register with server
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
      return true;
    } catch (err) {
      setError(err.message ?? 'Failed to enable notifications.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [location]);

  // Unsubscribe: remove from browser + tell server
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

  return { supported, permission, subscribed, loading, error, subscribe, unsubscribe };
}
