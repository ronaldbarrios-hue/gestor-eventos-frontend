/* Lo que falta por llenar se dice en UN sitio, y se recalcula.
 *
 * ── De dónde sale ────────────────────────────────────────────────────────
 *
 * El formulario de PijaoTech abría con un párrafo que nombraba las ~50
 * preguntas pendientes, una por una, encima del propio formulario. Se acortó a
 * «te faltan N» — pero se acortó en un sitio de los dos: el aviso verde de
 * «Traer mis datos» seguía enumerando por su cuenta, tres centímetros más
 * abajo.
 *
 * Es la lista copiada a mano de siempre: dos sitios contando lo mismo, se
 * arregla uno, y el otro sigue creciendo sin que nada avise.
 *
 * Y de los dos, el verde era el peor: se calculaba al pulsar el botón y ahí se
 * quedaba congelado. Quien rellenaba tres campos seguía leyendo que le
 * faltaban treinta y ocho — el aviso reprochando un trabajo que ya se hizo.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');
/* Sin comentarios: si no, el test mide sus propias explicaciones — arriba se
   nombra `textoDeLoQueFalta` cuatro veces sin llamarla ni una. */
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const pagina = sinComentarios(fs.readFileSync(path.join(raiz, 'src/pages/public/EventoPublicoPage.jsx'), 'utf8'));

const { loQueQueda, textoDeLoQueFalta } = await import('../src/lib/loQueFalta.js');

test('lo que falta se enumera en un solo sitio de la página', () => {
  const veces = (pagina.match(/textoDeLoQueFalta\(/g) || []).length;
  assert.equal(veces, 1,
    `«lo que falta» se cuenta en ${veces} sitios; en cuanto son dos, uno se queda atrás`);
});

test('el aviso de «Traer mis datos» no vuelve a listar lo que falta', () => {
  /* El aviso verde es lo que sigue a `resultado.encontrado`. Lo que no puede
     tener es `faltan`: eso es la lista, y es de la barra de progreso. */
  const i = pagina.indexOf('resultado.encontrado ?');
  assert.ok(i > 0, 'no encontré el aviso de «Traer mis datos»');
  const aviso = pagina.slice(i, i + 900);
  assert.ok(!aviso.includes('faltan'),
    'el aviso de «Traer mis datos» volvió a listar lo que falta');
  assert.ok(/rellenamos \$\{rellenados\}/.test(aviso),
    'el aviso ya no dice cuántos datos se rellenaron, que es lo único que confirma que el botón hizo algo');
});

test('el recuento vive fuera de la barra de pasos', () => {
  /* Un formulario corto no pinta la barra. Si el recuento vive dentro, ahí se
     queda sin decirlo nadie — y no salta ningún error: sólo no aparece.

     Se mira la sangría: los hijos directos del formulario van a 8 espacios y
     lo que cuelga de la barra, a 12. Es tosco, pero es lo que distingue «está
     dentro» de «está al lado» sin montar un analizador de JSX. */
  assert.match(pagina, /^ {8}\{prellenado\?\.encontrado/m,
    'el recuento quedó anidado dentro de `paginado`: un formulario corto no lo vería');

  /* Y la barra ya no lo lleva. */
  const i = pagina.indexOf('{paginado && (');
  const fin = pagina.indexOf('{err &&', i);
  const barra = pagina.slice(i, pagina.indexOf('{prellenado?.encontrado', i));
  assert.ok(i > 0 && fin > i);
  assert.ok(!barra.includes('textoDeLoQueFalta('),
    'la barra de pasos volvió a llevar el recuento dentro');
});

test('lo que ya se escribió deja de contar como pendiente', () => {
  const faltan = [
    { id: 'a', etiqueta: 'Corregimiento' },
    { id: 'b', etiqueta: 'Departamento' },
    { id: 'c', etiqueta: 'Sector' },
  ];
  assert.equal(loQueQueda(faltan, {}).length, 3);
  assert.equal(loQueQueda(faltan, { a: 'Ibagué' }).length, 2);
  /* Una casilla múltiple sin nada marcado sigue pendiente: llega como `[]`,
     que es un valor, y contarla como rellena es prometer un dato que no está. */
  assert.equal(loQueQueda(faltan, { a: [] }).length, 3);
});

test('con muchas, se cuenta en vez de nombrar', () => {
  const muchas = Array.from({ length: 38 }, (_, i) => ({ id: `f${i}`, etiqueta: `Pregunta ${i}` }));
  const texto = textoDeLoQueFalta(muchas);
  assert.match(texto, /38/);
  assert.ok(!texto.includes('Pregunta 0'), 'volvió a nombrarlas una por una');
  assert.ok(texto.length < 120, `el aviso mide ${texto.length} caracteres: eso es un muro otra vez`);
});
