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
