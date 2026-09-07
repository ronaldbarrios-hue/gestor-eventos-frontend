/* Una sola escarapela para todo el evento.
 *
 * ── La decisión ──────────────────────────────────────────────────────────
 *
 * Dentro de un evento NO se emite una boleta por taller. Sería un código más
 * por actividad, y quien llega a la puerta del Encuentro de Mujeres con tres
 * QR en el teléfono no sabe cuál enseñar — ni la persona de la puerta tampoco.
 *
 * La escarapela es UNA. El escáner del taller lee ese mismo QR y busca la
 * inscripción por `ticket_id`, que es como ya funcionaba. Lo que faltaba era
 * decirlo: la inscripción existía en la base y no se veía en ninguna parte.
 *
 * Correr: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (f) => readFileSync(f, 'utf8').replace(/\r/g, '');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('la boleta dice a qué actividades está inscrita', () => {
  const t = leer('src/pages/public/MiTicketPage.jsx');
  assert.match(t, /\(ticket\.actividades \|\| \[\]\)\.length > 0/);
  assert.match(t, /Tus actividades/);
});

test('y dice que no hace falta otro código', () => {
  /* Es la mitad que evita la pregunta en la puerta. */
  assert.match(leer('src/pages/public/MiTicketPage.jsx'),
    /No hace falta otro código: en la puerta de cada actividad se escanea este mismo QR/);
});

test('se distingue lo inscrito de lo ya usado', () => {
  /* «¿Fui a ése?» es una pregunta real en un evento de dos días. */
  assert.match(leer('src/pages/public/MiTicketPage.jsx'), /a\.asistio \? 'Ya entraste'/);
});

test('apuntarse a un taller sin boleta pide el registro del evento', () => {
  /* Sin esto, alguien se apunta a un taller y se queda creyendo que ya está
     adentro — y el día del evento se lo encuentra la persona de la puerta
     principal, no la del taller. */
  const m = leer('src/pages/public/InscripcionSesionModal.jsx');
  assert.match(m, /primero hay que estar registrado en él/);
  assert.match(sinComentarios(m), /onRegistroGeneral/);
});

test('pero no se prohíbe: quien llega directo al taller se registra igual', () => {
  /* En la práctica siempre aparece, y si no se le puede registrar el conteo
     miente. Se pide lo que falta y se dice por qué; no se cierra la puerta. */
  const m = leer('src/pages/public/InscripcionSesionModal.jsx');
  assert.match(m, /el equipo te registra igual/);
  /* Los campos de nombre y correo siguen existiendo debajo del aviso. */
  const i = m.indexOf('primero hay que estar registrado');
  assert.ok(m.indexOf('Nombre completo *', i) > i, 'el camino sin boleta desapareció');
});

test('la agenda pública sabe a dónde mandar a registrarse', () => {
  const a = sinComentarios(leer('src/pages/public/AgendaPublicaPage.jsx'));
  assert.match(a, /onRegistroGeneral=\{\(\) => \{ window\.location\.href = `\/explorar\/\$\{slug\}`; \}\}/);
});

test('desde la confirmación no se pide registro: ya lo tiene', () => {
  /* Ahí la boleta acaba de emitirse. Un aviso de «regístrate primero» delante
     de quien acaba de registrarse es el peor momento posible. */
  const p = leer('src/pages/public/EventoPublicoPage.jsx');
  const i = p.indexOf('<InscripcionSesionModal');
  const bloque = p.slice(i, i + 700);
  assert.doesNotMatch(bloque, /onRegistroGeneral/);
  assert.match(bloque, /boleta=\{\{ codigo: ticket\.codigo/);
});
