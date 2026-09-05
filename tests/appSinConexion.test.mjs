/* Que la aplicación ABRA sin conexión, no sólo que guarde lo que se escanea.
 *
 * ── El agujero que tapa ──────────────────────────────────────────────────
 *
 * El service worker precachea los archivos del build y los sirve POR SU URL:
 * `/index.html`, `/assets/index-abc.js`. Pero esto es una aplicación de una
 * sola página, y quien está en la puerta tiene abierto algo como
 * `/eventos/:id?s=asistentes&t=checkin` — una dirección que no es ningún
 * archivo y no está en el precache.
 *
 * Sin una ruta de navegación, esa dirección salía a la red, fallaba, y el
 * navegador enseñaba su pantalla de «sin internet». La cola de escaneos
 * funcionaba perfectamente… y no se podía llegar a ella: bastaba con que
 * alguien recargara, o con que el móvil matara la pestaña por memoria —que es
 * lo que hace un móvil con la pantalla apagada un rato— para quedarse sin
 * escáner hasta que volviera el wifi.
 *
 * Comprobado en el navegador con el servidor APAGADO: la ruta profunda abre y
 * pinta la aplicación entera.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const SW = 'src/sw.js';
const leer = () => readFileSync(SW, 'utf8');

test('las navegaciones caen al armazón de la aplicación', () => {
  const src = leer();
  assert.match(src, /new NavigationRoute\(createHandlerBoundToURL\('\/index\.html'\)/,
    'el service worker no atiende navegaciones: recargar sin conexión deja la puerta sin escáner');
  assert.match(src, /registerRoute\(/, 'la ruta se construye y no se registra: no la usa nadie');
});

test('lo que no es una pantalla no cae al armazón', () => {
  /* Sin esta lista, pedir un archivo servido por el mismo dominio devolvería
     el HTML de la aplicación en vez del recurso, y el fallo se leería como
     «respuesta corrupta» en vez de como un 404. */
  const src = leer();
  assert.match(src, /denylist:/, 'desapareció la lista de lo que no debe caer al armazón');
  assert.match(src, /\\.\[\^\/\]\+\$/,
    'ya no se excluyen las direcciones con extensión: un archivo devolvería el HTML de la aplicación');
});

test('el armazón está en el precache, o la ruta no tiene qué servir', () => {
  /* `createHandlerBoundToURL` exige que esa URL esté precacheada; si no, el
     service worker revienta al instalarse — y entonces no hay nada offline. */
  const src = leer();
  assert.match(src, /precacheAndRoute\(self\.__WB_MANIFEST\)/,
    'sin precache no hay `/index.html` que servir');

  /* Y si hay un build a mano, que de verdad lo lleve dentro. */
  if (existsSync('dist/sw.js')) {
    const construido = readFileSync('dist/sw.js', 'utf8');
    assert.ok(/index\.html/.test(construido),
      'el service worker construido no precachea index.html: la ruta de navegación no tendría qué servir');
  }
});
