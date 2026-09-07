/* Service worker personalizado de GESTEK.
   El plugin vite-plugin-pwa (modo injectManifest) inyecta aquí el precache
   de los archivos del build en la línea de self.__WB_MANIFEST — no borrar. */
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

precacheAndRoute(self.__WB_MANIFEST);

/* ─────────── Que la aplicación ABRA sin conexión ───────────
 *
 * ── El agujero que tapa ──────────────────────────────────────────────────
 *
 * `precacheAndRoute` guarda los archivos del build y los sirve POR SU URL:
 * `/index.html`, `/assets/index-abc.js`, etc. Pero esto es una aplicación de
 * una sola página, y quien está en la puerta tiene abierto algo como
 * `/eventos/:id?s=asistentes&t=checkin` — una dirección que no es ningún
 * archivo y que no está en el precache.
 *
 * Así que sin conexión, cualquier navegación a esa dirección salía a la red,
 * fallaba, y el navegador enseñaba su pantalla de «sin internet». La cola de
 * escaneos funcionaba perfectamente… y no se podía llegar a ella: bastaba con
 * que alguien recargara, o con que el móvil matara la pestaña por memoria —
 * que es lo que hace un móvil con la pantalla apagada un rato— para quedarse
 * sin escáner hasta que volviera el wifi.
 *
 * ── Cómo funciona ────────────────────────────────────────────────────────
 *
 * `NavigationRoute` sólo atiende peticiones de NAVEGACIÓN (`mode: 'navigate'`),
 * es decir abrir o recargar una dirección. Las llamadas a la API son `fetch`
 * y `XHR`, no navegaciones, así que no las toca — y además viven en otro
 * dominio. No hay riesgo de servir datos viejos: lo único que se sirve de la
 * caché es el armazón de la aplicación, que es el mismo del despliegue.
 */
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), {
  /* Lo que NO es una pantalla de la aplicación y no debe caer al armazón.
     Sin esta lista, entrar a `/api/...` o descargar un archivo servido por el
     mismo dominio devolvería el HTML de la aplicación en vez del recurso, y
     el fallo se leería como «respuesta corrupta» en vez de como un 404.

     ── Y `/embed/`, que no es una pantalla nuestra ────────────────────────

     Es un trozo de GESTEK dentro de la web de OTRA empresa, y ahí «una versión
     por detrás» no es un detalle: es lo que le ve el público del cliente.
     Servido desde el precache, quien ya había cargado el formulario alguna vez
     recibía el armazón viejo en su siguiente visita —y el arreglo desplegado
     no le llegaba hasta que el service worker se relevara, que con la pestaña
     abierta puede no pasar en toda la jornada—. Se comprobó en producción:
     recién desplegado el arreglo del contraste, el navegador seguía sirviendo
     el bundle anterior desde la caché y el formulario seguía ilegible.

     Y no pierde nada: el embebido necesita la API para tener algo que enseñar,
     así que no tiene historia sin conexión que proteger. La cola de escaneos
     de la puerta —que es para lo que existe todo esto— no pasa por aquí. */
  denylist: [/^\/api\//, /^\/assets\//, /^\/embed\//, /\.[^/]+$/],
}));

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
