/* El formulario incrustado se pintaba con el tema equivocado.
 *
 * ── El caso real ─────────────────────────────────────────────────────────
 *
 * Llegó una foto del registro de FESTECH: su web es azul noche, el visitante
 * tenía el portátil en modo claro, y el formulario salió con la paleta clara
 * encima del azul. El título en #15171C sobre casi negro —invisible— y los
 * campos en #E4DFD1, unos recuadros color crema flotando.
 *
 * Nada había fallado: `fondo=transparente` deja el color a la web anfitriona,
 * y `tema=auto` lo tomaba de `prefers-color-scheme`, o sea del sistema
 * operativo de quien mira. Dos mitades decidiendo por separado el mismo dibujo.
 *
 * La regla que se cuida aquí: **si el fondo lo pone la web anfitriona, el tema
 * también.**
 *
 * Correr: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { aRGB, luminancia, esquemaDeFondo, fondoDetrasDe } from '../src/lib/esquemaAnfitrion.js';
import { embedSnippet } from '../src/lib/embed.js';
import * as embedLib from '../src/lib/embed.js';

const leer = (f) => readFileSync(f, 'utf8').replace(/\r/g, '');

test('el azul de FESTECH se lee como oscuro', () => {
  /* El caso que originó esto. Con la respuesta correcta, el formulario se
     habría pintado en oscuro y el título se habría visto. */
  assert.equal(esquemaDeFondo('rgb(11, 18, 32)'), 'oscuro');
  assert.equal(esquemaDeFondo('#0B1220'), 'oscuro');
});

test('un gris medio también, que es donde el umbral fácil falla', () => {
  /* Con el umbral obvio (0.5) un gris pizarra caería del lado claro y
     repetiría el problema con menos escándalo: texto casi negro sobre gris
     oscuro pasa por «se ve mal» en vez de por «está roto». */
  assert.equal(esquemaDeFondo('#4A5568'), 'oscuro');
  assert.equal(esquemaDeFondo('#EBE7DC'), 'claro');
  assert.equal(esquemaDeFondo('#FFFFFF'), 'claro');
});

test('el verde pesa más que el azul, como en el ojo', () => {
  /* Promediando los tres canales, estos dos darían casi lo mismo. No se
     parecen en nada: uno se lee con texto negro y el otro no. */
  assert.ok(luminancia(aRGB('rgb(0, 200, 0)')) > luminancia(aRGB('rgb(0, 0, 200)')));
  assert.equal(esquemaDeFondo('rgb(0, 200, 0)'), 'claro');
  assert.equal(esquemaDeFondo('rgb(0, 0, 200)'), 'oscuro');
});

test('transparente no dice de qué color es la página', () => {
  /* Y por eso devuelve null y no un color: hay que seguir mirando hacia
     arriba. Contestar «claro» aquí es lo que da el fallo original. */
  assert.equal(aRGB('rgba(0, 0, 0, 0)'), null);
  assert.equal(aRGB('transparent'), null);
  assert.equal(esquemaDeFondo('rgba(0,0,0,0)'), null);
  assert.equal(esquemaDeFondo(''), null);
  assert.equal(esquemaDeFondo(undefined), null);
  assert.equal(esquemaDeFondo('color(display-p3 0 0 0)'), null);
});

test('un velo casi transparente no cuenta como fondo', () => {
  /* Un overlay al 5 % no manda sobre lo que hay debajo, y tomarlo por el fondo
     de la página devuelve el color equivocado. */
  assert.equal(aRGB('rgba(255, 255, 255, 0.05)'), null);
  assert.deepEqual(aRGB('rgba(255, 255, 255, 0.9)'), [255, 255, 255]);
});

test('se sube por los padres hasta el primero que pinta algo', () => {
  /* Un div sin fondo dentro de una sección azul es azul; preguntarle a él solo
     devuelve rgba(0,0,0,0), que es justo lo que pasa en una web real. */
  const seccion = { parentElement: null, bg: 'rgb(11, 18, 32)' };
  const caja    = { parentElement: seccion, bg: 'rgba(0, 0, 0, 0)' };
  const iframe  = { parentElement: caja,    bg: 'transparent' };
  assert.equal(fondoDetrasDe(iframe, n => n.bg), 'oscuro');
});

test('sin nadie que pinte nada, no se inventa una respuesta', () => {
  const raiz = { parentElement: null, bg: 'transparent' };
  assert.equal(fondoDetrasDe(raiz, n => n.bg), null);
});

/* ── El snippet que se pega en la web del cliente ────────────────────── */

const SNIPPET = embedSnippet({
  origin: 'https://app.ejemplo.co', slug: 'festech', seccion: 'registro', titulo: 'Registro',
});

test('el snippet manda el esquema junto a la tipografía', () => {
  assert.match(SNIPPET, /esquema: esquemaDeAqui\(\)/);
  assert.match(SNIPPET, /gestek: 'estilo'/);
});

test('el código que se pega es JavaScript válido', () => {
  /* Esto no es paranoia: el trozo viaja pegado dentro de una plantilla, y una
     barra invertida de más o de menos por el camino ya dejó una vez un patrón
     que no casaba con nada. En la web del cliente eso falla en silencio — el
     iframe nunca recibe el estilo y nadie se entera. */
  const cuerpo = SNIPPET.slice(SNIPPET.indexOf('<script>') + 8, SNIPPET.lastIndexOf('<'));
  new Function(cuerpo.replace(/<\\\//g, '</'));   // lanza si no compila
});

test('el snippet no usa expresiones regulares para leer el color', () => {
  /* La razón está arriba. Se comprueba la ausencia, no la presencia: es una
     decisión que se pierde en la primera «mejora» que la vuelva a meter. */
  const trozo = SNIPPET.slice(SNIPPET.indexOf('function partes'), SNIPPET.indexOf('function estilo'));
  assert.doesNotMatch(trozo, /match\(/);
});

/* ── El botón flotante ───────────────────────────────────────────────── */

test('widget.js mira el fondo de la página, no el del sistema', () => {
  const w = leer('public/widget.js');
  assert.match(w, /function esquemaDeLaPagina\(\)/);
  assert.match(w, /esquema: esquemaDeLaPagina\(\)/);
  /* El mismo umbral que el módulo de aquí: dos números distintos serían el
     botón y la sección discrepando sobre la misma web. */
  assert.match(w, /< 0\.18 \? 'oscuro' : 'claro'/);
  assert.match(leer('src/lib/esquemaAnfitrion.js'), /UMBRAL_OSCURO = 0\.18/);
});

/* ── Y quien lo recibe ───────────────────────────────────────────────── */

test('con el fondo transparente manda la web anfitriona', () => {
  /* Sin los comentarios: el de arriba explica el fallo y nombra
     `prefers-color-scheme` antes de que aparezca en el código, así que
     buscarlo en el texto entero mide el orden de la explicación y no el de las
     comprobaciones. */
  const p = leer('src/pages/public/EmbedPage.jsx').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(p, /if \(fondo === 'transparente'\) \{/);
  assert.match(p, /esquemaHost === 'claro'/);
  /* Y el orden: un tema pedido a mano (`tema=oscuro`) sigue ganando — quien lo
     escribió sabe algo que nosotros no. */
  assert.ok(p.indexOf("if (tema === 'oscuro')") < p.indexOf("if (fondo === 'transparente'"));
});

test('sin nadie que nos lo diga, no se sortea por el portátil del visitante', () => {
  /* El script del snippet se COPIA a la web del cliente: quien pegó el suyo
     hace meses tiene la versión de entonces, y arreglar el snippet no le llega
     — comprobado en la página de FESTECH, cuya copia además está retocada a
     mano. Y Notion o Wix no ejecutan script ninguno.

     En ese caso `prefers-color-scheme` no es un valor por omisión: es un
     sorteo. El mismo formulario, en la misma web, se ve distinto según el
     portátil de quien entra, y la mitad de las veces ilegible. La sección es
     un trozo de la página del evento, que es oscura siempre. */
  const p = leer('src/pages/public/EmbedPage.jsx').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(p, /if \(esquemaHost === 'claro'\) setLight\(\); else setDark\(\);/);
  /* Y `prefers-color-scheme` sólo queda para el fondo sólido, donde pintamos
     nuestro propio fondo y cualquiera de los dos temas se lee. */
  assert.ok(p.indexOf("if (fondo === 'transparente')") < p.indexOf('prefers-color-scheme'));
});

test('la ayuda del panel dice lo que de verdad pasa', () => {
  /* Una pista que describe otro comportamiento es peor que ninguna. */
  const { EMBED_TEMA_PISTA } = embedLib;
  assert.match(EMBED_TEMA_PISTA, /Siempre claro/);
  assert.match(leer('src/pages/events/editor/ExportIframeModal.jsx'), /EMBED_TEMA_PISTA/);
});

test('sólo se aceptan los dos valores que existen', () => {
  /* Un mensaje raro no puede darle la vuelta al tema: cualquier página puede
     mandar un postMessage. */
  const p = leer('src/pages/public/EmbedPage.jsx');
  assert.match(p, /d\.esquema === 'oscuro' \|\| d\.esquema === 'claro'/);
});

/* ── Las recomendaciones del modal ───────────────────────────────────── */

test('las recomendaciones salen antes de copiar, no al pie', () => {
  /* Al pie se leen cuando el código ya está pegado en la web del cliente, y
     ahí nadie vuelve: la copia de FESTECH lleva meses con el script retocado a
     mano y no se supo hasta que llegó una foto del formulario ilegible. */
  const m = leer('src/pages/events/editor/ExportIframeModal.jsx');
  const iReco = m.indexOf('<Recomendaciones');
  const iCodigo = m.indexOf('Código para pegar');
  assert.ok(iReco > 0 && iReco < iCodigo, 'las recomendaciones no van antes del código');
});

test('cada recomendación sale de algo que pasó de verdad', () => {
  /* Se comprueban por clave y no por texto: el texto se reescribe, y una
     prueba que se rompe al mejorar la redacción acaba borrada. */
  const { EMBED_RECOMENDACIONES } = embedLib;
  const claves = EMBED_RECOMENDACIONES.map(r => r.clave);
  for (const c of ['no-tocar-el-script', 'volver-a-pegar', 'tema-claro',
    'sin-alto-fijo', 'una-por-pagina', 'sin-script', 'pago-en-pestana']) {
    assert.ok(claves.includes(c), `falta la recomendación «${c}»`);
  }
  /* Ninguna vacía: una recomendación con título y sin explicación no cambia
     nada de lo que hace quien la lee. */
  for (const r of EMBED_RECOMENDACIONES) {
    assert.ok(r.titulo?.length > 10 && r.detalle?.length > 40, `«${r.clave}» está a medias`);
  }
});

test('las que dependen de la configuración no salen siempre', () => {
  /* «Elige tema claro» delante de quien ya lo eligió es ruido, y el ruido es
     lo que enseña a saltarse el bloque entero. */
  const { recomendacionesPara } = embedLib;
  const conAuto = recomendacionesPara({ tema: 'auto', autoAlto: true }).map(r => r.clave);
  const conClaro = recomendacionesPara({ tema: 'claro', autoAlto: true }).map(r => r.clave);
  assert.ok(conAuto.includes('tema-claro'));
  assert.ok(!conClaro.includes('tema-claro'));

  const sinAuto = recomendacionesPara({ tema: 'claro', autoAlto: false }).map(r => r.clave);
  assert.ok(!sinAuto.includes('sin-alto-fijo'), 'sin ajuste de alto, ese aviso no aplica');
});

test('el embebido no se sirve desde la caché de la aplicación', () => {
  /* Es un trozo de GESTEK dentro de la web de otra empresa: «una versión por
     detrás» es lo que le ve el público del cliente. Comprobado en producción —
     recién desplegado el arreglo del contraste, el navegador seguía sirviendo
     el bundle anterior desde el service worker y el formulario seguía
     ilegible. */
  const sw = leer('src/sw.js');
  /* Sin expresión regular: el patrón que hay que buscar está hecho de barras
     invertidas, y escribirlo dentro de otra expresión regular es la forma más
     fácil de que la prueba pase por una razón equivocada. */
  const linea = sw.split('\n').find(l => l.includes('denylist:'));
  assert.ok(linea, 'no hay denylist en el service worker');
  assert.ok(linea.includes('/^\\/embed\\//'), `el embebido sigue cayendo en el precache: ${linea.trim()}`);
});
