/* Publicar sin una sola forma de inscribirse.
 *
 * ── El caso, y es real ───────────────────────────────────────────────────
 *
 * FESTECH ESPINAL está publicado ahora mismo con la página completa
 * —descripción, galería, «cómo llegar»— y cero tipos de boleta activos. Los
 * únicos botones son «Compartir» y «¿Ya te registraste? Ver mi entrada», que
 * además da a entender que el registro existe en alguna parte.
 *
 * Quien lee la página entera y se decide no encuentra qué pulsar, y lo que
 * concluye es que está rota.
 *
 * ── Las dos mitades ──────────────────────────────────────────────────────
 *
 * A quien VISITA se le dice que las inscripciones no están abiertas todavía.
 * Esconder el bloque está bien para un adorno —una galería sin fotos— pero no
 * para la única puerta de entrada.
 *
 * A quien ORGANIZA se le dice al publicar. No se bloquea la publicación: hay
 * motivos legítimos para publicar antes de abrir inscripciones, y decidirlo
 * por él sería pasarse. Lo que faltaba es avisar.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (p) => readFileSync(p, 'utf8');

test('sin boletas, a quien visita se le dice — no se le esconde', () => {
  const src = leer('src/pages/events/editor/blocks.jsx');
  const i = src.indexOf('function TicketsPreview');
  const cuerpo = src.slice(i, src.indexOf('const dosColumnas', i));
  assert.match(cuerpo, /Las inscripciones todavía no están abiertas/,
    'el bloque de boletas vuelve a desaparecer: la página queda entera y sin dónde inscribirse');
  /* Y sigue siendo la excepción: el resto de bloques vacíos SÍ se esconden. */
  assert.match(cuerpo, /if \(!isEditor\) \{/,
    'se enseña el mismo texto al editor que al visitante: el editor necesita saber que le faltan tipos');
});

test('un evento cancelado sigue sin ofrecer inscripción', () => {
  /* No se puede haber cambiado una cosa por la otra: cancelado va ANTES y
     devuelve null, porque el aviso de cancelación está arriba de la página. */
  const src = leer('src/pages/events/editor/blocks.jsx');
  const i = src.indexOf('function TicketsPreview');
  const cuerpo = src.slice(i, i + 800);
  assert.match(cuerpo, /if \(evento\.cancelado && !isEditor\) return null;[\s\S]*?if \(tickets\.length === 0\)/,
    'el corte por evento cancelado dejó de ir primero');
});

test('al publicar se dice qué falta, y no se bloquea', () => {
  const src = leer('src/pages/events/editor/EstadoPagina.jsx');
  assert.match(src, /const avisos = r\?\.avisos \|\| \[\]/,
    'el editor ya no mira los avisos que manda el servidor al publicar');
  assert.match(src, /Publicado, pero:/,
    'se publica y se dice «Publicado» a secas aunque falte algo');

  const lista = leer('src/pages/events/EventsListPage.jsx');
  assert.match(lista, /Publicado, pero:/,
    'desde la lista de eventos se puede publicar sin enterarse de lo que falta');
});
