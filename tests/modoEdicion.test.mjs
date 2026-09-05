/* El editor de la página: lo que se veía raro, y por qué.
 *
 * ── Tres cosas concretas ─────────────────────────────────────────────────
 *
 * · La lista de secciones recortaba los nombres: «Título del eve…»,
 *   «Información (f…», «Gana puntos y…». Esa lista sirve para ORDENAR
 *   secciones, y no se puede ordenar lo que no se lee.
 * · Cada sección llevaba un botón `</>`, que en este mismo editor significa
 *   otra cosa —el modo desarrollador es `{ }`—. Ahí `</>` exportaba. Dos
 *   glifos de código con dos significados en la misma pantalla es pedir que se
 *   pulse el equivocado.
 * · Quitar una sección sólo aparecía al pasar el ratón. En una tableta no hay
 *   ratón que pasar: no se podía quitar nada.
 *
 * Y una que no es del editor sino de lo que dice: cinco textos mandaban a
 * «Editar info administrativa», que no existe en ninguna parte del panel.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const BUILDER = 'src/pages/events/editor/ExperienceBuilder.jsx';
const BLOCKS = 'src/pages/events/editor/blocks.jsx';
const WS = 'src/pages/events/workspace/EventWorkspace.jsx';
const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');
const sinComentarios = (src) => src
  .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('los nombres de las secciones se leen enteros', () => {
  const src = sinComentarios(leer(BUILDER));
  assert.match(src, /w-\[260px\]/, 'la columna volvió a estrecharse');
  /* El nombre envuelve en vez de recortarse. */
  assert.doesNotMatch(src, /flex-1 py-2 text-\[12\.5px\] truncate/,
    'el nombre de la sección vuelve a recortarse con puntos suspensivos');
});

test('exportar una sección no se disfraza de código', () => {
  const src = sinComentarios(leer(BUILDER));
  assert.doesNotMatch(src, /\{'<\/>'\}/,
    'volvió el `</>` al lado de cada sección, que aquí significa exportar');
  assert.match(src, /aria-label="Exportar esta sección para otra web"/,
    'el botón de exportar dejó de decir qué hace');
});

test('quitar una sección funciona sin ratón', () => {
  /* El editor se usa también en tableta. `opacity-0 group-hover` deja el botón
     invisible e inalcanzable ahí. */
  const src = sinComentarios(leer(BUILDER));
  const i = src.indexOf('aria-label="Quitar"');
  assert.ok(i > 0, 'no encuentro el botón de quitar');
  const zona = src.slice(i, i + 200);
  assert.doesNotMatch(zona, /opacity-0 group-hover:opacity-100/,
    'quitar una sección vuelve a depender de pasar el ratón por encima');
});

test('lo que se dice manda a un sitio que existe', () => {
  /* «Editar info administrativa» es un nombre de una versión anterior: quien lo
     lea va a buscarlo por el panel y no lo va a encontrar. */
  const blocks = leer(BLOCKS);
  const menciones = [...sinComentarios(blocks).matchAll(/info administrativa/gi)];
  assert.equal(menciones.length, 0,
    'quedan textos que mandan a «Editar info administrativa», que no existe');

  /* Y el sitio nuevo tiene que existir de verdad: Configuración → General, con
     su botón «Editar información completa». */
  assert.match(blocks, /Configuración → General → «?Editar información completa»?/,
    'los textos dejaron de decir dónde se hace');
  const ws = leer(WS);
  assert.match(ws, /id: 'configuracion', label: 'Configuración'/, 'la sección Configuración cambió de nombre');
  assert.match(ws, /id: 'general',\s*label: 'General'/, 'la pestaña General cambió de nombre');
  assert.match(ws, /Editar información completa/, 'el botón al que mandan los textos ya no se llama así');
});
