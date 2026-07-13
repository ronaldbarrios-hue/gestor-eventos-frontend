/* Service worker personalizado de GESTEK.
   El plugin vite-plugin-pwa (modo injectManifest) inyecta aquí el precache
   de los archivos del build en la línea de self.__WB_MANIFEST — no borrar. */
import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

/* ─────────── Notificaciones Push ─────────── */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'GESTEK', body: event.data.text() };
  }

  const title = data.title || 'GESTEK';
  const options = {
    body: data.body || '',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: { url: data.url || '/dashboard' },
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* Al hacer clic en la notificación, enfoca una pestaña existente de GESTEK
   si ya hay una abierta, o abre una nueva en la URL indicada. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
