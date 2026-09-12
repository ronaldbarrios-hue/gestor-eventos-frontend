/* El panel dice la verdad sobre si una actividad sale en el mapa.
 *
 * ── La frase falsa ───────────────────────────────────────────────────────
 *
 * El formulario de actividad decía, cuando no había zona elegida:
 *
 *     «Sin zona, esta actividad no sale en el plano ni en la ficha de
 *      ninguna zona.»
 *
 * Es falso, y se vio con datos reales: el Game JAM de FESTECH no tiene
 * `zona_id`, sale en la ficha de «Universidad Cooperativa», y sus 16 inscritos
 * con él.
 *
 * Sale por un respaldo del servidor (`lib/aforoZonas.js`): sin `zona_id`,
 * engancha la actividad a la zona cuyo NOMBRE coincida con su sala o su track.
 * El respaldo es bueno —hace que el mapa funcione sin configurar nada— pero es
 * invisible, y el panel lo estaba negando.
 *
 * Negarlo cuesta dos cosas: quien lee eso y luego ve la actividad en el mapa
 * deja de creerse los avisos de la pantalla; y quien renombra la zona no tiene
 * forma de saber que está desenganchando una actividad con gente inscrita.
 *
 * ── Y por qué hace falta vigilarlo ───────────────────────────────────────
 *
 * La comparación está escrita DOS veces: en el servidor, que decide si la
 * actividad sale, y en el panel, que dice si va a salir. Si se separan, el
 * aviso vuelve a mentir — sólo que al revés y más difícil de ver.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const raiz = process.cwd();
const FORM = path.join('src', 'pages', 'events', 'tabs', 'agenda', 'SessionForm.jsx');
const src = fs.readFileSync(path.join(raiz, FORM), 'utf8').replace(/\r/g, '');
const sinComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const RAIZ_BACK = path.resolve(raiz, '..', '..', '..', '..', 'gestor-eventos-backend');
const hayBackend = fs.existsSync(RAIZ_BACK);

test('ya no se afirma que sin zona no sale en ninguna parte', () => {
  /* La frase puede quedarse —es cierta cuando NO hay enganche por nombre— pero
     no puede ser lo único que se dice. */
  assert.match(sinComentarios, /enganchePorNombre/,
    'el formulario volvió a negar el enganche por nombre sin comprobarlo');
  assert.match(sinComentarios, /Sale en la ficha de «\{enganchePorNombre\.nombre\}»/,
    'no se dice en qué zona sale');
  /* Y se dice lo que se pierde al renombrar, que es el dato accionable. */
  assert.match(sinComentarios, /si alguien renombra esa zona, esta actividad desaparece/,
    'no se avisa de que renombrar la zona la desengancha');
});

test('la comparación es la misma que usa el servidor para decidirlo', { skip: hayBackend ? false : 'el backend no está clonado al lado (CI)' }, () => {
  const back = fs.readFileSync(path.join(RAIZ_BACK, 'lib', 'aforoZonas.js'), 'utf8');

  /* El servidor: `igual(a,b)` con recorte y minúsculas de español. */
  assert.match(back, /trim\(\)\.toLocaleLowerCase\('es'\)/,
    'el servidor cambió cómo compara los nombres de zona');
  /* Y el panel, igual. Si una de las dos cambia, este test cae y hay que
     cambiar las dos — que es justo lo que se quiere. */
  assert.match(sinComentarios, /trim\(\)\.toLocaleLowerCase\('es'\)/,
    'el panel compara distinto que el servidor: el aviso mentiría');

  /* Y que el servidor siga mirando los dos campos, en el mismo orden de
     preferencia que el panel enseña. */
  assert.match(back, /igual\(s\.ubicacion, z\.nombre\) \|\| igual\(s\.track, z\.nombre\)/,
    'el servidor ya no engancha por ubicación o track como el panel supone');
});

test('con la zona elegida no se avisa de nada', () => {
  /* El aviso sólo tiene sentido sin `zona_id`: con zona fijada, el enganche no
     depende de ningún texto. */
  assert.match(sinComentarios, /if \(form\.zona_id\) return null;/,
    'se calcula el enganche por nombre aunque ya haya zona elegida');
  assert.match(sinComentarios, /\{!form\.zona_id && \(enganchePorNombre/,
    'el aviso se pinta con la zona ya elegida');
});
