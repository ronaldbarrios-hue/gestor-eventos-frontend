/* El doble toque: dos peticiones donde tenía que haber una.
 *
 * ── Por qué `disabled` no basta ──────────────────────────────────────────
 *
 * Lo normal es escribir `setWorking(true)` y `disabled={working}`. Eso deja
 * el botón inservible… cuando React vuelve a pintar. Dos toques dentro del
 * mismo fotograma —lo que pasa en un móvil con mala cobertura y un botón que
 * tarda en responder— entran los DOS antes de ese repintado, porque los dos
 * leen el mismo `working: false`.
 *
 * Lo que sale de ahí no es un error en pantalla, que sería lo de menos:
 *
 *   · dos boletas para la misma persona, y en un tipo con cupo dos sitios
 *     ocupados;
 *   · dos puestos en la lista de espera para quien se apuntó una vez;
 *   · dos inscripciones a un taller de quince plazas;
 *   · los puntos de un stand sumados dos veces — y ahí ni siquiera hace falta
 *     un dedo: el lector de códigos apuntando a una pulsera dispara varias
 *     lecturas seguidas del mismo QR.
 *
 * ── El arreglo ───────────────────────────────────────────────────────────
 *
 * Un `useRef`. Cambia en el acto, sin esperar a que React pinte, así que la
 * segunda llamada ya lo encuentra puesto. El `disabled` se queda: es lo que
 * la persona VE. Uno pinta y el otro impide.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (f) => readFileSync(f, 'utf8').replace(/\r/g, '');

/* Cada sitio que CREA algo desde una pantalla pública, con el nombre de la
   función que sale a la red. Añadir una fila aquí obliga a poner el cerrojo. */
const PUERTAS = [
  ['src/pages/public/EventoPublicoPage.jsx',      'enviando',    2, 'la compra y la lista de espera'],
  ['src/pages/public/InscripcionSesionModal.jsx', 'enviando',    1, 'la inscripción a un sub-evento'],
  ['src/pages/public/ExpositorPage.jsx',          'registrando', 1, 'los puntos de un stand'],
];

for (const [archivo, ref, cuantos, queEs] of PUERTAS) {
  test(`${queEs}: el cerrojo del doble toque sigue puesto`, () => {
    const src = leer(archivo);

    const declara = [...src.matchAll(new RegExp(`const ${ref} = useRef\\(false\\)`, 'g'))].length;
    assert.equal(declara, cuantos,
      `${archivo}: se esperaban ${cuantos} cerrojo(s) \`${ref}\` y hay ${declara}`);

    const cierra = [...src.matchAll(new RegExp(`${ref}\\.current = true`, 'g'))].length;
    assert.equal(cierra, cuantos, `${archivo}: hay un cerrojo declarado que no se echa`);

    const abre = [...src.matchAll(new RegExp(`${ref}\\.current = false`, 'g'))].length;
    assert.equal(abre, cuantos,
      `${archivo}: un cerrojo que no se suelta deja el formulario muerto tras el primer fallo`);

    /* Comprobarlo ANTES de echarlo, y no al revés. */
    assert.match(src, new RegExp(`if \\(([^)]*\\|\\| )?${ref}\\.current[^)]*\\) return;\\s*\\n\\s*${ref}\\.current = true;`),
      `${archivo}: el cerrojo se echa sin mirar antes si ya estaba echado, que es no tener cerrojo`);
  });
}

test('soltarlo va en el `finally`, no en el camino feliz', () => {
  /* Soltarlo sólo cuando todo sale bien deja el botón muerto para siempre en
     cuanto haya un fallo de red: la persona no puede reintentar y no entiende
     por qué. */
  for (const [archivo, ref] of PUERTAS) {
    const src = leer(archivo);
    for (const m of src.matchAll(new RegExp(`${ref}\\.current = false`, 'g'))) {
      const antes = src.slice(Math.max(0, m.index - 120), m.index);
      assert.match(antes, /finally\s*\{/,
        `${archivo}: se suelta el cerrojo fuera del \`finally\`; un error de red dejaría el botón muerto`);
    }
  }
});
