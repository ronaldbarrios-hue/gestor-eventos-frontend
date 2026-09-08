/* Qué es cada boleta: la entrada al evento, o la puerta de una actividad.
 *
 * ── Lo que se ve hoy ─────────────────────────────────────────────────────
 *
 * En FESTECH hay cuatro tipos —«Registro Festech 2026» (277/7000), el
 * encuentro de mujeres, el DemoDay y la batalla de pitch— y las cuatro tarjetas
 * se ven idénticas. Sólo quien montó el evento sabe cuál es la puerta de
 * entrada, y eso importa: la principal es la que se agota contra el aforo del
 * recinto y la que hay que tener antes de apuntarse a nada.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const leer = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const TAB = leer('src/pages/events/tabs/TicketsTab.jsx');
const FORM = leer('src/pages/events/tabs/agenda/SessionForm.jsx');

test('la etiqueta se deriva, no se guarda a mano', () => {
  /* Un `es_principal` guardado se queda viejo en cuanto alguien crea la
     actividad después, o la borra: la etiqueta seguiría diciendo lo de antes,
     y sin fallar. Sale del vínculo que ya existe desde la 0059. */
  assert.match(sinComentarios(TAB), /ticket\.sesiones \|\| \[\]/);
  assert.doesNotMatch(sinComentarios(TAB), /es_principal|esPrincipal/);
});

test('una boleta sin actividad es la entrada al evento', () => {
  assert.match(TAB, /Entrada al evento/);
});

test('y una con actividad dice a cuál da acceso', () => {
  /* Con el título, no un genérico «sub-evento»: en una lista de cuatro lo útil
     es saber cuál, no que no es la principal. */
  assert.match(TAB, /Da acceso a/);
  assert.match(TAB, /deActividades\[0\]\.titulo/);
  /* Y con varias no se apilan cuatro títulos en una tarjeta. */
  assert.match(TAB, /deActividades\.length\} actividades/);
});

test('el control que crea el vínculo describe el caso que la gente tiene', () => {
  /* Medido: 1 de 15 actividades con boleta ligada. No porque el control falle
     —guarda bien y el servidor lo valida— sino porque se llamaba «Hace falta
     boleta» y su ayuda hablaba sólo de restringir por categoría («VIP, por
     ejemplo»), que es un caso que casi nadie tiene. El que sí: «para esta
     actividad se creó su propia boleta». */
  const f = sinComentarios(FORM);
  assert.match(f, /Con qué boleta se entra/);
  assert.doesNotMatch(f, /Hace falta boleta/);
  assert.match(FORM, /su propia boleta/);
});

test('y se guarda de verdad', () => {
  /* Un control que se pinta y no viaja es el fallo de siempre aquí. */
  const f = sinComentarios(FORM);
  assert.match(f, /ticket_type_id: initial\?\.ticket_type_id \|\| ''/);
  assert.match(f, /ticket_type_id: form\.ticket_type_id \|\| null/);
});
