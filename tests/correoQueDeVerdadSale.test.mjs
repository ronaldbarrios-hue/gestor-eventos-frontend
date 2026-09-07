/* «Configurado» no es «funciona».
 *
 * ── El fallo ─────────────────────────────────────────────────────────────
 *
 * El diagnóstico que llega con las plantillas dice si las VARIABLES están
 * puestas. Una contraseña equivocada da `configurado: true` y los envíos se
 * descartan en silencio: nadie recibe su boleta y en el panel todo se ve bien.
 *
 * La ruta que lo comprueba de verdad —abre la conexión y hace login— existe
 * desde el primer día y no la llamaba nadie. Su propio comentario daba por
 * hecho un botón «Probar conexión» que nunca se construyó:
 *
 *   «Va bajo bandera porque tarda un segundo y el panel pinta el diagnóstico
 *    al entrar; el botón "Probar conexión" sí la pide.»
 *
 * Ese botón no existía. Es el modo de fallo de siempre, esta vez en un
 * comentario: describe un mundo que nadie construyó, y quien lo lee da la
 * función por hecha.
 *
 * Correr: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (f) => readFileSync(f, 'utf8').replace(/\r/g, '');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('la ruta que comprueba de verdad ya se llama', () => {
  const api = sinComentarios(leer('src/api/emails.js'));
  assert.match(api, /emails\/diagnostico/);
  assert.match(api, /params: \{ verificar: 1 \}/);
});

test('el botón existe y se pulsa, no se dispara al entrar', () => {
  /* Tarda un segundo, y esta pantalla se abre para editar plantillas, no para
     diagnosticar. */
  const s = sinComentarios(leer('src/pages/events/workspace/comercial/EmailsSection.jsx'));
  assert.match(s, /emailsApi\.probarConexion\(evento\.id\)/);
  assert.match(s, /onClick=\{async \(\) => \{/);
  assert.doesNotMatch(s, /useEffect\([^)]*probarConexion/);
});

test('sólo se ofrece cuando hay algo que probar', () => {
  /* Sin credenciales puestas ya sale el aviso rojo de «no sale ningún correo»;
     un botón de probar debajo sería probar la nada. */
  const s = leer('src/pages/events/workspace/comercial/EmailsSection.jsx');
  assert.match(s, /\{diagnostico\?\.configurado && \(/);
});

test('un fallo dice dónde mirar', () => {
  /* El servidor manda una sugerencia —«suele ser el puerto bloqueado»—. Sin
     ella, «no se pudo conectar» manda a revisar todo. */
  const s = leer('src/pages/events/workspace/comercial/EmailsSection.jsx');
  assert.match(s, /!conexion\.ok && conexion\.sugerencia/);
});

test('y se dice por qué hace falta probar', () => {
  /* Un botón sin explicación no se pulsa: quien ve «configurado» da por hecho
     que funciona, que es exactamente el error. */
  const s = leer('src/pages/events/workspace/comercial/EmailsSection.jsx');
  assert.match(s, /una contraseña equivocada se ve igual desde aquí/);
});

test('el comentario del servidor ya no describe algo que no existe', () => {
  const ruta = ['../gestor-eventos-backend/routes/emails.js',
    '../../../../gestor-eventos-backend/routes/emails.js']
    .map(f => resolve(process.cwd(), f)).find(f => existsSync(f));
  if (!ruta) return;   // el backend es otro repositorio; puede no estar al lado
  const r = readFileSync(ruta, 'utf8');
  assert.match(r, /verificar === '1'/, 'la ruta perdió la verificación de verdad');
});
