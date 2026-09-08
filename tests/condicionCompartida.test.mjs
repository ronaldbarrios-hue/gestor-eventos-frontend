/* «Mostrar sólo si…» en los tres formularios, no en uno.
 *
 * El servidor guarda `visible_si` y la página pública lo respeta desde la
 * migración 0084. Pero el editor de la condición vivía DENTRO de
 * `FormularioTab`, o sea sólo en el formulario del evento: en los sub-eventos
 * y en los torneos la condición existía en la base y no había forma de
 * escribirla. «Me hacen falta las condicionales en este formulario.»
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { posiblesAntecedentes, valoresDe } from '../src/lib/camposCondicionales.js';

const leer = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('el editor de la condición es uno solo, y los dos formularios lo usan', () => {
  /* Copiado en el segundo, se separan: es como se separaron las cuatro listas
     de opciones del botón. */
  assert.ok(leer('src/components/CondicionEditor.jsx').includes('export default function CondicionEditor'));
  for (const f of ['src/pages/events/tabs/FormularioTab.jsx', 'src/pages/events/tabs/PreguntasSubEvento.jsx']) {
    const s = leer(f);
    assert.match(s, /import CondicionEditor from/, `${f} no importa el editor`);
    assert.match(s, /<CondicionEditor campo=/, `${f} no lo pinta`);
    assert.doesNotMatch(s, /function CondicionEditor\(/, `${f} tiene su propia copia`);
  }
});

test('la condición se guarda, no sólo se enseña', () => {
  /* El fallo de siempre: el editor la muestra, se define, y el objeto que
     viaja al servidor la deja fuera. Ya pasó una vez en el del evento. */
  assert.match(leer('src/pages/events/tabs/PreguntasSubEvento.jsx'), /visible_si: c\.visible_si \|\| null,/);
});

test('una pregunta sólo puede depender de otra ANTERIOR, se llame como se llame la clave', () => {
  /* Los dos editores nombraron distinto su clave local: `_key` en uno y `_k`
     en el otro. Buscando sólo por una, el índice salía -1 y se ofrecían TODAS
     las preguntas como antecedente, incluidas las de después. */
  const campos = [
    { _k: 'a', id: 'id-a', tipo: 'seleccion', etiqueta: 'Rol', opciones: ['Startup', 'Inversor'] },
    { _k: 'b', id: 'id-b', tipo: 'texto', etiqueta: 'Nombre' },
    { _k: 'c', id: 'id-c', tipo: 'seleccion', etiqueta: 'Etapa', opciones: ['Idea', 'Semilla'] },
  ];
  const desdeB = posiblesAntecedentes(campos, 'b').map(c => c.id);
  assert.deepEqual(desdeB, ['id-a'], 'se ofreció una pregunta posterior como antecedente');
  assert.deepEqual(posiblesAntecedentes(campos, 'a').map(c => c.id), []);
  /* Y con `_key`, que es como los nombra el formulario del evento. */
  const conKey = campos.map(c => ({ ...c, _key: c._k, _k: undefined }));
  assert.deepEqual(posiblesAntecedentes(conKey, 'b').map(c => c.id), ['id-a']);
});

test('sólo de preguntas ya guardadas', () => {
  /* La condición guarda el `id` del antecedente. Apuntar a una pregunta sin
     guardar dejaría una referencia a nada en cuanto el servidor le asigne el
     suyo — y no fallaría: la pregunta condicionada no saldría nunca. */
  const campos = [
    { _k: 'nueva_1', tipo: 'seleccion', etiqueta: 'Rol', opciones: ['A', 'B'] },
    { _k: 'b', id: 'id-b', tipo: 'texto', etiqueta: 'Nombre' },
  ];
  assert.deepEqual(posiblesAntecedentes(campos, 'b'), []);
});

test('un checkbox se condiciona por marcada o sin marcar', () => {
  assert.deepEqual(valoresDe({ tipo: 'checkbox' }), ['true', 'false']);
  assert.deepEqual(valoresDe({ tipo: 'seleccion', opciones: ['Sí', 'No'] }), ['Sí', 'No']);
  /* Texto libre no: habría que acertar la respuesta letra por letra. */
  assert.deepEqual(valoresDe({ tipo: 'texto' }), []);
});
