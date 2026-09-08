/* Un botón que lleva a UN sub-evento, no sólo a la entrada del evento.
 *
 * ── Lo que faltaba ───────────────────────────────────────────────────────
 *
 * El widget construía su iframe con `/embed/<slug>/registro` escrito a mano.
 * O sea: la única puerta que se podía pegar en otra web era la entrada
 * principal. Un taller con su propio formulario, una rueda de negocios, una
 * batalla de pitch — existen, tienen cupo, tienen preguntas propias, y no
 * había forma de enlazarlos desde fuera. La agenda entera sí; una actividad
 * concreta no.
 *
 * No hace falta pantalla nueva: la agenda pública ya sabe inscribir y ya pinta
 * el formulario propio de cada sesión. Lo que faltaba era poder apuntarle.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { WIDGET_OPCIONES, widgetSnippet, atributosDe } from '../src/lib/embed.js';
import { nuevoBoton } from '../src/lib/botonesDeRegistro.js';

const leer = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const WIDGET = leer('public/widget.js');
const AGENDA = leer('src/pages/public/AgendaPublicaPage.jsx');
const PANEL  = leer('src/pages/events/workspace/PublicacionSection.jsx');

test('el código que se copia puede llevar un sub-evento', () => {
  const cod = widgetSnippet({ origin: 'https://g.co', slug: 'festech2026', sesion: 'ses-9' });
  assert.match(cod, /data-sesion="ses-9"/);
});

test('y el widget lo convierte en la agenda acotada a esa sesión', () => {
  assert.match(WIDGET, /sesion\s*:\s*dato\(el, 'sesion', ''\)/);
  assert.match(WIDGET, /cfg\.sesion \? 'agenda' : 'registro'/);
  assert.match(WIDGET, /'&sesion=' \+ encodeURIComponent\(cfg\.sesion\)/);
});

test('la agenda entiende ?sesion= y se acota a esa', () => {
  assert.match(AGENDA, /params\.get\('sesion'\)/);
  assert.match(AGENDA, /const enfocada = sesionUrl \? sessions\.find/);
  assert.match(AGENDA, /sesionesDelDia = enfocada \? \[enfocada\]/);
});

test('un id que ya no existe cae a la agenda entera, no a una pantalla vacía', () => {
  /* Es la misma regla que la boleta agotada: un botón viejo pegado en la web
     de otro no puede convertirse en una puerta cerrada. */
  assert.match(AGENDA, /sessions\.find\(s => String\(s\.id\) === sesionUrl\) \|\| null/);
});

test('y hay salida al resto del evento', () => {
  /* Quien llega por el botón de un taller no tiene por dónde enterarse de que
     hay veinte actividades más. */
  assert.match(AGENDA, /Ver todo lo que pasa en el evento/);
});

test('la inscripción no se duplicó al acotar', () => {
  /* Escribí primero una pantalla aparte, y llevaba su propia copia del modal
     —con `onInscrito` de otra forma y sin `onRegistroGeneral`, o sea sin la
     salida para quien llega sin boleta del evento. Es exactamente cómo se
     separan las cosas en esta base. */
  const usos = AGENDA.split('<InscripcionSesionModal').length - 1;
  assert.equal(usos, 1, 'hay dos copias del modal de inscripción');
  assert.match(AGENDA, /onRegistroGeneral=/);
});

test('el panel deja elegir el sub-evento en el mismo sitio que la boleta', () => {
  assert.match(PANEL, /Inscripción a una actividad/);
  assert.match(PANEL, /requiere_inscripcion/);
});

test('boleta y sesión no se pueden elegir a la vez', () => {
  /* Son dos destinos. Con los dos puestos, uno se ignoraría en silencio y el
     botón abriría algo distinto de lo que dice el panel. */
  assert.match(PANEL, /\{ sesion: v\.slice\(2\), boleta: '' \}/);
  assert.match(PANEL, /\{ sesion: '', boleta: v \}/);
});

test('un botón de sub-evento se guarda y vuelve entero', () => {
  assert.ok(WIDGET_OPCIONES.some(o => o.clave === 'sesion'));
  const b = nuevoBoton({ nombre: 'Taller de pitch', sesion: 'ses-9', color: '#111' });
  assert.equal(b.sesion, 'ses-9');
  const cod = widgetSnippet({ origin: 'https://g.co', slug: 'x', ...b });
  assert.match(cod, /data-sesion="ses-9"/);
});

test('sin sub-evento el atributo no ensucia el código de nadie', () => {
  assert.ok(!atributosDe({}).some(a => a.attr === 'sesion'));
});
