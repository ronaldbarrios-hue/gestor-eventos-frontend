/* El formulario de registro en un móvil.
 *
 * Es el paso donde se gana o se pierde a alguien: veinte preguntas, captcha y
 * pago, de pie y con una mano. Lo que se protege aquí salió de medirlo a
 * 375×420 —un móvil con el teclado abierto, que se come media pantalla—.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const EVENTO = 'src/pages/public/EventoPublicoPage.jsx';
const CAMPO = 'src/components/ui/CampoFormulario.jsx';
const leer = (p) => readFileSync(p, 'utf8');
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('«revisa el dato marcado abajo» lleva de verdad al dato', () => {
  /* Medido: con el teclado abierto se pulsa «Continuar», la pantalla no se
     mueve y el aviso queda fuera por arriba —a −138 px—. Lo que parece es que
     el botón no funciona, y ahí se abandona el registro. */
  const src = sinComentarios(leer(EVENTO));
  assert.match(src, /const irAloQueFalta = \(\) => setBuscarFallo/,
    'desapareció el salto al campo que falla: el aviso vuelve a no llevar a ningún sitio');
  assert.match(src, /document\.querySelector\('\[aria-invalid="true"\]'\)/,
    'ya no se busca el campo marcado');
  assert.match(src, /malo\.focus\(\{ preventScroll: true \}\)/,
    'no se le da el foco: en un móvil eso es lo que abre el teclado donde toca escribir');
});

test('el salto va en un efecto, no justo después de validar', () => {
  /* Probado: con `requestAnimationFrame` el marcado todavía no está en el DOM
     —React agrupa y pinta después— así que no se encontraba nada y el foco se
     quedaba donde estaba. */
  const src = sinComentarios(leer(EVENTO));
  assert.match(src, /useEffect\(\(\) => \{\s*if \(!buscarFallo\) return;/,
    'el salto volvió a correr antes de que React pinte el marcado');
});

test('el nombre se ofrece al autorrelleno', () => {
  /* El correo y el teléfono ya lo tenían; el nombre no, que es el primero y
     donde el móvil más escritura ahorra. */
  const src = leer(EVENTO);
  assert.match(src, /id="res-nombre" required=\{requiereNombre\} autoComplete="name"/,
    'el nombre del checkout perdió el autorrelleno');
});

test('una pregunta propia que pide un nombre también', () => {
  /* No hay tipo «nombre» en el catálogo —texto, párrafo, número, fecha, email,
     teléfono, documento, selección, múltiple, casilla y foto— así que
     «nombre del acompañante» es un `texto`. Se deduce de la etiqueta, que es lo
     que este proyecto ya hace con los documentos al importar. */
  const src = sinComentarios(leer(CAMPO));
  assert.match(src, /const pareceNombre = t === 'texto'/,
    'se dejó de deducir: las preguntas propias que piden un nombre pierden el autorrelleno');
  assert.match(src, /!\/\(evento\|empresa\|usuario\|archivo\|producto\)\/i/,
    'se quitó la lista de excepciones: «nombre de la empresa» ofrecería el nombre de la persona');
});
