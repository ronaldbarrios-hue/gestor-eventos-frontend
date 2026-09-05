/* «Sin pagar»: la pregunta que la lista de clientes no sabía contestar.
 *
 * ── El problema ──────────────────────────────────────────────────────────
 *
 * `emitido` dice cómo se creó la boleta, no si hay dinero pendiente. Cubre dos
 * cosas que en la lista se ven idénticas: una reserva gratuita —apartada y
 * perfectamente bien— y una compra abandonada o con la tarjeta rechazada.
 *
 * En un evento con entradas gratis y de pago, quien quiere perseguir lo
 * segundo tiene que abrir las boletas de una en una. Y ahora que se puede
 * retomar un pago a medias, saber a quién escribirle es justo lo que falta.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const TAB = 'src/pages/events/tabs/ClientesTab.jsx';
const BACK = '../../../../gestor-eventos-backend/routes/clientes.js';
const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

test('una boleta sin pagar no se etiqueta igual que una reserva gratis', () => {
  const src = leer(TAB);
  assert.match(src, /export function sinPagar\(c\) \{/, 'desapareció la regla');
  assert.match(src, /c\?\.estado === 'emitido' && Number\(c\?\.tipo\?\.precio\) > 0 && !Number\(c\?\.precio_pagado\)/,
    'la regla cambió: si deja de mirar el precio del tipo, una reserva gratis saldría marcada como morosa');
  assert.match(src, /sinPagar\(cliente\) \? 'Sin pagar'/,
    'la fila volvió a decir «Emitido» a las dos cosas');
});

test('no encontrar a nadie sin pagar es una buena noticia, no un vacío', () => {
  /* Enseñar «Sin resultados» hace dudar de si el filtro funcionó, y lleva a
     comprobarlo a mano — que es exactamente el trabajo que este filtro quita. */
  const src = leer(TAB);
  assert.match(src, /Nadie dejó un pago a medias/,
    'buscar quién debe y no encontrar a nadie vuelve a parecer un fallo del filtro');
});

test('el filtro lo aplica el SERVIDOR, no la página', () => {
  /* Filtrarlo aquí mentiría: la lista viene paginada, así que se estaría
     filtrando una página y enseñando ese resultado como si fuera el total. */
  const src = leer(TAB);
  assert.match(src, /<option value="sin_pagar">/, 'no se puede pedir el filtro');

  if (!existsSync(BACK)) return;   // repos separados
  const back = leer(BACK);
  assert.match(back, /query = query\.eq\('estado', 'emitido'\)\.is\('precio_pagado', null\)\.gt\('tipo\.precio', 0\)/,
    'el servidor dejó de filtrar por «costaba dinero y no se pagó»');

  /* El `!inner` es lo que permite filtrar por una columna del tipo de boleta.
     Sin él, PostgREST acepta el filtro y NO descarta ninguna fila: sólo deja
     el tipo en `null`. O sea que la lista saldría entera y parecería correcta.
     Comprobado contra la API del proyecto: las dos formas devuelven 200, y por
     eso la diferencia tiene que vigilarse aquí. */
  assert.match(back, /const unido = estado === 'sin_pagar' \? '!inner' : '';/,
    'sin el `!inner` el filtro por precio del tipo no descarta nada y la lista sale entera');

  /* Y sólo en ese caso: un inner join permanente escondería las boletas cuyo
     tipo se borró, que también tienen que salir en la lista. */
  assert.match(back, /tipo:ticket_types!ticket_type_id\$\{unido\}\(/,
    'el join dejó de ser condicional');
});
