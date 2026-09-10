/* Los botones responden al dedo, y dicen cuándo están trabajando.
 *
 * Dos cosas que parecían estar y no estaban:
 *
 * 1. `active:scale-95` llevaba tiempo escrito y casi no se veía, porque estaba
 *    debajo de `transition-all duration-200`: un toque dura unos 120 ms, o sea
 *    que el dedo se levantaba antes de que la escala llegara a ninguna parte.
 *    La animación existía y no la veía nadie — el modo de fallo de siempre: no
 *    salta ningún error, sólo se siente que la pantalla no te hizo caso.
 *
 * 2. Un botón guardando se quedaba en `disabled:opacity-40`, el mismo gris
 *    apagado que uno que todavía no se puede pulsar. «Se está haciendo» y «no
 *    está disponible» son cosas distintas y tenían el mismo aspecto.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'index.css'), 'utf8').replace(/\r/g, '');
const bloque = (desde, hasta) => CSS.slice(CSS.indexOf(desde), CSS.indexOf(hasta));

test('el hundido tiene su propio tiempo, más corto que el resto', () => {
  assert.match(CSS, /\.btn:active:not\(:disabled\)\s*{\s*transition-duration:\s*90ms/);
  /* Y volver es más lento que bajar: es la asimetría la que se siente como un
     botón físico. Con el mismo número en los dos sentidos parece goma. */
  const btn = bloque('  .btn {', '  .btn:active');
  const vuelta = Number(btn.match(/transition-duration:\s*(\d+)ms/)?.[1]);
  assert.ok(vuelta > 90, `volver (${vuelta}ms) tiene que tardar más que hundirse (90ms)`);
});

test('los botones no animan su propio ancho', () => {
  /* `transition-all` incluye el ancho y el alto, así que un botón que pasa de
     «Guardar» a «Guardando…» se estiraba animándose, con el texto bailando
     dentro. Eso no lo decidió nadie: era el efecto colateral de una palabra
     cómoda. */
  const btn = bloque('  .btn {', '  .btn:active');
  assert.doesNotMatch(btn, /transition-all/, '.btn volvió a transition-all');
  assert.match(btn, /transition-property:\s*[^;]*transform/, 'sin transform no hay hundido');
  for (const prohibida of ['width', 'height', 'padding', 'all']) {
    assert.doesNotMatch(btn.match(/transition-property:[^;]*/)[0], new RegExp(`\\b${prohibida}\\b`),
      `la lista de propiedades incluye ${prohibida}: eso anima el tamaño del botón`);
  }
});

test('un botón trabajando no se ve como uno inhabilitado', () => {
  /* Se distingue por lo que la app YA hace —meter un <Spinner> dentro—, sin
     pedir que además nadie se acuerde de un atributo nuevo: un atributo que hay
     que recordar es uno que la mitad de las pantallas no va a llevar. */
  assert.match(CSS, /\.btn:disabled:has\(svg\.animate-spin\)/);
  assert.match(CSS, /\.btn\[aria-busy='true'\]/);
  const trabajando = bloque(".btn:disabled:has(svg.animate-spin)", '/* ── Cards');
  assert.match(trabajando, /opacity-100/, 'el botón que trabaja sigue apagado');
  assert.match(trabajando, /cursor:\s*progress/);
});

test('quien pide menos movimiento lo sigue teniendo', () => {
  /* Nada de esto lleva guardia propia porque el bloque global ya aplasta
     cualquier transición. Si ese bloque se fuera, estas animaciones se
     volverían obligatorias sin que nadie lo notara. */
  const guardia = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(guardia.slice(0, 500), /transition-duration:\s*0\.001ms\s*!important/);
});
