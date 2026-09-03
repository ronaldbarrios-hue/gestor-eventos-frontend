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
const { medidas, versionParaToken, ETIQUETA, PUNTOS_POR_MM, normalizarEtiqueta, LIMITES } =
  await import(pathToFileURL(join(RAIZ, 'src/lib/etiquetaTermica.js')).href);

/* El catálogo de piezas, con el mismo `await` de nivel superior: dentro de un
   `test()` síncrono un `await import` no compila. */
const piezas = await import(pathToFileURL(join(RAIZ, 'src/lib/piezasBranding.js')).href);

/* 253 es el largo real, medido contra un token de producción el 2026-09-02. */
const TOKEN_REAL = 'x'.repeat(253);

test('el token de hoy da un QR de versión 12', () => {
  /* Comprobado empíricamente contra `qrcode.react`: con nivel M y sin margen,
     el viewBox de un token de 253 caracteres es 65×65. */
  assert.equal(versionParaToken(253), 12);
  assert.equal(medidas(TOKEN_REAL).modulos, 65);
});

test('el QR cabe, y con al menos 3 puntos por módulo', () => {
  const m = medidas(TOKEN_REAL);
  assert.equal(m.cabe, true, m.motivo || '');

  /* Tres es el SUELO, no el valor. Con el rollo real —100 × 50 mm y un cuadro
     pedido de 4×4 cm— caben cuatro, y cada punto más es un lector menos que
     duda con la escarapela doblada. */
  assert.ok(m.puntos_por_modulo >= 3, `sólo ${m.puntos_por_modulo} puntos por módulo`);
  assert.equal(m.puntos_por_modulo, 4);

  /* 73 módulos (65 + 4 de margen por lado) × 4 puntos = 292. */
  assert.equal(m.lado_puntos, 292);
  assert.equal(m.lado_mm, 292 / PUNTOS_POR_MM);
});

test('el QR ocupa el cuadrado pedido, aunque el código mida menos', () => {
  /* Se pidió «4×4 cm centrado». 40 mm exactos darían 4,38 puntos por módulo, y
     un módulo que no cae en punto entero lo redondea el cabezal a su manera:
     el borde sale con diente y ahí es donde un lector barato empieza a dudar.

     Así que el código se imprime a 36,5 mm y se CENTRA en los 40 reservados. El
     hueco es el pedido; lo que cambia es que sale limpio. */
  const m = medidas(TOKEN_REAL);
  assert.equal(m.caja_mm, 40);
  assert.ok(m.lado_mm <= m.caja_mm, 'el código se sale de su cuadrado');
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

test('la etiqueta cuelga de una pantalla del panel', () => {
  /* Estuvo construida entera —medidas, QR, CSS de impresión y estas mismas
     pruebas— y sin ninguna pantalla desde la que llegar a ella. Para quien usa
     la plataforma, eso es lo mismo que no existir: las pruebas pasaban y no
     había forma de imprimir una escarapela.

     Por eso no basta con que el componente esté bien: tiene que estar
     ENCHUFADO. Se comprueba el camino entero, sección → vista → componente. */
  const seccion = readFileSync(join(RAIZ, 'src/pages/events/workspace/asistentes/EtiquetadoraSection.jsx'), 'utf8');
  assert.match(seccion, /ImprimirEtiquetas/, 'la pantalla ya no manda a imprimir');

  const acred = readFileSync(join(RAIZ, 'src/pages/events/workspace/asistentes/AcreditacionSection.jsx'), 'utf8');
  assert.match(acred, /EtiquetadoraSection/, 'la etiquetadora ya no cuelga de Acreditación');
  assert.match(acred, /'etiquetas'/, 'la vista de imprimir ya no se puede elegir');
});

test('las medidas son del evento, no del código', () => {
  /* Estaban escritas dentro: 100×50 porque nos lo dijeron por WhatsApp. Servía
     para un rollo y para ninguno más — y el siguiente organizador con otro rollo
     no tenía nada que tocar. */
  const e = normalizarEtiqueta({ ancho: 70, alto: 40, qr_objetivo: 30 });
  assert.equal(e.ancho, 70);
  assert.equal(e.alto, 40);

  /* Fuera de los topes se acota en vez de aceptarse: una etiqueta de 5 mm o de
     3 metros no existe, y guardarla dejaría el diseño roto sin decir nada. */
  const enorme = normalizarEtiqueta({ ancho: 9999, alto: -5 });
  assert.equal(enorme.ancho, LIMITES.ancho.max);
  assert.equal(enorme.alto, LIMITES.alto.min);

  /* Y todo cae en punto entero a 203 dpi: 0,1 mm no es imprimible y el cabezal
     redondearía por su cuenta. */
  const raro = normalizarEtiqueta({ ancho: 100.07 });
  assert.equal(Number.isInteger(raro.ancho * 8), true, `${raro.ancho} no cae en punto`);
});

test('el QR se sube arriba cuando al lado no cabe el nombre', () => {
  /* La regla de espacio, que es la decisión de verdad: un nombre de dos
     apellidos necesita unos 35 mm de ancho para dos líneas a 6 mm. En una
     etiqueta estrecha y alta, al lado no cabe nada y debajo sí. */
  const ancha = medidas(TOKEN_REAL, { ancho: 100, alto: 50, qr_objetivo: 40 });
  assert.equal(ancha.disposicion, 'lado');

  const estrecha = medidas(TOKEN_REAL, { ancho: 60, alto: 90, qr_objetivo: 45 });
  assert.equal(estrecha.disposicion, 'debajo');

  /* Y cuando el organizador fuerza una disposición que no da, se avisa en vez
     de imprimir mil escarapelas con el nombre a un milímetro. */
  const forzada = medidas(TOKEN_REAL, { ancho: 100, alto: 50, qr_objetivo: 40, disposicion: 'debajo' });
  assert.equal(forzada.nombre_cabe, false);
  assert.match(forzada.aviso, /no se va a leer/i);
});

test('cada pieza del catálogo se puede imprimir tal como viene', () => {
  /* El catálogo no vale de nada si un tipo trae medidas con las que no cabe
     nada. Esto lo comprueba contra un token REAL de 253 caracteres, que es el
     caso que decide — no contra un valor corto de prueba. */
  for (const t of piezas.TIPOS_PIEZA) {
    const r = piezas.revisarPieza(piezas.piezaDesdeTipo(t.id));
    assert.equal(r.cabe, true, `«${t.nombre}» viene con medidas donde el QR no cabe: ${r.motivo}`);
  }
});

test('la manilla se imprime con serial, y con QR firmado no cabría', () => {
  /* Es la restricción que hay que saber ANTES de comprar el rollo: el QR del
     token firmado necesita 28 mm de alto y una manilla tiene 25. No es diseño,
     es que no entra.
     
     Y con el código corto sí: 8 caracteres son un QR de versión 1. */
  const manilla = piezas.piezaDesdeTipo('manilla');

  /* La manilla viene con serial: el código escrito. No es una preferencia
     estética —el QR firmado necesita 28 mm de alto y una manilla tiene 25— y
     además el texto aguanta el roce de tres días, que el cuadrado no. */
  assert.equal(manilla.formato_codigo, 'serial', 'la manilla dejó de venir con serial');
  assert.equal(piezas.revisarPieza(manilla).cabe, true);

  /* Y si alguien la cambia a QR con la firma, se le dice que no entra en vez de
     dejarle imprimir dos mil manillas ilegibles. */
  const conFirma = piezas.revisarPieza({ ...manilla, formato_codigo: 'qr', qr_contenido: 'token' });
  assert.equal(conFirma.cabe, false, 'la firma cabría en una manilla de 25 mm, y no cabe');
  /* Y cuando no cabe se dice cómo arreglarlo: «no cabe» a secas deja a alguien
     creyendo que las manillas no se pueden usar. */
  assert.match(conFirma.arreglo, /código corto/i);
});
