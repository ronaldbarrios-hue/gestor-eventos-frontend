/* Lo que la página pública manda cuando alguien compra.
 *
 * ── Qué se protege aquí ──────────────────────────────────────────────────
 *
 * El panel deja crear promociones desde hace tiempo: se les pone código,
 * porcentaje, vigencia y límite de usos, y la lista se ve. Lo que no existía
 * era el otro extremo — en la pantalla de compra no había dónde escribir el
 * código, y `promocionesApi.validar` no lo llamaba NI UN ARCHIVO. El
 * organizador anunciaba «FESTECH20» y la plataforma cobraba el precio entero.
 *
 * Y la regla que no se puede romper nunca: **al servidor se le manda el CÓDIGO,
 * jamás el importe**. A la pasarela le decimos nosotros cuánto cobrar; si el
 * importe saliera de aquí, cambiarlo en las herramientas del navegador sería
 * comprar a lo que uno quisiera.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const COMPRA = 'src/pages/public/EventoPublicoPage.jsx';
const leer = (p) => readFileSync(p, 'utf8');

/* Sin comentarios: este archivo y el que revisa EXPLICAN lo que ya no se hace,
   y ese texto trae justo las palabras que la prueba busca. */
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('la pantalla de compra manda el código y nunca el importe', () => {
  const src = sinComentarios(leer(COMPRA));
  assert.match(src, /promocion_codigo: promo\.codigo/,
    'no se manda el código: la promoción no llega al cobro');
  /* Un importe solo viaja si es una CLAVE de lo que se manda, y una clave
     empieza una linea. La primera version de esta prueba buscaba
     `precio.*:.*precio` en todo el archivo y se delataba con
     `promo ? promo.precio : precioLista`, que es un ternario para pintar, no
     un envio. */
  const cuerpo = src.slice(src.indexOf('const submit = async'), src.indexOf('  return ('));
  const claves = cuerpo.split('\n')
    .filter((l) => /^\s*(precio|monto|amount|total|importe)\s*:/.test(l));
  assert.deepEqual(claves, [], `se esta mandando un importe al servidor:${claves.join('')}`);
});

test('alguien llama a validar: la promoción existe de punta a punta', () => {
  const usos = ['src/pages', 'src/components']
    .flatMap((d) => execGrep(d))
    .filter(Boolean);
  assert.ok(usos.length > 0,
    'nadie llama a promocionesApi.validar — las promociones se crean y no descuentan nada');
});

/* Un grep hecho a mano: `child_process` aquí sería un proceso por carpeta para
   buscar una cadena. */
function execGrep(dir) {
  const out = [];
  const anda = (d) => {
    for (const f of readdirSync(d)) {
      const ruta = `${d}/${f}`;
      if (statSync(ruta).isDirectory()) anda(ruta);
      else if (/\.jsx?$/.test(f) && /promocionesApi\.validar/.test(readFileSync(ruta, 'utf8'))) out.push(ruta);
    }
  };
  anda(dir);
  return out;
}

test('el descuento se pide dentro del modal de compra, no en otro componente', () => {
  const src = leer(COMPRA);
  const iReserva = src.indexOf('export function ReservaModal');
  const iSiguiente = src.indexOf('export function ConfirmacionModal');
  const dentro = src.slice(iReserva, iSiguiente);
  for (const pieza of ['const [promoCodigo', 'const aplicarPromo', 'onClick={aplicarPromo}']) {
    assert.ok(dentro.includes(pieza),
      `«${pieza}» quedó fuera de ReservaModal: el botón llamaría a una función que no existe en su componente`);
  }
});
