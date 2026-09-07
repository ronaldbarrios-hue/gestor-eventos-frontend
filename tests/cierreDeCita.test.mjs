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

const { sePuedeCerrar, resumenDeCitas, informeCSV, PLAZOS, RESULTADOS, agendasPorParticipante } =
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

test('la agenda se agrupa por persona, no por mesa', () => {
  /* La mesa ya la tiene la parrilla. Lo que falta es el papel que se le
     entrega a cada empresa con SUS horas. */
  const agendas = agendasPorParticipante([
    { id: '1', estado: 'confirmada', persona: { email: 'ana@x.co' },
      horario: { inicio: '2026-09-17T15:00:00Z', expositor: { nombre: 'Mesa B' } } },
    { id: '2', estado: 'confirmada', persona: { email: 'ana@x.co', nombre: 'Ana Ruiz' },
      horario: { inicio: '2026-09-17T14:00:00Z', expositor: { nombre: 'Mesa A' } } },
    { id: '3', estado: 'confirmada', persona: { email: 'beto@x.co', nombre: 'Beto' },
      horario: { inicio: '2026-09-17T14:20:00Z', expositor: { nombre: 'Mesa C' } } },
  ]);

  assert.equal(agendas.length, 2);
  assert.deepEqual(agendas.map(a => a.nombre), ['Ana Ruiz', 'Beto']);
  /* En orden de hora: una agenda desordenada no se puede seguir. */
  assert.deepEqual(agendas[0].citas.map(c => c.horario.expositor.nombre), ['Mesa A', 'Mesa B']);
});

test('el nombre gana al correo aunque llegue en la segunda cita', () => {
  /* La misma persona puede llegar con nombre en una cita y sólo con correo en
     otra —una la reservó ella, la otra se la puso el equipo—. La agenda no
     puede salir a nombre de un correo si en algún sitio hay un nombre. */
  const [a] = agendasPorParticipante([
    { id: '1', estado: 'confirmada', persona: { email: 'ana@x.co' }, horario: { inicio: '2026-09-17T14:00:00Z' } },
    { id: '2', estado: 'confirmada', persona: { email: 'ana@x.co', nombre: 'Ana Ruiz' }, horario: { inicio: '2026-09-17T15:00:00Z' } },
  ]);
  assert.equal(a.nombre, 'Ana Ruiz');
});

test('una cancelada no entra en la agenda; una pedida sí', () => {
  /* Una agenda es lo que hay que hacer, no lo que se deshizo. Y una cita
     pedida todavía puede caerse: quien la recibe tiene que saberlo. */
  const [a] = agendasPorParticipante([
    { id: '1', estado: 'cancelada',  persona: { email: 'ana@x.co' }, horario: { inicio: '2026-09-17T14:00:00Z' } },
    { id: '2', estado: 'solicitada', persona: { email: 'ana@x.co' }, horario: { inicio: '2026-09-17T15:00:00Z' } },
  ]);
  assert.equal(a.citas.length, 1);
  assert.equal(a.citas[0].estado, 'solicitada');
});

test('quien no se pudo identificar no desaparece', () => {
  /* Descartarla haría que la suma de agendas no cuadrara con la parrilla, y
     nadie sabría que esa casilla está ocupada por alguien sin datos. */
  const agendas = agendasPorParticipante([
    { id: '1', estado: 'confirmada', persona: null, horario: { inicio: '2026-09-17T14:00:00Z' } },
  ]);
  assert.equal(agendas.length, 1);
  assert.equal(agendas[0].nombre, 'Sin identificar');
});

test('la parrilla y las agendas se pueden imprimir', () => {
  /* El día del evento hay una copia en papel en la entrada: el wifi de un
     recinto no es algo con lo que se pueda contar. */
  const parrilla = readFileSync('src/pages/events/tabs/ParrillaRueda.jsx', 'utf8').replace(/\r/g, '');
  assert.match(parrilla, /window\.print\(\)/, 'la parrilla dejó de poder imprimirse');
  assert.match(parrilla, /@page \{ size: landscape/, 'la parrilla sale en vertical y se parte por columnas');
  /* `visibility` y no `display`: con `display:none` el navegador recalcula el
     ancho de la tabla y parte la última columna a otra hoja. */
  assert.match(parrilla, /body \* \{ visibility: hidden !important; \}/);

  const tab = readFileSync(TAB, 'utf8').replace(/\r/g, '');
  assert.match(tab, /#agendas-print \.agenda \{ break-after: page/,
    'las agendas dejaron de salir una por hoja: no se pueden recortar y entregar');
});
