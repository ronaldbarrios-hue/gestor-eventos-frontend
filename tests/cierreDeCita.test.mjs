/* El cierre de la reunión, en la pantalla de quien asistió.
 *
 * ── Qué se protege ───────────────────────────────────────────────────────
 *
 * Esto es lo que convierte una agenda en un informe. Y se rellena en el peor
 * sitio: de pie, entre dos mesas, con la siguiente reunión empezando. Si se
 * pierde, no se reconstruye — a la semana siguiente nadie recuerda cuánto
 * esperaba de la reunión de las 10:15.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const TAB = 'src/pages/events/tabs/NetworkingTab.jsx';
const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

const { sePuedeCerrar, resumenDeCitas, informeCSV, PLAZOS, RESULTADOS } =
  await import('../src/lib/cierreDeCita.js');

const enHoras = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

test('no se pregunta por una reunión que todavía no ha pasado', () => {
  /* «¿Se realizó?» antes de que empiece no tiene respuesta, y en una rueda con
     quince citas por delante ensucia la única pantalla que se mira entre mesa
     y mesa. */
  assert.equal(sePuedeCerrar({ estado: 'confirmada', horario: { fin: enHoras(2) } }), false);
  assert.equal(sePuedeCerrar({ estado: 'confirmada', horario: { fin: enHoras(-0.5) } }), true);
});

test('una cita cancelada no se cierra', () => {
  /* Se canceló antes: no tiene resultado que registrar. */
  assert.equal(sePuedeCerrar({ estado: 'cancelada', horario: { fin: enHoras(-2) } }), false);
});

test('la que acaba «ahora mismo» ya se puede cerrar', () => {
  /* El reloj del móvil y el del servidor no coinciden al segundo, y se cierra
     de camino a la siguiente mesa. Por eso hay margen. */
  assert.equal(sePuedeCerrar({ estado: 'confirmada', horario: { fin: enHoras(-0.01) } }), true);
});

test('sin hora, decide la persona', () => {
  assert.equal(sePuedeCerrar({ estado: 'confirmada', horario: {} }), true);
});

test('el resumen no reparte lo que nadie registró', () => {
  const r = resumenDeCitas([
    { estado: 'confirmada', resultado: 'realizada', expectativa_monto: 2000, expectativa_moneda: 'COP', hubo_acuerdo: true },
    { estado: 'confirmada', resultado: 'no_asistio' },
    { estado: 'confirmada' },
    { estado: 'cancelada' },
  ]);
  assert.equal(r.agendadas, 3);
  assert.equal(r.sin_registrar, 1, '«nadie lo registró» se está contando como «no ocurrió»');
  assert.equal(r.efectividad, 50, 'la efectividad se calcula sobre el total en vez de sobre lo registrado');
  assert.deepEqual(r.expectativa_por_moneda, { COP: 2000 });
});

test('sin nada cerrado, la efectividad no es cero', () => {
  assert.equal(resumenDeCitas([{ estado: 'confirmada' }]).efectividad, null,
    '0 % diría que ninguna reunión ocurrió, y eso no se sabe');
});

test('el CSV distingue «no» de «no se registró»', () => {
  /* Un informe que escribe «No» donde nadie contestó es un informe que miente
     en la dirección que más duele. */
  const csv = informeCSV([
    { estado: 'confirmada', resultado: 'realizada', hubo_acuerdo: false,
      horario: { inicio: '2026-09-17T14:00:00Z', expositor: { nombre: 'Mesa A', stand: 'A1' } },
      persona: { nombre: 'Ana', email: 'ana@x.co' } },
    { estado: 'confirmada',
      horario: { inicio: '2026-09-17T14:20:00Z', expositor: { nombre: 'Mesa B' } }, persona: null },
  ], 'Rueda CCI');

  assert.ok(csv.startsWith('\ufeff'), 'sin BOM, Excel rompe las tildes del informe');
  assert.match(csv, /"Rueda CCI";[^\n]*"Mesa A";"A1";"";"Ana";"ana@x\.co";"confirmada";"Sí, nos reunimos";"";"";"";"No";""/);
  /* La segunda: sin resultado y sin acuerdo, las dos celdas VACÍAS. */
  assert.match(csv, /"Mesa B";"";"";"";"";"confirmada";"";"";"";"";"";""/);
});

test('los plazos son una lista cerrada y con etiqueta legible', () => {
  /* Un campo libre acabaría con «3 meses», «tres meses» y «3m» en la misma
     columna del informe. */
  assert.deepEqual(PLAZOS.map(p => p.id), ['inmediato', '3_meses', '6_meses', '12_meses']);
  assert.deepEqual(RESULTADOS.map(r => r.id), ['realizada', 'no_asistio']);
});

test('cerrar la reunión no puede borrar la nota', () => {
  /* Son dos cosas distintas escritas en momentos distintos: la nota durante la
     reunión, el cierre al acabar. Se mandan por separado y sólo las claves que
     cambian. */
  const src = leer(TAB);
  assert.match(src, /networkingApi\.cerrarCita\(evento\.id, cita\.id, cambios\)/,
    'el cierre dejó de mandar sólo lo que cambia');
  assert.doesNotMatch(src, /cerrarCita\([^)]*notas:/,
    'el cierre volvió a mandar las notas: las pisaría con lo que tuviera en memoria');
});

test('un fallo al cerrar se dice', () => {
  /* Un cierre perdido no se reconstruye: nadie se acuerda a la semana
     siguiente de cuánto esperaba de la reunión de las 10:15. */
  const src = leer(TAB);
  assert.match(src, /No se pudo guardar\. Vuelve a intentarlo\./,
    'el cierre puede fallar en silencio');
});

test('la expectativa sólo se pregunta si hubo reunión', () => {
  /* Preguntarle a quien marcó «no asistió» cuánto negocio espera es pedirle
     que se invente un número. */
  const src = leer(TAB);
  assert.match(src, /\{realizada && \(/,
    'se pide la expectativa aunque la reunión no haya ocurrido');
});
