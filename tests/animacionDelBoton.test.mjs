/* La animación que se elige en el panel es la que hace el botón en la web.
 *
 * ── Por qué hace falta un test para esto ─────────────────────────────────
 *
 * La lista de animaciones está escrita DOS veces: en `src/lib/embed.js`, que
 * es lo que enseña el panel y lo que anima la vista previa, y en
 * `public/widget.js`, que es lo que corre en la web del organizador. No se
 * puede escribir una sola porque el widget lo carga una página ajena: es un
 * script suelto, sin módulos, sin build y sin importaciones.
 *
 * Es exactamente la forma en que esta base ha fallado siempre — la misma que
 * dejó el degradado en el panel y fuera del código que se copiaba. Separadas,
 * el organizador elige «Se levanta», la vista previa se levanta, y el botón de
 * su web se queda quieto. Nada falla, nada avisa: hay un botón que no hace lo
 * que prometió la pantalla.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { WIDGET_ANIMACIONES, WIDGET_OPCIONES, animacionDe, widgetSnippet } from '../src/lib/embed.js';

const raiz = path.resolve(import.meta.dirname, '..');
const WIDGET = fs.readFileSync(path.join(raiz, 'public/widget.js'), 'utf8');

/* La tabla del widget, sacada de su fuente. No se importa porque `widget.js`
   no es un módulo: es lo que se sirve tal cual a webs ajenas. */
const tablaDelWidget = () => {
  const i = WIDGET.indexOf('var ANIMACIONES = {');
  assert.ok(i > 0, 'no encontré la tabla de animaciones en public/widget.js');
  const cuerpo = WIDGET.slice(i, WIDGET.indexOf('\n  };', i));
  const filas = new Map();
  for (const m of cuerpo.matchAll(/^\s{4}(\w+)\s*:\s*\{([^}]*)\}/gm)) filas.set(m[1], m[2]);
  return filas;
};

test('las dos listas de animaciones tienen las mismas', () => {
  const aqui = WIDGET_ANIMACIONES.map(a => a.clave).sort();
  const alli = [...tablaDelWidget().keys()].sort();
  assert.deepEqual(alli, aqui,
    'el panel y el widget no ofrecen las mismas animaciones');
});

test('y cada una hace lo mismo a los dos lados', () => {
  const alli = tablaDelWidget();
  for (const a of WIDGET_ANIMACIONES) {
    const suyo = alli.get(a.clave) || '';
    for (const [prop, valor] of Object.entries(a.hover)) {
      assert.ok(suyo.includes(valor),
        `«${a.label}»: el panel hace ${prop}: ${valor} y el widget no`);
    }
    /* Y al revés: una animación que en el widget mueve algo y en el panel no,
       es una vista previa que miente por el otro lado. */
    if (!a.hover.transform) {
      assert.ok(!suyo.includes('transform'),
        `«${a.label}»: el widget mueve el botón y la vista previa no lo enseña`);
    }
    assert.equal(suyo.includes('pulso: true'), Boolean(a.pulso),
      `«${a.label}»: el pulso no coincide entre panel y widget`);
  }
});

test('lo de siempre sigue siendo lo de por defecto', () => {
  /* Un botón ya pegado en la web de un cliente no puede cambiar de
     comportamiento porque nosotros añadamos un menú. El código que ya está
     pegado no lleva `data-animacion`, así que lo que decide es este defecto. */
  const opcion = WIDGET_OPCIONES.find(o => o.clave === 'animacion');
  assert.ok(opcion, 'la animación no está en la tabla de opciones del botón');
  assert.equal(opcion.def, 'brillo');
  assert.equal(WIDGET_ANIMACIONES[0].clave, 'brillo', 'el primero del menú es el que sale al abrirlo');
  assert.match(WIDGET, /dato\(el, 'animacion', 'brillo'\)/,
    'el widget supone otra animación por defecto que el panel');
});

test('un nombre con errata no deja el botón muerto', () => {
  /* `data-animacion` se puede retocar a mano en el HTML. Un nombre que no
     existe tiene que caer en lo de siempre, no en «no hace nada»: un botón que
     deja de responder al ratón parece roto. */
  assert.equal(animacionDe('elevar').clave, 'elevar');
  assert.equal(animacionDe('rebota-mucho').clave, 'brillo');
  assert.equal(animacionDe(undefined).clave, 'brillo');
  assert.match(WIDGET, /ANIMACIONES\.brillo;/, 'el widget no tiene el mismo respaldo');
});

test('la animación viaja en el código que se pega', () => {
  /* El fallo del degradado, otra vez: elegirla en el panel y que no salga en
     el `data-`. */
  const cod = widgetSnippet({ origin: 'https://g.co', slug: 'festech', animacion: 'elevar' });
  assert.ok(cod.includes('data-animacion="elevar"'), 'la animación elegida no sale en el código');

  /* Y la de por defecto no ensucia la web de nadie. */
  const liso = widgetSnippet({ origin: 'https://g.co', slug: 'festech' });
  assert.ok(!liso.includes('data-animacion'), 'se escribe la animación por defecto sin hacer falta');
});

test('quien pidió que nada se mueva no ve nada moverse', () => {
  /* Para algunas personas el movimiento marea; no es una preferencia
     estética. Se comprueba en el widget —que es quien ve al visitante— y a
     propósito NO en la vista previa del panel: quien configura tiene que ver
     lo que verá su público. */
  assert.match(WIDGET, /prefers-reduced-motion: reduce/,
    'el widget no mira si quien visita pidió que nada se mueva');
  const i = WIDGET.indexOf("b.addEventListener('mouseenter'");
  const fin = WIDGET.indexOf("b.addEventListener('click'", i);
  const zona = WIDGET.slice(i, fin);
  assert.match(zona, /anim\.transform && !quieto/,
    'el desplazamiento no respeta «reducir movimiento»');
  assert.match(zona, /anim\.pulso && !quieto/, 'el pulso no respeta «reducir movimiento»');
});
