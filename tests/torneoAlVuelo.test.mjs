/* Crear el torneo sin salir del formulario, y las boletas que se quedaban fuera.
 *
 * ── Los dos huecos ───────────────────────────────────────────────────────
 *
 * 1. Un tipo de boleta que crea equipos tiene que decir a qué torneo, y si el
 *    evento no tiene ninguno el formulario mandaba a otra pestaña. Volver
 *    significaba perder el nombre, el precio y la descripción ya escritos: la
 *    salida real era cancelar y empezar de cero.
 *
 * 2. Quien mete al equipo es un disparador de la base que corre
 *    `AFTER INSERT OR UPDATE OF estado` sobre la boleta. Al pasar un tipo a
 *    «Un equipo» después de haber vendido, las boletas ya pagadas no entran
 *    —su estado ya no cambia— y no hay ningún error que ver. Se descubre el
 *    día de la competencia, contando sillas.
 *
 * Correr: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (f) => readFileSync(f, 'utf8').replace(/\r/g, '');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const TAB = leer('src/pages/events/tabs/TicketsTab.jsx');
const LIMPIO = sinComentarios(TAB);

/* ── 1 · El torneo se crea aquí ───────────────────────────────────────── */

test('el formulario deja crear el torneo sin salir', () => {
  assert.match(LIMPIO, /setCreandoTorneo\(true\)/);
  assert.match(LIMPIO, /<CrearTorneo/);
  /* Y ya no manda a otra pestaña a perder lo escrito. */
  assert.doesNotMatch(LIMPIO, /Crea uno —desde el sub-evento o en la/);
});

test('el torneo recién creado queda elegido', () => {
  /* Crearlo y dejar el desplegable en «¿a qué torneo entra?» sería hacer el
     trabajo y no cerrarlo: el formulario seguiría sin poder guardarse. */
  assert.match(LIMPIO, /setTorneos\(ts => \[\.\.\.ts, nuevo\]\)/);
  assert.match(LIMPIO, /update\('crea_torneo_id', nuevo\.id\)/);
});

test('el atajo NO elige el formato por su cuenta', () => {
  /* Lo hizo, y fue un error caro: el FORMATO de un torneo no se puede cambiar
     después —la ruta sólo deja editar nombre, disciplina, orden y categoría—,
     así que una Batalla de Pitch creada por el atajo nacía como llave de
     eliminación y sin vuelta atrás. Su rúbrica de calificación no aparecía por
     ningún lado porque ese torneo ya no era de jurado. Lo reportó quien lo
     sufrió: «antes me aparecía la rúbrica y ya no».
     Ahora se abre el formulario completo encima, que hace la pregunta que hay
     que hacer una sola vez en la vida del torneo. */
  assert.doesNotMatch(LIMPIO, /formato: FORMATO_AL_VUELO/);
  assert.doesNotMatch(LIMPIO, /formato: 'eliminacion'/);
  assert.match(LIMPIO, /<CrearTorneo/);
  assert.match(LIMPIO, /onCreado=\{torneoCreado\}/);
});

test('y no se pierde lo escrito, que era el problema original', () => {
  /* El formulario del tipo de boleta sigue montado debajo del modal. */
  assert.match(LIMPIO, /\{creandoTorneo && \(/);
  assert.match(TAB, /Esta pantalla sigue montada debajo/);
});

test('se avisa de que el formato no se puede cambiar', () => {
  /* Es la única decisión irreversible del formulario, y quien la toma por
     primera vez no tiene cómo saberlo. */
  assert.match(TAB, /no se puede cambiar después/);
  assert.match(TAB, /puntaje por jurado/);
});

/* La prueba que comparaba el formato con la lista del servidor se fue con el
   atajo: ya no se manda ningún formato desde aquí, lo elige quien crea el
   torneo en el formulario de verdad. Una prueba saltada que no va a volver a
   correr es peso muerto que alguien tiene que leer para descubrir que no dice
   nada. */

/* ── 2 · Las boletas que se quedaban fuera ────────────────────────────── */

test('se pregunta cuántas se quedarían fuera, y sólo cuando aplica', () => {
  /* Sobre un tipo que todavía no existe no hay boletas que preguntar, y sobre
     uno que no crea equipos la pregunta no significa nada. */
  assert.match(LIMPIO, /if \(!initial\?\.id \|\| form\.crea !== 'equipo'\) \{ setSueltas\(null\); return; \}/);
  assert.match(LIMPIO, /ticketsApi\.boletasSinEquipo\(eventoId, initial\.id\)/);
});

test('si no se puede preguntar, no se inventa un número', () => {
  /* Decir «0 boletas sueltas» cuando no se sabe es peor que no decir nada:
     deja a alguien tranquilo sobre algo que no se comprobó. */
  assert.match(LIMPIO, /\.catch\(\(\) => \{ if \(vivo\) setSueltas\(null\); \}\)/);
});

test('el aviso sale con el botón que lo arregla, no solo con el susto', () => {
  assert.match(LIMPIO, /sueltas\?\.cuantas > 0 &&/);
  assert.match(LIMPIO, /ticketsApi\.crearEquipos\(eventoId, initial\.id\)/);
  assert.match(TAB, /Meterlas al torneo/);
});

test('después de meterlas el aviso desaparece', () => {
  /* Un aviso que sigue ahí después de resolverlo enseña a ignorar los avisos. */
  assert.match(LIMPIO, /setSueltas\(\{ cuantas: 0, aviso: null \}\)/);
});

/* ── La capa de API ───────────────────────────────────────────────────── */

test('las dos llamadas apuntan a las rutas del servidor', () => {
  const api = sinComentarios(leer('src/api/tickets.js'));
  assert.match(api, /tickets\/\$\{ticketId\}\/boletas-sin-equipo/);
  assert.match(api, /tickets\/\$\{ticketId\}\/crear-equipos/);
});
