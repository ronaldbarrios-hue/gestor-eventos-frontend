/* La pantalla dice cuándo te devolvió la boleta que ya tenías.
 *
 * El servidor reconoce a quien ya estaba registrado en esta misma boleta
 * gratuita y le devuelve la suya en vez de emitir otra. Si la confirmación
 * dijera «¡Reserva confirmada!» a secas, esa persona se quedaría esperando un
 * correo que no va a llegar —salió la primera vez— y volvería a intentarlo, que
 * es exactamente cómo se llega a tres boletas del mismo correo.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.join(process.cwd(), 'src', 'pages', 'public', 'EventoPublicoPage.jsx'), 'utf8').replace(/\r/g, '');

test('la bandera del servidor llega a la confirmación', () => {
  assert.match(SRC, /yaEstaba: Boolean\(res\.ya_estaba\)/,
    'la respuesta trae ya_estaba y nadie la mira');
  /* El texto lo escribe el servidor, que es quien sabe de qué boleta habla.
     Una segunda redacción aquí se separaría de aquélla. */
  assert.match(SRC, /mensajeServidor: res\.mensaje/);
});

test('el título y el texto cambian, y el del organizador no manda en este caso', () => {
  /* `confirmacion_titulo` lo escribe quien organiza para el registro normal.
     Usarlo aquí diría «¡Gracias por inscribirte!» a alguien que no acaba de
     inscribirse, que es justo lo que confunde. */
  const trozo = SRC.slice(SRC.indexOf("ticket.yaEstaba"), SRC.indexOf("ticket.yaEstaba") + 1400);
  assert.match(trozo, /Ya estabas registrado/);
  assert.match(trozo, /ticket\.mensajeServidor \|\|/, 'sin respaldo si el servidor no manda texto');
});
