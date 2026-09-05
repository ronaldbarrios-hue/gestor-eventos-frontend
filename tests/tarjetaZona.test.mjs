/* La tarjeta de una zona: que quepa y que no deje huecos.
 *
 * ── Lo que pasaba ────────────────────────────────────────────────────────
 *
 * La fila de edición era UNA línea que no envolvía, con tres anchos fijos
 * dentro: el tipo (128 px), el aforo (80) y el borrar (32), más los huecos —
 * unos 260 px sólo de lo fijo. En una pantalla estrecha, o con la ficha de una
 * zona abierta al lado, el nombre se quedaba sin sitio y el resto se salía de
 * la tarjeta.
 *
 * Y el pie tenía el enlace «Ver zona →» empujado con `ml-auto` entre hermanos
 * que envuelven: en cuanto el resumen no cabía en una línea —una zona con
 * actividades, stands y aviso de plano—, el enlace se iba solo a un renglón
 * pegado a la derecha y quedaba un hueco a media tarjeta.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ZONAS = 'src/pages/events/workspace/espacio/ZonasSection.jsx';
const leer = () => readFileSync(ZONAS, 'utf8').replace(/\r/g, '');
const sinComentarios = (src) => src
  .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('la fila de edición envuelve en vez de salirse', () => {
  const src = sinComentarios(leer());
  assert.match(src, /<div className="flex flex-wrap items-center gap-2\.5">/,
    'la fila volvió a ser una sola línea que no envuelve: con poco ancho se sale de la tarjeta');
  /* Y el nombre tiene un mínimo: sin él, envolver no sirve de nada porque el
     nombre se encoge hasta desaparecer antes de que nada baje de línea. */
  assert.match(src, /placeholder="Nombre de la zona"[\s\S]{0,160}min-w-\[9rem\]/,
    'el nombre volvió a poder encogerse hasta desaparecer');
});

test('el enlace no se queda solo en un renglón', () => {
  const src = sinComentarios(leer());
  assert.doesNotMatch(src, /className="ml-auto text-primary-light"/,
    'el enlace volvió a empujarse con `ml-auto` entre hermanos que envuelven');
  assert.match(src, /flex items-start justify-between gap-3 mt-2\.5/,
    'el resumen y el enlace dejaron de ser dos cajas: el pie vuelve a dejar huecos');
  assert.match(src, /text-primary-light flex-shrink-0 whitespace-nowrap/,
    '«Ver zona →» puede partirse en dos líneas');
});

test('el campo del aforo dice qué es sin depender del ancho', () => {
  /* El `placeholder` es lo único que lo identifica, y un placeholder recortado
     —«Aforc»— no identifica nada. La etiqueta accesible no depende del ancho. */
  const src = sinComentarios(leer());
  assert.match(src, /aria-label="Aforo máximo de la zona"/,
    'el campo del aforo se queda sin nombre cuando el placeholder no cabe');
});
