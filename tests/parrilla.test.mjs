/* La parrilla de la rueda: horas × mesas.
 *
 * Lo que se protege aquí son tres decisiones que, si se pierden, no fallan —
 * dejan la parrilla enseñando algo que no es verdad, que es como falla este
 * proyecto.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const P = 'src/pages/events/tabs/ParrillaRueda.jsx';
const API = 'src/api/networking.js';
const TAB = 'src/pages/events/tabs/NetworkingTab.jsx';

const leer = (p) => readFileSync(p, 'utf8');
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('la parrilla tiene quien la enseñe', () => {
  /* Las rutas existían y no las llamaba nadie: quien organiza tenía el poder de
     mover citas y ninguna pantalla desde donde hacerlo. */
  const tab = sinComentarios(leer(TAB));
  assert.match(tab, /<ParrillaRueda/, 'la parrilla no está montada en ninguna pestaña');
  assert.match(tab, /useState\(soyOwner \? 'parrilla'/,
    'quien organiza no entra por la parrilla: el día del evento es lo primero que se mira');
});

test('el estado sale de las citas, no sólo del esqueleto', () => {
  /* `admin` sólo pega encima las citas CONFIRMADAS. Construir el tablero sólo
     con él dejaría una casilla pedida pintada como libre, y alguien sentaría a
     otra persona encima de una solicitud sin verla. */
  const src = sinComentarios(leer(P));
  assert.match(src, /networkingApi\.admin\(evento\.id\)/, 'no se pide el esqueleto de mesas y franjas');
  assert.match(src, /networkingApi\.citas\(evento\.id\)/, 'no se piden las citas: las pedidas se verían libres');
});

test('una cancelada no bloquea la casilla', () => {
  /* El servidor deja reservar encima de una cancelada. Pintarla ocupada haría
     que el equipo no usara un hueco que sí existe. */
  const src = sinComentarios(leer(P));
  assert.match(src, /if \(c\.estado === 'cancelada'\) continue;/,
    'las canceladas siguen ocupando su casilla');
});

test('el 409 llega con su mensaje, no como «algo falló»', () => {
  /* Soltar a alguien en una casilla ocupada es normal al reorganizar. Si se
     leyera como un error de la aplicación, quien está moviendo la parrilla el
     día del evento deja de tocarla creyendo que la rompió. */
  const src = sinComentarios(leer(P));
  assert.match(src, /toastErr\(e\.message \|\| 'No se pudo\.'\)/,
    'se descarta el mensaje del servidor y se enseña uno genérico');
});

test('la nota del equipo se escribe, y no pisa la de quien asistió', () => {
  /* La columna existía desde el principio y no la escribía nadie porque no
     había dónde. Son de dueños distintos: la del equipo antes, para preparar;
     la de la persona después, sobre lo que pasó. */
  const src = sinComentarios(leer(P));
  assert.match(src, /nota_gestor: nota/, 'no hay forma de guardar la nota del equipo');
  assert.doesNotMatch(src, /\{ notas: nota/,
    'la nota del equipo se está escribiendo encima de la de quien asistió');
});

test('sentar y mover existen en la API', () => {
  const src = sinComentarios(leer(API));
  for (const f of ['citas ', 'tocarCita ', 'sentar ']) {
    assert.ok(src.includes(f), `falta \`${f.trim()}\` en la API de networking`);
  }
});

test('un doble toque no pide dos veces la misma cita', () => {
  /* `busy` deshabilita el botón cuando React pinta, y dos toques en el mismo
     fotograma entran los dos. Aquí eso son dos citas de la misma persona, o un
     409 gratuito sobre su propia reserva. */
  const src = readFileSync('src/pages/events/tabs/NetworkingTab.jsx', 'utf8').replace(/\r/g, '');
  assert.match(src, /const reservando = useRef\(false\);/, 'falta el cerrojo del doble toque');
  assert.match(src, /if \(reservando\.current\) return;\s*\n\s*reservando\.current = true;/,
    'el cerrojo se echa sin mirar antes si ya estaba echado');
  assert.match(src, /reservando\.current = false;/, 'el cerrojo no se suelta: el botón quedaría muerto');
});

test('si la casilla ya no está libre, la lista se recarga', () => {
  /* Sin esto el mismo botón sigue en pantalla invitando a volver a intentarlo
     y a recibir el mismo error: la lista que se está mirando está vieja. */
  const src = readFileSync('src/pages/events/tabs/NetworkingTab.jsx', 'utf8').replace(/\r/g, '');
  assert.match(src, /if \(e\.response\?\.status === 409\) cargar\(\);/,
    'un 409 al reservar deja la lista vieja en pantalla');
});
