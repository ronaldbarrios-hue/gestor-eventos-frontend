/* El formulario que se comparte lleva la marca del evento, y se lee.
 *
 * De dónde sale: un evento pone su color en el menú de marca, comparte el
 * formulario, y el formulario abre con botones blancos, campos que se enfocan
 * en azul plataforma y una barra de pasos azul. Justo donde se comparte en la
 * web de alguien más es donde la marca importa.
 *
 * Lo que se vigila aquí es lo que no avisa cuando falla:
 *
 * 1. Que ningún color de marca acabe en un botón ilegible. Un botón dorado con
 *    texto blanco encima no lanza ningún error: se ve, y sólo si alguien mira.
 *    Y medir sólo «claro o oscuro» no basta — el morado por defecto (#8B5CF6)
 *    da 4.49 con el texto oscuro y 4.32 con el claro: el MEJOR de los dos sigue
 *    por debajo del 4.5 de la WCAG. Por eso el fondo también se mueve.
 * 2. Que las clases que llevan la marca sigan existiendo en el CSS. Una clase
 *    que se renombra deja el `className` apuntando a nada, y lo que sale es la
 *    apariencia de antes: no falla, sólo deja de tener la marca.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');
const leer = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');
/* Sin comentarios: si no, el test mide sus propias explicaciones y pasa por
   nombrar la clase en una frase que no la define. */
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const { botonDeMarca } = await import('../src/lib/esquemaAnfitrion.js');
const { aRGB, luminancia } = await import('../src/lib/esquemaAnfitrion.js');

const AA = 4.5;
const contraste = (a, b) => {
  const l = [luminancia(aRGB(a)), luminancia(aRGB(b))].sort((x, y) => y - x);
  return (l[0] + 0.05) / (l[1] + 0.05);
};

test('ningún color de marca deja un botón por debajo de AA', () => {
  /* La franja media es la que rompe: ni el texto claro ni el oscuro llegan.
     Se recorre el círculo entero para no depender de la lista de colores que
     se nos ocurrió a nosotros. */
  const malos = [];
  for (let r = 0; r <= 255; r += 15)
    for (let g = 0; g <= 255; g += 15)
      for (let b = 0; b <= 255; b += 15) {
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        const { fondo, texto } = botonDeMarca(hex);
        const v = contraste(fondo, texto);
        if (v < AA) malos.push(`${hex} → ${fondo}/${texto} = ${v.toFixed(2)}`);
      }
  assert.deepEqual(malos.slice(0, 5), [], `${malos.length} colores dan un botón ilegible`);
});

test('el morado por defecto se corrige, y el dorado de FESTECH se respeta', () => {
  /* El morado está en la franja: se le mueve el fondo. */
  const morado = botonDeMarca('#8B5CF6');
  assert.notEqual(morado.fondo.toLowerCase(), '#8b5cf6', 'el morado tenía que moverse');
  assert.ok(contraste(morado.fondo, morado.texto) >= AA);

  /* El dorado NO: ya se lee con texto oscuro. Cambiarle el color a una marca
     que estaba bien es peor que el problema que arregla. */
  const dorado = botonDeMarca('#E0B12B');
  assert.equal(dorado.fondo.toLowerCase(), '#e0b12b');
  assert.equal(dorado.texto, '#12100B');
});

test('un color que no se entiende no le cambia el botón a nadie', () => {
  const { fondo } = botonDeMarca('no-es-un-color');
  assert.equal(fondo, null, 'sin fondo, el CSS cae al aspecto de siempre');
});

test('las clases de marca existen en el CSS y se usan en el formulario', () => {
  const css = sinComentarios(leer('src/index.css'));
  const pagina = sinComentarios(leer('src/pages/public/EventoPublicoPage.jsx'));

  for (const clase of ['btn-marca', 'paso-marca'])
    assert.match(css, new RegExp(String.raw`\.${clase}\s*[{,:]`), `.${clase} no está definida en el CSS`);

  assert.ok(pagina.includes('btn-marca'), 'los botones del formulario no llevan la marca');
  assert.ok(pagina.includes('paso-marca'), 'la barra de pasos no lleva la marca');

  /* El campo enfocado va colgado de `.brand-scope`: fuera de la página pública
     —el panel— el mismo `.input-form` no puede cambiar de color. */
  assert.match(css, /\.brand-scope\s+\.input-form:focus/,
    'el foco de marca no está acotado a la página pública');

  /* Las variables que consume el CSS son las que escribe el proveedor. Es la
     lista copiada a mano de siempre: renombrar una en un sitio y no en el otro
     no da error, sólo devuelve el botón a blanco. */
  const branding = sinComentarios(leer('src/components/public/Branding.jsx'));
  for (const v of ['--brand-boton', '--brand-boton-texto', '--brand-primary', '--brand-glow'])
    assert.ok(branding.includes(v), `${v} la usa el CSS y ya no la escribe Branding.jsx`);
});

test('los botones del formulario no se quedaron con el blanco fijo', () => {
  /* `bg-text-1 text-bg` era el botón blanco de antes. Si vuelve a aparecer en
     esta página es que alguien añadió un botón nuevo copiando uno viejo. */
  const pagina = sinComentarios(leer('src/pages/public/EventoPublicoPage.jsx'));
  assert.equal((pagina.match(/bg-text-1 text-bg/g) || []).length, 0,
    'hay botones del formulario público con el blanco fijo de antes');
});
