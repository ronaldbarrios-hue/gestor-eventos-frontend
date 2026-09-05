/* Una entrada que parece válida y no está pagada.
 *
 * ── Lo que pasaba ────────────────────────────────────────────────────────
 *
 * `emitido` cubre dos cosas que en pantalla se veían idénticas: una reserva
 * gratuita —legítimamente «apartada»— y una compra que se abandonó o cuya
 * tarjeta fue rechazada. Las dos enseñaban el QR grande y, debajo, «Guárdala
 * en el móvil: tu QR sirve para entrar y para los stands».
 *
 * La segunda persona llega a la puerta creyendo que tiene entrada. El escáner
 * la deja pasar con un aviso al staff —«boleta emitida sin pago confirmado»—,
 * o sea que enterarse depende de que alguien lea una línea pequeña con una
 * fila detrás. El peor sitio y el peor momento.
 *
 * ── Por qué hace falta el precio del tipo ────────────────────────────────
 *
 * Se comprobó contra producción: `precio_pagado is null` NO distingue, porque
 * las reservas gratuitas apartadas también lo tienen en null. Sin
 * `tipo.precio` no hay forma de saber cuál es cuál, y avisar a quien reservó
 * gratis sería asustar sin motivo.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const TICKET = 'src/pages/public/MiTicketPage.jsx';
const leer = () => readFileSync(TICKET, 'utf8');
/* Sin comentarios: los motivos escritos CITAN las frases de la pantalla para
   explicar qué estaba mal —«enseñaban el QR y debajo Guárdala en el móvil»— y
   sin quitarlos la prueba se encuentra a sí misma antes que al código. */
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('sólo avisa cuando la boleta costaba dinero y no se pagó', () => {
  const src = leer();
  assert.match(src, /const costaba = Number\(ticket\.tipo\?\.precio\) > 0;/,
    'se dejó de mirar el precio: una reserva gratis apartada volvería a recibir un aviso de pago');
  assert.match(src, /ticket\.estado === 'emitido' && costaba && !Number\(ticket\.precio_pagado\)/,
    'cambió la condición del aviso');
});

test('no se le promete que el QR sirve para entrar', () => {
  /* Prometerlo es lo que la manda a la puerta con la entrada sin pagar.
     Se vigila la intención y no una frase concreta: el texto puede mejorar, lo
     que no puede es volver a prometer entrada sin pago. */
  const src = sinComentarios(leer());
  const i = src.indexOf('Guárdala en el móvil');
  const zona = src.slice(Math.max(0, i - 400), i + 200);
  assert.ok(zona.includes('sinPagar'),
    'el texto de debajo del QR dejó de mirar si está pagada');
  assert.match(src, /Todavía no da entrada/,
    'se perdió el aviso de que ese código todavía no da entrada');
  assert.match(src, /Tu pago no se completó/,
    'desapareció el aviso de pago sin terminar');
});

test('quien acaba de pagar no recibe «tu pago no se completó»', () => {
  /* Con PSE o transferencia la confirmación tarda minutos, a veces horas. La
     pasarela devuelve con `?pago=pendiente`, y decirle a esa persona que su
     pago falló la haría pagar dos veces. Se distingue por de dónde viene. */
  const src = leer();
  assert.match(src, /const volviendoDePagar = \['pendiente', 'wompi'\]\.includes\(params\.get\('pago'\)\)/,
    'se dejó de mirar de dónde viene: un pago en curso se contaría como fallido');
  assert.match(src, /const confirmando = sinPagar && volviendoDePagar/,
    'desapareció el estado «confirmando»');
  assert.match(src, /Estamos confirmando tu pago/,
    'no se dice que el pago está en curso');
});

test('un pago rechazado se dice, y lo primero es que no se cobró', () => {
  /* La pasarela devuelve a la página del evento con `?pago=fallo` y no lo leía
     nadie: se volvía de que rechazaran la tarjeta como si no hubiera pasado
     nada. La duda que trae a esa persona es una sola. */
  const src = readFileSync('src/pages/public/EventoPublicoPage.jsx', 'utf8');
  assert.match(src, /params\.get\('pago'\) === 'fallo'/,
    'la vuelta de un pago rechazado vuelve a pasar en silencio');
  assert.match(src, /No se te cobró nada\./,
    'no se contesta lo único que se pregunta al volver de un pago rechazado');
});

test('el servidor manda el precio del tipo', () => {
  /* Sin él la pantalla no puede distinguir, y el aviso no saldría nunca. */
  const back = '../../../../gestor-eventos-backend/routes/eventos.publicos.js';
  let src;
  try { src = readFileSync(back, 'utf8'); } catch { return; }  // repos separados
  assert.match(src, /tipo:ticket_types!ticket_type_id\(nombre, descripcion, precio, currency/,
    'la ruta de la boleta dejó de mandar el precio del tipo');
});

test('«Terminar el pago» retoma ESTA boleta, no empieza otra compra', () => {
  /* El botón era un enlace a la página del evento, o sea a empezar una compra
     nueva: salía una segunda boleta, la primera se quedaba sin pagar para
     siempre, y quien organiza veía dos apuntes de la misma persona sin saber
     cuál era cuál. Y la propia frase de al lado —«si ya pagaste, escribe a
     quien organiza»— reconocía que el camino que ofrecía era el equivocado. */
  const src = leer();
  assert.doesNotMatch(src, /href=\{`\/explorar\/\$\{ticket\.evento\.slug\}`\}[\s\S]{0,200}Terminar el pago/,
    'el botón volvió a mandar a empezar otra compra');
  assert.match(src, /pagosApi\.reanudarPago\(codigo\)/,
    'no se retoma el pago de esta boleta');

  /* Si la confirmación llegó mientras miraba la pantalla, eso no es un error:
     es la mejor noticia posible y se recarga en vez de enseñar un fallo. */
  assert.match(src, /if \(e\.response\?\.data\?\.ya_pagada\) \{ window\.location\.reload\(\); return; \}/,
    'a quien ya le confirmaron el pago se le enseña un error');

  /* Y el mismo cerrojo de doble toque que en la compra: dos toques abrirían
     dos apuntes de pago para la misma boleta. */
  assert.match(src, /if \(enviando\.current\) return;/,
    'falta el cerrojo del doble toque en el botón de pago');
});

test('el servidor retoma la boleta con SU referencia y SU precio', () => {
  const back = '../../../../gestor-eventos-backend/routes/pagos.js';
  let src;
  try { src = readFileSync(back, 'utf8').replace(/\r/g, ''); } catch { return; }  // repos separados

  /* La referencia es la de siempre, `tx_<id>`, así que el webhook que ya
     existe confirma la boleta que ya existe. Ése es todo el truco. */
  assert.match(src, /router\.post\('\/eventos\/publicos\/ticket\/:codigo\/reanudar-pago'/,
    'desapareció la ruta que retoma un pago a medias');
  const ruta = src.slice(src.indexOf("/reanudar-pago'"));
  assert.match(ruta.slice(0, 6000), /const referencia = `tx_\$\{ticket\.id\}`;/,
    'la referencia cambió: el webhook confirmaría otra cosa, o ninguna');

  /* El precio sale del apunte pendiente y no de la lista de hoy: es lo que esa
     persona ya había aceptado pagar. Recalcularlo puede cobrarle más —se acabó
     el early bird, su código caducó— y enterarse en la pasarela es la peor
     forma de enterarse. */
  assert.match(ruta.slice(0, 6000), /let monto = Number\(previa\?\.monto\) \|\| 0;/,
    'el precio dejó de salir del intento anterior: podría cobrarse de más');

  /* Y no se le cobra a quien ya pagó. */
  assert.match(ruta.slice(0, 6000), /if \(ticket\.estado !== 'emitido' \|\| Number\(ticket\.precio_pagado\) > 0\)/,
    'se puede pedir el enlace de pago de una boleta ya pagada');
});
