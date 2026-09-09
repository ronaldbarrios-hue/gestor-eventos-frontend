/* Qué es cada boleta, dicho en la lista de compra.
 *
 * Un evento con cuatro boletas las enseñaba en una lista plana, y nada decía
 * cuál es la entrada al evento y cuáles son actividades de dentro. Quien
 * llegaba veía cuatro cosas iguales y elegía una: se inscribía al DemoDay sin
 * entrada, o pedía las cuatro «por si acaso».
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROLES, ORDEN_ROLES, rolValido, agruparBoletas } from '../src/lib/rolDeBoleta.js';

const leer = (f) => readFileSync(f, 'utf8').replace(/\r/g, '');
const tipo = (nombre, extra = {}) => ({ id: nombre, nombre, ...extra });

/* ── Agrupar, y sobre todo cuándo NO ──────────────────────────────────── */

test('con una sola clase de boleta no se agrupa: el caso normal', () => {
  /* Poner «Entrada al evento» encima de una única boleta es ruido que hay que
     leer, y así es el 95 % de los eventos. */
  assert.equal(agruparBoletas([tipo('General')]), null);
  assert.equal(agruparBoletas([tipo('General'), tipo('VIP')]), null);
  assert.equal(agruparBoletas([]), null);
});

test('la entrada al evento va primera, siempre', () => {
  /* Es lo que casi todo el mundo viene a comprar. Debajo, lo que se suma. */
  const grupos = agruparBoletas([
    tipo('Taller', { rol: 'actividad' }),
    tipo('Parqueadero', { rol: 'extra' }),
    tipo('Registro', { rol: 'entrada' }),
  ]);
  assert.deepEqual(grupos.map(g => g.rol), ['entrada', 'actividad', 'extra']);
});

test('las actividades avisan de que hace falta la entrada', () => {
  const grupos = agruparBoletas([tipo('A', { rol: 'entrada' }), tipo('B', { rol: 'actividad' })]);
  assert.match(grupos.find(g => g.rol === 'actividad').ayuda, /entrada/i);
});

test('un rol inventado se lee como entrada y la boleta no desaparece', () => {
  /* Una boleta que se cae de la página pública por un valor raro es peor que
     una mal clasificada: la primera no se puede comprar. */
  assert.equal(rolValido('pirata'), 'entrada');
  const grupos = agruparBoletas([tipo('A', { rol: 'pirata' }), tipo('B', { rol: 'extra' })]);
  const todas = grupos.flatMap(g => g.tipos.map(t => t.nombre));
  assert.deepEqual(todas.sort(), ['A', 'B']);
});

/* ── Una sola tarjeta ─────────────────────────────────────────────────── */

const BLOCKS = leer('src/pages/events/editor/blocks.jsx');

test('la tarjeta de boleta se escribe una vez y se usa en los dos caminos', () => {
  /* Agrupada y plana la pintan dos sitios. Con dos copias, acaban teniendo
     distinto el precio tachado o el botón de agotado sin que nadie lo note —
     el modo de fallo de este proyecto. */
  assert.equal((BLOCKS.match(/function TarjetaBoleta/g) || []).length, 1);
  assert.ok((BLOCKS.match(/<TarjetaBoleta/g) || []).length >= 2, 'sólo se usa en un camino');
});

test('el bloque de boletas agrupa cuando hay de qué', () => {
  assert.match(BLOCKS, /const grupos = agruparBoletas\(tickets\)/);
  assert.match(BLOCKS, /grupos \?/);
});

/* ── El panel ─────────────────────────────────────────────────────────── */

const PANEL = leer('src/pages/events/tabs/TicketsTab.jsx');

test('el panel deja decir qué es cada boleta, y lo manda', () => {
  assert.match(PANEL, /ORDEN_ROLES\.map/);
  assert.match(PANEL, /rol\s*:\s*form\.rol/);
});

test('una base sin la 0121 no rompe el formulario del panel', () => {
  /* `initial.rol` llega `undefined` y cae en «entrada», que es lo que la lista
     hacía con todas hasta ahora. */
  assert.match(PANEL, /rol\s*:\s*rolValido\(initial\?\.rol\)/);
});

/* ── Y que las dos mitades no se separen ──────────────────────────────── */

test('los tres papeles son exactamente estos, y el servidor tiene la misma lista', () => {
  /* Las dos mitades tienen su copia —una VALIDA lo que se guarda, la otra
     PINTA— y las claves tienen que coincidir: si se separan, el panel guarda un
     valor que el servidor rechaza con un mensaje que no dice nada.
   *
   * No se comprueba leyendo el archivo del otro repo: una prueba del frontend
   * que abre archivos del backend pasa en esta máquina y falla en integración
   * continua, donde ese repo no está. Ya me pasó hoy.
   *
   * Se fija contra un literal escrito aquí, y el backend hace lo mismo del suyo
   * (`test/queEsCadaBoleta.test.js`). Cambiar la lista en un lado rompe la
   * prueba de ese lado, que es exactamente lo que hace falta. */
  assert.deepEqual([...ORDEN_ROLES].sort(), ['actividad', 'entrada', 'extra']);
  assert.deepEqual(Object.keys(ROLES).sort(), [...ORDEN_ROLES].sort());

  /* Y cada uno con lo que la pantalla necesita: sin `panel` el selector sale
     mudo, sin `titulo` el encabezado. */
  for (const r of ORDEN_ROLES) {
    assert.ok(ROLES[r].titulo && ROLES[r].corto && ROLES[r].panel, r);
  }
});
