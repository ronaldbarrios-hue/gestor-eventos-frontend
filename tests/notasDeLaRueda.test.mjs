/* Las notas de la rueda, cuando son muchas.
 *
 * ── El problema ──────────────────────────────────────────────────────────
 *
 * Una rueda son quince o veinte reuniones de veinte minutos, y lo que se
 * escribe entre una y otra es todo lo que queda de ese día. Tres cosas se
 * rompen con el volumen:
 *
 *   · Se pierde. Se guardaba al salir del campo, y en un móvil cambiar de
 *     aplicación no siempre dispara ese evento: la persona escribe, se va a la
 *     siguiente mesa, y la nota no salió nunca.
 *   · No se encuentra. Veinte cajas de texto abiertas son un muro.
 *   · No se usa. El seguimiento se hace al día siguiente, fuera de aquí.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const TAB = 'src/pages/events/tabs/NetworkingTab.jsx';
const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

/* `localStorage` de mentira: el módulo lo usa al importarse en cuanto se
   llama, y sin esto las pruebas del borrador no correrían. */
const almacen = new Map();
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => { almacen.set(k, String(v)); },
  removeItem: (k) => { almacen.delete(k); },
};

const { guardarBorrador, leerBorrador, olvidarBorrador, filtrarCitas, citasComoCSV } =
  await import('../src/lib/notasDeCita.js');

const CITAS = [
  { id: '1', notas: 'quieren gafetes para 500', estado: 'confirmada',
    horario: { inicio: '2026-09-17T14:00:00Z', expositor: { nombre: 'Impresos JM', stand: 'A11' } } },
  { id: '2', notas: null, estado: 'solicitada',
    horario: { inicio: '2026-09-17T14:20:00Z', expositor: { nombre: 'DevUP', stand: 'A12' } } },
  { id: '3', notas: 'seguir con Ana en octubre', estado: 'confirmada',
    horario: { inicio: '2026-09-17T15:00:00Z', expositor: { nombre: 'Café del Tolima', stand: 'C10' } } },
];

test('el borrador sobrevive a lo que se lleva la nota', () => {
  /* La recarga, el cierre, la pestaña muerta por memoria. */
  almacen.clear();
  guardarBorrador('1', 'a medio escribir');
  assert.equal(leerBorrador('1'), 'a medio escribir');
  olvidarBorrador('1');
  assert.equal(leerBorrador('1'), null, 'el borrador sigue ahí después de guardarse en el servidor');
});

test('un borrador vacío no ocupa sitio', () => {
  almacen.clear();
  guardarBorrador('2', 'algo');
  guardarBorrador('2', '');
  assert.equal(leerBorrador('2'), null, 'borrar la nota deja un borrador vacío guardado');
});

test('sin `localStorage` la nota sigue funcionando', () => {
  /* Modo privado, almacenamiento lleno, sitio bloqueado. El borrador es una
     red de seguridad: si falla, no puede tumbar lo que protege. */
  const real = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); }, removeItem() { throw new Error('no'); } };
  assert.equal(guardarBorrador('9', 'x'), false);
  assert.equal(leerBorrador('9'), null);
  assert.doesNotThrow(() => olvidarBorrador('9'));
  globalThis.localStorage = real;
});

test('se busca por empresa, por stand y por lo anotado', () => {
  /* Quien busca escribe «gafetes», no «Gafetes S.A.S.»: sin tildes y sin
     mayúsculas, y también dentro de la nota — que es donde está lo que uno
     recuerda. */
  assert.deepEqual(filtrarCitas(CITAS, { texto: 'devup' }).map(c => c.id), ['2']);
  assert.deepEqual(filtrarCitas(CITAS, { texto: 'A11' }).map(c => c.id), ['1']);
  assert.deepEqual(filtrarCitas(CITAS, { texto: 'gafetes' }).map(c => c.id), ['1'],
    'no se busca dentro de las notas, que es donde está lo que uno recuerda');
  assert.deepEqual(filtrarCitas(CITAS, { texto: 'cafe' }).map(c => c.id), ['3'],
    'la búsqueda distingue tildes: «cafe» no encuentra «Café»');
});

test('«con notas» deja sólo las que tienen algo escrito', () => {
  assert.deepEqual(filtrarCitas(CITAS, { soloConNotas: true }).map(c => c.id), ['1', '3']);
  assert.equal(filtrarCitas(CITAS, {}).length, 3, 'sin filtros se ven todas');
});

test('el CSV lo abre Excel sin romper las tildes', () => {
  const csv = citasComoCSV(CITAS, 'TechNova');
  assert.ok(csv.startsWith('\ufeff'),
    'sin el BOM, Excel abre «Reunión» como «ReuniÃ³n» y la nota queda inservible');
  assert.match(csv, /"Evento";"Fecha y hora";"Con quién";"Stand";"Estado";"Mis notas"/,
    'el separador dejó de ser `;`: Excel en español mete todo en una columna');
  assert.match(csv, /"Impresos JM";"A11";"Confirmada";"quieren gafetes para 500"/);
  assert.match(csv, /"DevUP";"A12";"Pedida";""/, 'una cita pedida se exporta como confirmada');
});

test('una comilla en la nota no parte el archivo', () => {
  /* Alguien escribe: dijo "lo confirmamos el lunes". Sin escapar, esa comilla
     corta la celda y el resto de la fila se lee corrido. */
  const csv = citasComoCSV([{ id: 'x', notas: 'dijo "el lunes"', horario: {} }]);
  assert.match(csv, /"dijo ""el lunes"""/);
});

test('la nota se manda sola, y también al irse de la pantalla', () => {
  const src = leer(TAB);
  assert.match(src, /const t = setTimeout\(guardar, 2000\);/,
    'ya no se guarda solo: vuelve a depender de que el foco salga del campo');
  /* En un móvil esto es lo que de verdad pasa: se cambia de aplicación. */
  assert.match(src, /document\.addEventListener\('visibilitychange', alEsconder\)/,
    'cambiar de aplicación vuelve a perder lo escrito');
  assert.match(src, /window\.addEventListener\('pagehide', alIrse\)/,
    'cerrar la pestaña vuelve a perder lo escrito');
  /* Y se dice si falta algo por guardar: es lo que permite decidir si se puede
     cerrar el móvil. */
  assert.match(src, /pendiente: \{ texto: 'Sin guardar…'/,
    'no se avisa de que hay algo sin guardar');
  assert.match(src, /if \(guardando\.current\) return;/,
    'el temporizador, el blur y el cambio de pestaña pueden escribir tres veces lo mismo');
});
