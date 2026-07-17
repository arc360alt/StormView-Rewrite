// StormView Service Worker — handles push notifications

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// ── Push received ─────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = JSON.parse(event.data.text());
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'StormView Alert', {
      body:    data.body   ?? '',
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      tag:     data.tag    ?? 'stormview-alert',
      // Renotify so that multiple different alerts each make a sound
      renotify: true,
      data:    { url: data.url ?? '/' },
    })
  );
});

// ── Notification tapped ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing open window if one exists
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
