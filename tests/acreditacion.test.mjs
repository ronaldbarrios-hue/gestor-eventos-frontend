/* La pantalla donde se arma lo que el asistente lleva encima.
 *
 * ── Lo que estaba mal ────────────────────────────────────────────────────
 *
 * · Añadir dos escarapelas dejaba dos fichas llamadas «Escarapela», con las
 *   mismas medidas al lado. En pantalla eran indistinguibles, y elegir la
 *   equivocada sólo se descubre al imprimir el rollo.
 * · Las piezas viven en `page_json` y sólo llegan ahí al pulsar «Guardar
 *   medidas». Añadir una, ajustar los milímetros y cambiar de pestaña se
 *   llevaba el trabajo sin decir nada — y al volver, la pantalla se veía igual
 *   que antes de empezar, que es la peor forma de perder algo.
 * · La pestaña se llamaba «Escarapelas y carnés»: nombraba dos de las tres
 *   cosas que hay dentro, y quien buscaba dónde imprimir no miraba ahí.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ETIQ = 'src/pages/events/workspace/asistentes/EtiquetadoraSection.jsx';
const SECCION = 'src/pages/events/workspace/asistentes/AcreditacionSection.jsx';
const WS = 'src/pages/events/workspace/EventWorkspace.jsx';
const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

const { piezaDesdeTipo, TIPOS_PIEZA } = await import('../src/lib/piezasBranding.js');

test('dos piezas del mismo tipo no se llaman igual', () => {
  const a = piezaDesdeTipo('escarapela');
  const b = piezaDesdeTipo('escarapela', [a]);
  const c = piezaDesdeTipo('escarapela', [a, b]);
  assert.equal(a.nombre, 'Escarapela');
  assert.equal(b.nombre, 'Escarapela 2', 'la segunda vuelve a ser un gemelo indistinguible');
  assert.equal(c.nombre, 'Escarapela 3');
});

test('el nombre libre de alguien no se pisa ni se repite', () => {
  /* El nombre es editable. Si alguien llamó a la suya «Escarapela 2», la
     siguiente automática no puede chocar con ella. */
  const propias = [{ nombre: 'Escarapela' }, { nombre: 'Escarapela 2' }];
  assert.equal(piezaDesdeTipo('escarapela', propias).nombre, 'Escarapela 3');
});

test('cada tipo sigue naciendo con sus medidas', () => {
  /* Lo que no puede romper el cambio de nombre: una manilla mide 250×25 y su
     QR va con el código corto, porque el firmado no cabe. */
  const m = piezaDesdeTipo('manilla', [{ nombre: 'Manilla' }]);
  assert.equal(m.nombre, 'Manilla 2');
  assert.equal(m.alto, 25);
  assert.equal(m.qr_contenido, 'codigo', 'la manilla volvió a nacer con el QR firmado, que no le cabe');
});

test('ningún tipo promete una medida que se recorta al crearla', () => {
  /* La manilla se declaraba de 250 mm y `LIMITES.ancho.max` son 210: cada
     manilla nacía recortada a 210 EN SILENCIO. El catálogo prometía una medida
     que ninguna pieza llegaba a tener, y la lista de tipos la enseñaba.

     Esto es lo que hay que vigilar, no el número: un tipo cuyo valor no
     sobrevive a `normalizarPieza` es una promesa que la pantalla no cumple. */
  /* La tolerancia es UN PUNTO de impresora, no cero: `normalizarEtiqueta`
     ajusta las medidas a la rejilla de puntos —85,6 mm pasan a 85,625— y eso
     es correcto, es la resolución real del cabezal. Lo que no puede pasar es
     un recorte de milímetros enteros, que es lo que hacía el límite. */
  const UN_PUNTO = 1 / 8;
  for (const t of TIPOS_PIEZA) {
    const p = piezaDesdeTipo(t.id);
    for (const campo of ['ancho', 'alto', 'margen', 'qr_objetivo']) {
      const declarado = t.medidas[campo];
      if (declarado === undefined) continue;
      assert.ok(Math.abs(p[campo] - declarado) <= UN_PUNTO,
        `«${t.nombre}» declara ${campo}=${declarado} y nace con ${p[campo]}: el catálogo promete una medida que se recorta`);
    }
  }
});

test('añadir una pieza se ve como lo que es', () => {
  /* Era un `<select>` ancho al lado de unas fichas pequeñas: desentonaba y
     escondía que hay tres piezas distintas. Son tres: caben como botones. */
  const src = leer(ETIQ);
  assert.doesNotMatch(src, /\+ Añadir pieza…/, 'volvió el desplegable');
  assert.match(src, /TIPOS_PIEZA\.map\(t => \(\s*\n\s*<button key=\{t\.id\} onClick=\{\(\) => agregar\(t\.id\)\} title=\{t\.pista\}/,
    'los tipos dejaron de ofrecerse como botones con su pista');
  assert.ok(TIPOS_PIEZA.length <= 5,
    'si los tipos crecen, tres botones dejan de caber y hay que volver a pensar esto');
});

test('no se sale sin saber que hay algo sin guardar', () => {
  const src = leer(ETIQ);
  assert.match(src, /const sinGuardar = JSON\.stringify\(piezas\) !== guardado;/,
    'ya no se sabe si lo que se ve está guardado');
  assert.match(src, /Cambios sin guardar\. Si sales ahora, se pierden\./,
    'se puede perder el trabajo sin un aviso');
  /* Y el botón dice en cuál de los dos estados está: un «Guardar» siempre
     disponible no distingue lo pendiente de lo ya escrito. */
  assert.match(src, /disabled=\{guardando \|\| !sinGuardar\}/,
    'el botón de guardar no refleja si hay algo que guardar');
  assert.match(src, /setGuardado\(JSON\.stringify\(piezas\)\);/,
    'después de guardar, la pantalla seguiría diciendo que hay cambios pendientes');
});

test('la pestaña dice el trabajo, y las piezas se nombran debajo', () => {
  assert.match(leer(WS), /id: 'acreditacion', label: 'Acreditación'/,
    'la pestaña volvió a nombrar dos de las tres cosas que hay dentro');
  const sec = leer(SECCION);
  for (const palabra of ['escarapelas', 'carnés', 'manillas']) {
    assert.ok(sec.includes(palabra),
      `«${palabra}» ya no aparece: quien busca esa palabra no encuentra la pantalla`);
  }
});
