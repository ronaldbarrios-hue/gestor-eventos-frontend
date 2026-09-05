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

test('sólo avisa cuando la boleta costaba dinero y no se pagó', () => {
  const src = leer();
  assert.match(src, /const costaba = Number\(ticket\.tipo\?\.precio\) > 0;/,
    'se dejó de mirar el precio: una reserva gratis apartada volvería a recibir un aviso de pago');
  assert.match(src, /ticket\.estado === 'emitido' && costaba && !Number\(ticket\.precio_pagado\)/,
    'cambió la condición del aviso');
});

test('no se le promete que el QR sirve para entrar', () => {
  /* Prometerlo es lo que la manda a la puerta con la entrada sin pagar. */
  const src = leer();
  assert.match(src, /Sirve para retomar el pago, no para entrar/,
    'vuelve a decir «tu QR sirve para entrar» a alguien que no ha pagado');
  assert.match(src, /Tu pago no se completó/,
    'desapareció el aviso de pago sin terminar');
});

test('el servidor manda el precio del tipo', () => {
  /* Sin él la pantalla no puede distinguir, y el aviso no saldría nunca. */
  const back = '../../../../gestor-eventos-backend/routes/eventos.publicos.js';
  let src;
  try { src = readFileSync(back, 'utf8'); } catch { return; }  // repos separados
  assert.match(src, /tipo:ticket_types!ticket_type_id\(nombre, descripcion, precio, currency/,
    'la ruta de la boleta dejó de mandar el precio del tipo');
});
