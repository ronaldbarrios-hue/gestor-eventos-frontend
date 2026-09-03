/* Que la escarapela térmica siga cabiendo, y que el QR siga siendo legible.
 *
 * ── Por qué esto se comprueba ────────────────────────────────────────────
 *
 * El QR de la escarapela lleva el token firmado, y su tamaño no es una
 * decisión de diseño: sale de cuántos caracteres tiene el token. Hoy son 253
 * —medidos contra producción— y eso obliga a un QR versión 12, 65×65 módulos,
 * 73 con el margen obligatorio. A 3 puntos por módulo y 203 dpi son 27,4 mm.
 *
 * El día que el token crezca —una firma más larga, un campo más— el QR sube de
 * versión y **deja de caber**, o peor: cabe pero con menos de 3 puntos por
 * módulo y empieza a fallar sólo a veces, que es más difícil de diagnosticar
 * que fallar siempre.
 *
 * Correr: node --test tests/etiqueta.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
/* `pathToFileURL` y no la ruta a secas: en Windows un `C:\…` no es una URL
   válida para el cargador de módulos y el import revienta. */
const { medidas, versionParaToken, ETIQUETA, PUNTOS_POR_MM } =
  await import(pathToFileURL(join(RAIZ, 'src/lib/etiquetaTermica.js')).href);

/* 253 es el largo real, medido contra un token de producción el 2026-09-02. */
const TOKEN_REAL = 'x'.repeat(253);

test('el token de hoy da un QR de versión 12', () => {
  /* Comprobado empíricamente contra `qrcode.react`: con nivel M y sin margen,
     el viewBox de un token de 253 caracteres es 65×65. */
  assert.equal(versionParaToken(253), 12);
  assert.equal(medidas(TOKEN_REAL).modulos, 65);
});

test('el QR cabe, y con 3 puntos por módulo', () => {
  const m = medidas(TOKEN_REAL);
  assert.equal(m.cabe, true, m.motivo || '');

  /* 73 módulos (65 + 4 de margen por lado) × 3 puntos = 219 puntos. */
  assert.equal(m.lado_puntos, 219);
  assert.equal(m.lado_mm, 219 / PUNTOS_POR_MM);
  assert.ok(m.lado_mm > 27 && m.lado_mm < 28, `salen ${m.lado_mm} mm`);
});

test('cae en punto entero: nada de medias tintas a 203 dpi', () => {
  /* Una medida que no cae en punto entero la redondea el cabezal por su
     cuenta, y el borde del QR sale con diente. */
  const m = medidas(TOKEN_REAL);
  assert.equal(Number.isInteger(m.lado_puntos), true);
  assert.equal(Number.isInteger(ETIQUETA.ancho * PUNTOS_POR_MM), true);
  assert.equal(Number.isInteger(ETIQUETA.alto * PUNTOS_POR_MM), true);
});

test('queda sitio para el nombre', () => {
  const m = medidas(TOKEN_REAL);
  /* Por debajo de 40 mm un nombre de dos apellidos no entra en dos líneas a 6
     mm de altura, y la escarapela deja de leerse de lejos — que es para lo
     único que sirve. */
  assert.ok(m.texto_mm >= 40, `sólo quedan ${m.texto_mm} mm para el texto`);
});

test('avisa cuando el token crece hasta no caber', () => {
  /* No es hipotético: basta con añadirle un campo a la firma. Lo que no puede
     pasar es que se imprima un QR ilegible sin que nadie lo sepa. */
  const enorme = medidas('x'.repeat(2000));
  assert.equal(enorme.cabe, false);
  assert.match(enorme.motivo, /no cabe/i);

  /* Y un token algo mayor sube de versión pero todavía entra: el aviso tiene
     que distinguir «creció» de «ya no vale». */
  const mayor = medidas('x'.repeat(300));
  assert.equal(mayor.version, 13);
  assert.equal(mayor.cabe, true);
});

test('la etiqueta se imprime una por página y sin margen del navegador', () => {
  /* Una etiquetadora no tiene hoja: si el navegador manda una A4 con seis
     escarapelas, imprime la primera y tira el resto. Y el margen por defecto
     del navegador deja el diseño a escala sobre 55 mm de alto. */
  const src = readFileSync(join(RAIZ, 'src/components/public/ImprimirEtiquetas.jsx'), 'utf8');
  /* `[\s\S]*?` y no `[^}]*`: dentro del @page hay un `${...}` de plantilla,
     con su propia llave de cierre, y la clase negada se paraba ahí — la prueba
     fallaba diciendo que faltaba un margen que sí estaba. */
  assert.match(src, /@page\s*\{[\s\S]*?margin:\s*0/, 'el @page ya no quita el margen del navegador');
  assert.match(src, /break-after:\s*page/, 'las etiquetas ya no salen una por página');
  assert.match(src, /print-color-adjust:\s*exact/, 'sin esto el navegador baja el contraste del QR');
});
