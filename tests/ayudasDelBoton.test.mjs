/* Las ayudas del código que se pega en otra web.
 *
 * ── El hueco ─────────────────────────────────────────────────────────────
 *
 * «Antes de copiar: N cosas que evitan que se vea mal en tu web» existía sólo
 * al exportar una SECCIÓN. Al botón de registro —que es el código que más se
 * pega— no le salía ninguna. Y dos de esas advertencias describen exactamente
 * lo que pasó en FESTECH: su copia del script es vieja y está retocada a mano,
 * así que no manda el color de la página y el formulario sale oscuro sobre su
 * azul noche.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { EMBED_RECOMENDACIONES, recomendacionesPara } from '../src/lib/embed.js';

const leer = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

test('el generador del botón enseña sus recomendaciones', () => {
  const s = sinComentarios(leer('src/pages/events/workspace/PublicacionSection.jsx'));
  assert.match(s, /<Recomendaciones ambito="boton"/);
});

test('y son las del botón, no las de una sección', () => {
  /* «Una misma sección, una sola vez por página» es lo CONTRARIO para el
     botón: está pensado para repetirse — por eso existe «quiero colocarlo
     yo». Un consejo que contradice lo que la pantalla ofrece es peor que
     ninguno. */
  const boton = recomendacionesPara({}, 'boton').map(r => r.clave);
  assert.ok(!boton.includes('una-por-pagina'));
  assert.ok(!boton.includes('sin-alto-fijo'), 'la ventana del botón no va en el flujo de la página');
  /* Las que sí son suyas, y son las que describen lo de FESTECH. */
  assert.ok(boton.includes('no-tocar-el-script'));
  assert.ok(boton.includes('volver-a-pegar'));
  assert.ok(boton.includes('boton-color-de-tu-web'));
});

test('la sección sigue viendo las suyas', () => {
  /* `ambito` por defecto es 'seccion', para que llamar como antes devuelva lo
     de antes. */
  const antes = recomendacionesPara({ tema: 'auto', autoAlto: true }).map(r => r.clave);
  for (const c of ['no-tocar-el-script', 'tema-claro', 'sin-alto-fijo', 'una-por-pagina']) {
    assert.ok(antes.includes(c), `la sección perdió «${c}»`);
  }
  assert.ok(!antes.includes('boton-guardalo'));
});

test('cada recomendación dice dónde aplica', () => {
  for (const r of EMBED_RECOMENDACIONES) {
    assert.ok(Array.isArray(r.ambito) && r.ambito.length, `«${r.clave}» no dice su ámbito`);
    for (const a of r.ambito) assert.ok(['seccion', 'boton'].includes(a), `ámbito raro: ${a}`);
    assert.ok(r.titulo && r.detalle, `«${r.clave}» sin texto`);
  }
});

test('el panel de recomendaciones es uno solo', () => {
  /* Copiado en el generador del botón, los dos textos se separan — y aquí el
     texto ES la ayuda. */
  assert.match(leer('src/components/Recomendaciones.jsx'), /export default function Recomendaciones/);
  for (const f of ['src/pages/events/editor/ExportIframeModal.jsx',
                   'src/pages/events/workspace/PublicacionSection.jsx']) {
    const s = leer(f);
    assert.match(s, /import Recomendaciones from/, `${f} no lo importa`);
    assert.doesNotMatch(sinComentarios(s), /function Recomendaciones\(/, `${f} tiene su propia copia`);
  }
});

test('salen antes de copiar, no al pie', () => {
  /* Después ya está pegado en la web del cliente y nadie vuelve. */
  const s = leer('src/pages/events/workspace/PublicacionSection.jsx');
  /* Contra el cuadro de codigo de verdad, no contra `widgetSnippet`, que
     aparece arriba del todo en el import y hace que la comparacion no mida
     nada — asi paso esta prueba en el primer intento. */
  assert.ok(s.indexOf('<Recomendaciones') < s.lastIndexOf('<textarea readOnly value={snippet}'),
    'las recomendaciones salen después del código');
});
