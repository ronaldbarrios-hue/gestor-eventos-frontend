/* Que lo que se ve en el panel sea lo que sale en la web de otro.
 *
 * ── Las cuatro listas ────────────────────────────────────────────────────
 *
 * Las opciones del botón estaban escritas cuatro veces: los valores por
 * defecto, el código que se copia, lo que se guarda al pulsar «Guardar este
 * botón», y `configDe` en `public/widget.js`. Ninguna comprobaba a las otras,
 * y se separaron:
 *
 *   · «El gradiente no funciona, pero los colores individuales sí» — `color`
 *     se escribía en el snippet y `color-2` no.
 *   · «No guardan ni bordes ni gradientes» — otro sitio, otro recorte: al
 *     guardar se copiaban ocho campos de dieciséis.
 *
 * Nada falló en ninguno de los dos casos. Salió un botón amarillo liso.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  WIDGET_OPCIONES, WIDGET_DEFECTOS, atributosDe,
  widgetSnippet, widgetSnippetEnSitio, estiloBotonWidget,
} from '../src/lib/embed.js';
import { nuevoBoton } from '../src/lib/botonesDeRegistro.js';

const WIDGET = fs.readFileSync(new URL('../public/widget.js', import.meta.url), 'utf8');

/* Lo que el widget lee de verdad, sacado de su fuente. No se importa porque
   `widget.js` lo carga una web ajena: es un script suelto, sin módulos. */
const leidos = new Map(
  [...WIDGET.matchAll(/dato\(el, '([a-z0-9-]+)', ('([^']*)'|null)\)/g)]
    .map(m => [m[1], m[3]]),
);

test('el widget no lee ninguna opción que el panel no sepa escribir', () => {
  /* Este es el que habría cazado lo del degradado: `color-2` estaba aquí y no
     en el snippet. */
  const escritos = new Set(WIDGET_OPCIONES.map(o => o.attr));
  const suyos = new Set(['gestek-evento', 'gestek-registro', 'heredar-fuente', 'fuente']);
  for (const attr of leidos.keys()) {
    if (suyos.has(attr)) continue;
    assert.ok(escritos.has(attr),
      `widget.js lee data-${attr} y nadie lo escribe: quien lo configure no verá el cambio`);
  }
});

test('y los valores por defecto son los mismos a los dos lados', () => {
  /* Distintos, el botón cambia de aspecto al copiarlo: la vista previa usa
     los de aquí y la web del organizador los de allá. */
  for (const o of WIDGET_OPCIONES) {
    if (!leidos.has(o.attr)) continue;
    assert.equal(o.def, leidos.get(o.attr),
      `data-${o.attr}: el panel supone «${o.def}» y el widget «${leidos.get(o.attr)}»`);
  }
});

test('el código que se copia lleva el degradado', () => {
  const cod = widgetSnippet({ origin: 'https://g.co', slug: 'festech', color: '#111', color2: '#eee', gradiente: '90deg' });
  assert.match(cod, /data-color-2="#eee"/);
  assert.match(cod, /data-gradiente="90deg"/);
});

test('y el borde, la sombra y el ancho', () => {
  const cod = widgetSnippet({
    origin: 'https://g.co', slug: 'x',
    borde: '2', colorBorde: '#fff', sombra: 'lg', ancho: 'completo', titulo: 'Inscripción',
  });
  /* Con `includes` y no con una expresión regular: los valores llevan `#` y
     comillas, y escaparlos es una fuente de fallos mayor que lo que se prueba. */
  for (const a of ['borde="2"', 'color-borde="#fff"', 'sombra="lg"', 'ancho="completo"', 'titulo="Inscripción"']) {
    assert.ok(cod.includes(`data-${a}`), `falta data-${a}`);
  }
});

test('lo que no se tocó no ensucia la web de nadie', () => {
  /* Un `data-boleta=""` pegado en la web de alguien invita a rellenarlo a
     mano, y un snippet de dieciséis líneas iguales no se lee. */
  const cod = widgetSnippet({ origin: 'https://g.co', slug: 'x' });
  assert.doesNotMatch(cod, /data-boleta/);
  assert.doesNotMatch(cod, /data-color-2/);
  assert.doesNotMatch(cod, /data-sombra/);
  /* Pero los cinco de siempre sí, porque son los que se retocan a mano. */
  for (const a of ['texto', 'color', 'color-texto', 'radio', 'tamano']) {
    assert.match(cod, new RegExp(`data-${a}=`), `falta data-${a}`);
  }
});

test('las dos formas de pegarlo escriben lo mismo', () => {
  /* «Quiero colocarlo yo» era una copia aparte de la lista, y por tanto un
     sitio más donde olvidarse de una opción. */
  const cfg = { origin: 'https://g.co', slug: 'x', color2: '#eee', borde: '3', sombra: 'no' };
  const a = atributosDe(cfg).map(x => x.attr).sort();
  const enSitio = widgetSnippetEnSitio(cfg);
  for (const attr of a) assert.match(enSitio, new RegExp(`data-${attr}=`), `falta data-${attr}`);
  assert.match(enSitio, /data-gestek-registro="x"/);
  assert.doesNotMatch(enSitio, /<div \n/, 'el div empieza con un salto de línea');
});

test('guardar un botón no le quita la mitad de la configuración', () => {
  /* «Y no guardan ni bordes ni gradientes». */
  const b = nuevoBoton({
    nombre: 'Home', color: '#111', color2: '#eee', gradiente: '90deg',
    borde: '2', colorBorde: '#fff', sombra: 'lg', ancho: 'completo', titulo: 'Inscripción',
  });
  for (const o of WIDGET_OPCIONES) {
    assert.ok(o.clave in b, `un botón guardado pierde «${o.clave}»`);
  }
  assert.equal(b.color2, '#eee');
  assert.equal(b.borde, '2');
});

test('el botón que vuelve de la lista genera el mismo código que se vio', () => {
  /* Es la comprobación de punta a punta: configurar, guardar, y volver a
     copiar días después tiene que dar el botón de la vista previa. */
  const cfg = { color: '#111', color2: '#eee', borde: '2', colorBorde: '#fff', sombra: 'lg' };
  const b = nuevoBoton({ ...cfg, nombre: 'Home' });
  const alGuardar = widgetSnippet({ origin: 'https://g.co', slug: 'x', ...cfg, origen: b.origen });
  const alVolver  = widgetSnippet({ origin: 'https://g.co', slug: 'x', ...b });
  assert.equal(alVolver, alGuardar);
});

test('la vista previa y el widget pintan el mismo fondo', () => {
  const con = estiloBotonWidget({ color: '#111', color2: '#eee', gradiente: '90deg' });
  assert.equal(con.background, 'linear-gradient(90deg, #111, #eee)');
  /* Sin segundo color no hay degradado: la casilla apagada tiene que borrarlo,
     no dejar un `linear-gradient` de un color contra sí mismo. */
  assert.equal(estiloBotonWidget({ color: '#111' }).background, '#111');
});

test('la sombra por defecto de la vista previa es la del widget', () => {
  /* `WIDGET_DEFECTOS` no traía `sombra`, así que la vista previa salía sin
     sombra y el botón de verdad con la mediana. */
  assert.equal(WIDGET_DEFECTOS.sombra, 'md');
  assert.equal(estiloBotonWidget({}).boxShadow, '0 6px 16px rgba(0,0,0,.20)');
});
