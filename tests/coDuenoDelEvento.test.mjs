/* Un co-dueño manda igual — menos borrar el evento.
 *
 * ── El caso ──────────────────────────────────────────────────────────────
 *
 * En FESTECH el evento lo llevan varias organizaciones y todas mandan igual.
 * El rol más alto del catálogo, «Administrador», enumera 22 permisos y aun así
 * no llegaba a cinco pantallas —Accesos, Anuncios, General, Integraciones,
 * Automatizaciones— porque el panel las reservaba a quien figura como dueño.
 *
 * La salida hasta hoy era compartir la cuenta del dueño, que es lo peor
 * posible: la auditoría deja de distinguir quién hizo qué, y quitarle el acceso
 * a uno obliga a cambiarle la contraseña a todos.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { PERMISOS } from '../src/lib/permisos.js';

const leer = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const WS = leer('src/pages/events/workspace/EventWorkspace.jsx');

test('«co-dueño» se puede conceder, y está en el catálogo', () => {
  const co = PERMISOS.find(p => p.id === '*');
  assert.ok(co, 'no se puede conceder el comodín desde la pantalla de roles');
  assert.equal(co.aplicado, true);
});

test('y dice lo que NO da', () => {
  /* Un permiso llamado «manda igual que el dueño» que además borrara el evento
     sería una sorpresa cara. */
  const co = PERMISOS.find(p => p.id === '*');
  assert.match(co.desc, /No incluye borrar el evento ni transferirlo/);
});

test('las pantallas reservadas al dueño se abren para un co-dueño', () => {
  const s = sinComentarios(WS);
  assert.match(s, /if \(perm === '__solo_owner__'\) return mandaTodo;/);
});

test('pero el botón de borrar el evento no le llega', () => {
  /* El servidor lo rechazaría igual —la ruta compara `owner_id` a mano—, así
     que enseñarlo sería un botón que devuelve 403. */
  assert.match(sinComentarios(WS), /onEliminar=\{soyOwner \? eliminar : null\}/);
});

test('«manda en este evento» se calcula una vez, no en cada pantalla', () => {
  /* Veintitrés archivos preguntan hoy por `soyOwner`. Repetir ahí la
     comparación con `*` es exactamente cómo se separan las cosas en esta base:
     se calcula arriba y baja. */
  assert.match(sinComentarios(WS), /const mandaTodo = soyOwner \|\| permisos\.includes\('\*'\)/);
  assert.match(sinComentarios(WS), /soyOwner=\{mandaTodo\}/);
});

test('y se lee DESPUÉS de declarar de qué depende', () => {
  /* `const` no se iza: leer `permisos` antes de su línea revienta la página
     entera al abrirla, y el build no lo ve. Ya pasó una vez esta sesión. */
  const i = WS.indexOf('const [permisos, setPermisos]');
  const j = WS.indexOf('const [soyOwner, setSoyOwner]');
  const k = WS.indexOf('const mandaTodo = soyOwner');
  assert.ok(i > 0 && j > 0 && k > 0);
  assert.ok(i < k && j < k, 'mandaTodo se calcula antes de declarar lo que usa');
});

test('el catálogo no promete permisos que nadie comprueba', () => {
  /* La marca `aplicado` existe porque conceder algo que no se verifica le dice
     a quien arma un rol que hizo algo, y no hizo nada. */
  for (const p of PERMISOS) {
    assert.equal(typeof p.aplicado, 'boolean', `«${p.id}» no dice si se aplica`);
    assert.ok(p.label && p.desc, `«${p.id}» sin texto`);
  }
});
