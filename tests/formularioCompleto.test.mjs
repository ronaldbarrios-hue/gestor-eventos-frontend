/* Lo que se puede configurar en cada formulario.
 *
 * ── El patrón ────────────────────────────────────────────────────────────
 *
 * Las preguntas del evento, de un sub-evento y de un torneo viven en la MISMA
 * tabla, `event_form_fields`, y se distinguen por `session_id` y `torneo_id`.
 * O sea: la base guarda lo mismo para las tres, y el renderizador público es
 * uno solo y las pinta igual.
 *
 * Lo que se había separado eran las PANTALLAS. El editor del evento ofrecía
 * texto de ayuda, grupo, condición y once tipos de pregunta; el compartido de
 * sub-eventos y torneos ofrecía nueve tipos y nada más. No fallaba nada: el
 * control no estaba, y quien lo buscaba concluía que la plataforma no lo hacía.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const leer = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const EDITOR = leer('src/pages/events/tabs/PreguntasSubEvento.jsx');

test('el editor compartido deja escribir el texto de ayuda', () => {
  /* El renderizador público ya lo pintaba —`campo.ayuda`, en los tres
     formularios—. Sólo faltaba dónde escribirlo. */
  assert.match(EDITOR, /onChange\(\{ ayuda: e\.target\.value \}\)/);
  assert.match(EDITOR, /ayuda: c\.ayuda\?\.trim\(\) \|\| null/);
  assert.match(leer('src/components/ui/CampoFormulario.jsx'), /campo\.ayuda &&/);
});

test('y el grupo, con las sugerencias del servidor', () => {
  assert.match(EDITOR, /onChange\(\{ grupo: e\.target\.value \}\)/);
  assert.match(EDITOR, /grupo: c\.grupo\?\.trim\(\) \|\| null/);
  /* Escribible, no un desplegable cerrado: los grupos sugeridos salen de los
     formatos de caracterización de entidades públicas y no sirven para un
     torneo. */
  assert.match(EDITOR, /list=\{`grupos-\$\{campo\._k\}`\}/);
});

test('el grupo se PINTA en los tres formularios públicos, no sólo se guarda', () => {
  /* Sin esto, ofrecer el grupo sería un campo que se llena y no cambia nada —
     peor que no tenerlo, porque quien lo llena cree que hizo algo. */
  for (const f of ['src/pages/public/InscripcionSesionModal.jsx', 'src/pages/public/EquipoTorneoPage.jsx']) {
    assert.match(leer(f), /<CamposAgrupados campos=/, `${f} no agrupa`);
  }
  /* El título sale cuando el grupo CAMBIA: así respeta el orden que puso el
     organizador en vez de reordenar por su cuenta. */
  assert.match(leer('src/components/CamposAgrupados.jsx'), /c\.grupo && c\.grupo !== anterior/);
});

test('los tipos de pregunta los manda el servidor, no una lista de aquí', () => {
  /* Era una lista de nueve escrita a mano, cruzada contra el catálogo: un tipo
     nuevo del servidor no llegaba nunca a este editor. Por eso «Archivo
     adjunto» no se podía elegir en un sub-evento ni en un torneo, aunque la
     base lo guarda, el renderizador lo pinta y la ruta de subida lo autoriza
     desde la 0115. */
  assert.match(EDITOR, /if \(Array\.isArray\(d\.tipos\) && d\.tipos\.length\) setTipos\(d\.tipos\);/);
  assert.doesNotMatch(EDITOR, /TIPOS_PERMITIDOS\s*\n?\s*\.filter\(id => porId\.has\(id\)\)/);
});

test('y el respaldo de mientras carga está completo', () => {
  /* Si se queda corto, el desplegable cambia de opciones al llegar la
     respuesta: alguien elige un tipo y se le mueve debajo. */
  for (const t of ['archivo', 'foto']) {
    assert.ok(EDITOR.includes(`${t}:`), `falta «${t}» en el respaldo`);
  }
});

test('se pueden reordenar antes de guardar, y el orden se manda por posición', () => {
  /* El servidor asigna `orden` por el índice del array (`filaCampo(c, i)`) y
     relee ordenando por él. Así que mover en local y guardar basta. */
  assert.match(EDITOR, /\[copia\[i\], copia\[j\]\] = \[copia\[j\], copia\[i\]\]/);
  assert.match(EDITOR, /aria-label="Subir"/);
  assert.match(EDITOR, /aria-label="Bajar"/);
});
