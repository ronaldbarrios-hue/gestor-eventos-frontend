/* Que quien tiene la pestaña abierta se entere de que hay algo nuevo.
 *
 * ── El fallo, medido ─────────────────────────────────────────────────────
 *
 * Con `registerType: 'autoUpdate'` el plugin recarga la página cuando el
 * service worker NUEVO se activa. Pero un service worker sólo se activa cuando
 * no queda ningún cliente del viejo — y `src/sw.js` no llama a `skipWaiting()`.
 * Con la pestaña abierta eso no pasa nunca.
 *
 * O sea: la recarga automática era una promesa que no se cumplía. Se desplegaba
 * un arreglo, la persona recargaba con F5 —que tampoco basta, el service worker
 * sirve lo suyo—, seguía viendo el fallo y lo reportaba. Cuatro veces en un
 * solo día, y cada una mandó a alguien a buscar en el sitio equivocado.
 *
 * Correr: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (f) => readFileSync(f, 'utf8').replace(/\r/g, '');

test('se avisa en vez de recargar por sorpresa', () => {
  assert.match(leer('vite.config.js'), /registerType: 'prompt'/);
  assert.match(leer('src/main.jsx'), /onNeedRefresh\(\) \{ avisarDeVersionNueva\(actualizar\); \}/);
});

test('no se mete `skipWaiting` en el service worker', () => {
  /* Sería la otra forma de hacer que `autoUpdate` funcionara, y es la mala:
     esta aplicación se usa en la puerta con una cola de escaneos sin conexión,
     y cambiarle el paquete por debajo a alguien a mitad de una fila es peor
     que la versión vieja. */
  const sw = leer('src/sw.js');
  assert.doesNotMatch(sw, /skipWaiting/);
  assert.doesNotMatch(sw, /clientsClaim/);
});

test('el aviso no depende de la hoja de estilos', () => {
  /* La que hay cargada es la de la versión VIEJA — que es exactamente el caso
     en el que este aviso tiene que salir. Con clases podría no verse. */
  const m = leer('src/main.jsx');
  assert.match(m, /caja\.style\.cssText/);
  assert.doesNotMatch(m, /caja\.className/);
});

test('se puede posponer, y no se recarga sola', () => {
  /* Quien está escaneando en la puerta no quiere una recarga a mitad de la
     fila. Vuelve a salir en la siguiente comprobación. */
  const m = leer('src/main.jsx');
  assert.match(m, /cerrar\.onclick = \(\) => caja\.remove\(\);/);
  assert.match(m, /boton\.onclick = \(\) => \{[^}]*actualizar\(true\);/);
});

test('no se apilan dos avisos', () => {
  /* La comprobación corre cada media hora y el aviso se puede posponer: sin
     esto, una jornada larga acaba con una pila de cajas. */
  assert.match(leer('src/main.jsx'), /if \(document\.getElementById\('gestek-version-nueva'\)\) return;/);
});

test('la comprobación periódica sigue ahí', () => {
  /* Sin ella la pestaña abierta no se entera de nada, y el aviso no tendría
     cuándo salir. */
  const m = leer('src/main.jsx');
  assert.match(m, /const MEDIA_HORA = 30 \* 60 \* 1000;/);
  assert.match(m, /registro\.update\(\)\.catch\(\(\) => \{\}\);/);
});

/* ── Y los grupos del formulario ─────────────────────────────────────── */

test('el grupo se escribe, no sólo se escoge', () => {
  /* Los siete de la lista salen de los formatos de caracterización de las
     entidades públicas: sirven para un informe oficial y para nada más. La
     base lo guarda como texto libre y nunca lo validó contra la lista, así que
     el dato se podía guardar y la pantalla no dejaba escribirlo. */
  const f = leer('src/pages/events/tabs/FormularioTab.jsx');
  assert.match(f, /list=\{`grupos-\$\{c\._key\}`\}/);
  assert.match(f, /<datalist id=\{`grupos-\$\{c\._key\}`\}>/);
  assert.match(f, /Escribe el que quieras, o elige uno de la lista/);
});
