/* Que las tres salidas de la entrada no se vuelvan a separar.
 *
 * ── El fallo que esto evita, y que ya ocurrió ────────────────────────────
 *
 * El diseñador de escarapelas metía en el QR la URL `…/mi-ticket/ABCD1234`
 * mientras la boleta digital metía el token firmado. Resultado: **la escarapela
 * impresa no pasaba el control de ingreso** — el servidor recibía una URL donde
 * esperaba una firma y contestaba «QR inválido». Un papel con un QR que no
 * abría ninguna puerta. Está contado entero en `src/lib/qrEscaneado.js`.
 *
 * La causa no fue un descuido de programación: fue que dos pantallas trataban
 * el mismo objeto como si fueran dos cosas, y cada una decidió por su cuenta
 * qué meter en el QR. Mientras eso dependa de que alguien se acuerde, vuelve.
 *
 * Correr: node --test tests/entrada.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (p) => readFileSync(join(RAIZ, p), 'utf8');

const COMPONENTE = 'src/components/public/DescargarEntrada.jsx';

test('las tres salidas se piden desde un solo sitio', () => {
  /* Si mañana alguien vuelve a llamar a una de las tres desde una pantalla,
     esa pantalla decide su propio `qrValue` — y ahí es donde nace la escarapela
     que no abre la puerta. */
  const generadores = ['descargarBoletaPdf', 'descargarQrPng', 'descargarTarjetaPng'];
  const permitidos = new Set([
    COMPONENTE,
    'src/lib/boletaPdf.jsx',
    'src/lib/qrPng.jsx',
    'src/lib/tarjetaPng.jsx',
    /* No hay más excepciones, y se comprobó antes de escribir la lista: al
       mirarlo, el panel del organizador no llama a ninguna de las tres. Una
       excepción que no excusa nada sólo sirve para que la prueba deje pasar
       algo el día que ese archivo cambie. */
  ]);

  const culpables = [];
  const recorrer = (dir) => {
    for (const nombre of readdirSync(dir)) {
      const abs = join(dir, nombre);
      if (statSync(abs).isDirectory()) { recorrer(abs); continue; }
      if (!/\.jsx?$/.test(nombre)) continue;
      const rel = abs.slice(RAIZ.length + 1).replace(/\\/g, '/');
      if (permitidos.has(rel)) continue;
      const txt = readFileSync(abs, 'utf8');
      for (const g of generadores) {
        /* Sólo la llamada, no el import ni el nombre en un comentario. */
        if (new RegExp(`${g}\\s*\\(`).test(txt)) culpables.push(`${rel} → ${g}()`);
      }
    }
  };
  recorrer(join(RAIZ, 'src'));

  assert.deepEqual(culpables, [],
    'estas pantallas generan una salida de la entrada por su cuenta: usa <DescargarEntrada>');
});

test('el mismo qrValue va a las tres', () => {
  const src = leer(COMPONENTE);
  /* Una sola variable, calculada una vez, pasada a las tres. Si alguien mete
     un segundo valor, esto deja de casar. */
  for (const g of ['descargarBoletaPdf', 'descargarQrPng', 'descargarTarjetaPng']) {
    assert.ok(src.includes(g), `${g} ya no se llama desde el componente`);
  }
  assert.equal(
    (src.match(/qrValue/g) || []).length >= 3, true,
    'el componente ya no reparte el mismo qrValue a las tres salidas',
  );
  assert.ok(!/qr_token|ticket\.codigo\s*\|\|/.test(src.replace(/`qr-\$\{ticket\.codigo\}`/g, '')),
    'el componente calcula un valor de QR propio en vez de usar el que recibe');
});

test('el PDF acepta el diseño del organizador', () => {
  /* Era la única de las tres salidas que ignoraba la marca: un evento con
     White Label entregaba un PDF gris. Y es el archivo que más se reenvía. */
  const pdf = leer('src/lib/boletaPdf.jsx');
  assert.match(pdf, /design\s*=\s*null/, 'descargarBoletaPdf ya no recibe `design`');
  assert.match(pdf, /design\?\.color1/, 'el PDF no usa el color de la marca');
  assert.match(pdf, /design\?\.logo/, 'el PDF no usa el logo de la marca');

  const comp = leer(COMPONENTE);
  assert.match(comp, /walletConfig\(/, 'el componente no resuelve la variante del organizador');
  assert.match(comp, /design,/, 'el componente no le pasa el diseño al PDF');
});
