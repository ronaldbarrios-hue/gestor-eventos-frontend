/* GESTEK — Service Worker para Web Push.
   Recibe notificaciones del backend y las renderiza. Click → abre URL en la app. */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { title: 'GESTEK', body: event.data?.text() || '' }; }

  const title = payload.title || 'GESTEK';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || payload.evento?.id || 'gestek',
    renotify: true,
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    /* Si ya hay una pestaña abierta de la app, foco + navegar */
    for (const client of allClients) {
      if ('focus' in client) {
        client.focus();
        if ('navigate' in client) {
          try { await client.navigate(target); } catch { /* same-origin only */ }
        }
        return;
      }
    }
    /* Si no, abrimos una nueva */
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
