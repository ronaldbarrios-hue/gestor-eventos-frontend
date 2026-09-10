/* La importación desde una hoja sirve a los tres formularios, no a uno.
 *
 * Vivía dentro de `FormularioTab`, o sea que existía sólo para el formulario
 * del evento — que es el que menos la necesita: comprar una entrada pide cuatro
 * preguntas y postular una startup a una batalla de pitch pide veintiuna. La
 * pantalla que las importaba estaba a un clic, en la pestaña de al lado, y
 * desde el editor de un sub-evento o un torneo no había forma de llegar.
 *
 * No fallaba nada. Simplemente había que escribirlas a mano, una a una.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.join(process.cwd(), 'src');
const leer = (f) => fs.readFileSync(path.join(raiz, f), 'utf8').replace(/\r/g, '');

const COMPARTIDO = 'components/formulario/ImportarDefinicion.jsx';
const EDITORES = [
  'pages/events/tabs/FormularioTab.jsx',      // evento
  'pages/events/tabs/PreguntasSubEvento.jsx', // sub-evento y torneo
];

test('el panel de importación vive en un solo archivo', () => {
  assert.ok(fs.existsSync(path.join(raiz, COMPARTIDO)), 'no está el componente compartido');

  /* Dos copias de esto se separan: una acaba aceptando un tipo de pregunta que
     la otra no, y la hoja que se descarga deja de ser la que se acepta. */
  const dueños = EDITORES.filter(f => /function\s+ImportarDefinicion/.test(leer(f)));
  assert.deepEqual(dueños, [], 'un editor tiene su propia copia del importador');
});

test('los dos editores lo usan', () => {
  for (const f of EDITORES) {
    assert.match(leer(f), /import ImportarDefinicion from/, `${f} no lo importa`);
    assert.match(leer(f), /<ImportarDefinicion/, `${f} lo importa y no lo pinta`);
  }
});

test('el editor de sub-eventos y torneos ofrece también las fichas prearmadas', () => {
  const src = leer('pages/events/tabs/PreguntasSubEvento.jsx');
  /* Y las toma del servidor, no de una lista suya: una lista propia es como se
     quedó fuera «archivo» del desplegable de tipos durante meses. */
  assert.match(src, /d\.fichas/, 'no lee las fichas que manda el servidor');
  assert.match(src, /fichaPuesta/, 'no puede quitar una ficha entera');
});

test('lo que se agrega en bloque respeta el tope y no repite preguntas', () => {
  const src = leer('pages/events/tabs/PreguntasSubEvento.jsx');
  const trozo = src.slice(src.indexOf('const agregarVarios'), src.indexOf('const fichaPuesta'));
  assert.match(trozo, /max - campos\.length/, 'agrega sin mirar el tope');
  assert.match(trozo, /yaEstan/, 'puede meter dos veces la misma pregunta');
  /* Y nunca ata una pregunta de taller a un tipo de boleta: ese filtro es del
     formulario de compra y aquí escondería la pregunta sin decir por qué. */
  assert.match(src.slice(src.indexOf('const nuevoDe')), /ticket_type_id: null/);
});
