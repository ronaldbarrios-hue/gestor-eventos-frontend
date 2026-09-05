/* Los encabezados de las páginas públicas.
 *
 * ── Por qué esto importa aquí y no en el panel ───────────────────────────
 *
 * Estas páginas las encuentra gente por un buscador y las lee gente con lector
 * de pantalla. Un salto de H1 a H3 les dice a los dos que hay una sección por
 * medio que no existe: el lector anuncia un nivel que nadie escribió, y el
 * buscador entiende que el título de la tarjeta cuelga de algo que no está.
 *
 * Medido en la agenda de un evento real: los días son pestañas —botones, no
 * encabezados—, así que debajo del título de la página no hay ningún nivel
 * intermedio y cada sesión saltaba directa a H3.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = (d) => readdirSync(d).filter(f => f.endsWith('.jsx')).map(f => `${d}/${f}`);
const PUBLICAS = [...dir('src/pages/public'), ...dir('src/components/public')];

/* Un archivo con H3 y sin ningún H2 salta seguro: no hay forma de que el nivel
   intermedio aparezca. Con H2 presente ya depende de qué rama se pinte, y eso
   no se puede decidir leyendo el archivo — para eso está el navegador. */
test('ninguna pantalla pública salta de H1 a H3', () => {
  const culpables = [];
  for (const f of PUBLICAS) {
    const src = readFileSync(f, 'utf8');
    /* Un diálogo es su propio contexto: su título lo nombra `aria-labelledby`,
       no el esquema de la página que hay detrás. Así que no cuenta como salto
       — pero SÓLO si de verdad se anuncia como diálogo. Un div que se pinta
       encima y no lo dice sigue siendo parte de la página. */
    if (/role="dialog"/.test(src) && /aria-labelledby=/.test(src)) continue;
    const h3 = (src.match(/<h3[\s>]/g) || []).length;
    const h2 = (src.match(/<h2[\s>]/g) || []).length;
    if (h3 > 0 && h2 === 0) culpables.push(`${f} (${h3} H3, ningún H2)`);
  }
  assert.deepEqual(culpables, [],
    `saltan de nivel:\n  ${culpables.join('\n  ')}`);
});

test('el nombre del evento es el H1, y sólo él', () => {
  /* El bloque de título es quien pone el H1 de la página del evento. Si otro
     bloque se pusiera a poner H1 habría dos títulos de página, que para un
     buscador es no tener ninguno. */
  const src = readFileSync('src/pages/events/editor/blocks.jsx', 'utf8');
  const h1 = (src.match(/<h1[\s>]/g) || []).length;
  assert.equal(h1, 1,
    `hay ${h1} H1 en el catálogo de bloques: el título del evento tiene que ser uno solo`);
});
