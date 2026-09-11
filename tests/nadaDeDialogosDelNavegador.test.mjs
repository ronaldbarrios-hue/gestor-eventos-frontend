/* La plataforma pregunta con su propio diálogo, no con el del navegador.
 *
 * ── Qué se encontró ──────────────────────────────────────────────────────
 *
 * Cinco `window.confirm` / `window.prompt` repartidos por el panel, con el
 * diálogo propio ya construido. Y lo que lo delata: TRES de los cinco estaban
 * en archivos que YA importaban `confirmDialog` unas líneas más arriba. No era
 * que no existiera la pieza, es que al escribir una pantalla nueva se tira de
 * lo que el navegador trae puesto.
 *
 * No es sólo estética:
 *
 *   · No llevan la marca ni el idioma de la aplicación, y dicen el dominio.
 *   · Bloquean el hilo: la pantalla se congela detrás.
 *   · `prompt()` puede NO EXISTIR. Medido en el navegador incrustado del
 *     editor: llamarlo LANZA «prompt() is not supported» en vez de devolver
 *     null. Pasa igual en webviews embebidos. Sin `try`, quien preguntaba un
 *     nombre se llevaba la excepción y la pantalla se caía.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');
const leer = (...t) => fs.readFileSync(path.join(raiz, 'src', ...t), 'utf8');
/* Sin comentarios: este archivo y los que revisa nombran `window.prompt`
   varias veces para explicar por qué ya no se usa. */
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function fuentes() {
  const out = [];
  const anda = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) anda(p);
      else if (/\.jsx?$/.test(e.name)) out.push(p);
    }
  };
  anda(path.join(raiz, 'src'));
  return out;
}

test('ninguna pantalla pregunta con el diálogo del navegador', () => {
  const culpables = [];
  for (const p of fuentes()) {
    /* `Confirm.jsx` es el único que puede: es el respaldo de cuando el host no
       está montado, y está acotado a eso. */
    if (p.endsWith(path.join('ui', 'Confirm.jsx'))) continue;
    const src = sinComentarios(fs.readFileSync(p, 'utf8'));
    if (/window\.(confirm|prompt|alert)\(/.test(src)) culpables.push(path.relative(raiz, p));
  }
  assert.deepEqual(culpables, [],
    'vuelven a preguntar con el diálogo del navegador: no lleva la marca, congela la pantalla, y prompt() no existe en todos lados');
});

test('pedirTexto respeta el contrato de window.prompt', () => {
  const src = leer('components', 'ui', 'Confirm.jsx');
  /* El texto o `null`, igual que el del navegador: así quien lo sustituye no
     tiene que cambiar la comprobación de después —las dos llamadas que se
     migraron hacen `if (!nombre) return;`. */
  assert.match(src, /typeof v === 'string' \? v\.trim\(\) : null/,
    'pedirTexto no devuelve el texto recortado, o no devuelve null al cancelar');

  /* Las CUATRO salidas tienen que devolver lo mismo: botón, Escape, Enter y
     clic fuera. Una que devuelva `false` donde se espera un texto pasaría por
     un nombre válido. */
  assert.match(src, /const aceptar\s+= \(\) => close\(state\?\.pedir \? tecleado : true\);/);
  assert.match(src, /const cancelar = \(\) => close\(state\?\.pedir \? null : false\);/);
  const host = src.slice(src.indexOf('export function ConfirmHost'));
  assert.ok(!/close\(false\)|close\(true\)/.test(host),
    'alguna salida vuelve a devolver un booleano a pelo, sin mirar si se pidió un texto');
});

test('el respaldo no revienta donde prompt() no existe', () => {
  /* Medido: en el navegador incrustado, `prompt()` LANZA. Devolver null es
     quedarse sin renombrar; lanzar es tumbar la pantalla. */
  const src = leer('components', 'ui', 'Confirm.jsx');
  assert.match(src, /try \{ resolve\(window\.prompt\([^)]*\)\); \}\s*catch \{ resolve\(null\); \}/s,
    'el respaldo de pedir texto llama a prompt() sin red');
  /* `[\s\S]*?` y no `[^)]*`: el argumento lleva paréntesis dentro
     —`t('¿Confirmar?')`— y la primera versión de esta comprobación no podía
     atravesarlos, así que daba por bueno lo que no había mirado. */
  assert.match(src, /try \{ resolve\(window\.confirm\([\s\S]*?\); \}\s*catch \{ resolve\(false\); \}/,
    'el respaldo de confirmar llama a confirm() sin red');
});

test('el campo sale con lo de ahora seleccionado, para teclear encima', () => {
  /* Al renombrar, si el nombre no queda seleccionado hay que borrarlo a mano.
     Medido en el navegador: el `select()` de un `onFocus` NO sobrevive al
     montaje —el campo salía enfocado y sin nada seleccionado—, así que va en
     un efecto con ref. */
  const src = leer('components', 'ui', 'Confirm.jsx');
  assert.match(src, /if \(state\?\.pedir && campo\.current\) campo\.current\.select\(\);/,
    'el nombre de ahora ya no sale seleccionado al abrir');
  assert.ok(!/onFocus=\{e => e\.target\.select\(\)\}/.test(src),
    'volvió el select() en onFocus, que no funciona');
});

test('las dos preguntas migradas siguen comprobando lo mismo', () => {
  const plano = sinComentarios(leer('pages', 'events', 'tabs', 'PlanoTab.jsx'));
  assert.match(plano, /const nombre = await pedirTexto\(\{/);
  assert.match(plano, /if \(!nombre \|\| nombre === esp\.nombre\) return;/,
    'renombrar dejó de comprobar el cancelado o el mismo nombre');

  const pub = sinComentarios(leer('pages', 'events', 'workspace', 'PublicacionSection.jsx'));
  assert.match(pub, /const nombre = await pedirTexto\(\{/);
  assert.match(pub, /if \(!nombre\) return;/);
  /* Y quitar un botón sigue diciendo lo que NO pasa: sin eso parece que borra
     su historia, y quien lo cree deja de limpiar la lista. */
  assert.match(pub, /inscripciones que trajo se quedan en el evento/);
});
