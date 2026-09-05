/* El menú promete lo mismo que comprueba el servidor.
 *
 * ── El fallo que vigila ──────────────────────────────────────────────────
 *
 * Este archivo ya lo escribió el propio código hace dos semanas: «una pestaña
 * que se abre y devuelve 403 es peor que una pestaña que no se ve». Aun así,
 * cinco pestañas de Actividades tenían `perm: null` —«la ve todo el equipo»—
 * mientras sus rutas pedían permisos concretos. La peor era la rueda de
 * negocios: la abría cualquiera del equipo y contestaba 403.
 *
 * Y el error se da en las dos direcciones. «Stands» pedía `checkin`, así que el
 * rol que existe para eso —Coordinación de expositores— tenía el permiso del
 * servidor y el menú le escondía su propia herramienta.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const WS = 'src/pages/events/workspace/EventWorkspace.jsx';
const BACK = '../../../../gestor-eventos-backend';
const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

const { PERMISOS } = await import('../src/lib/permisos.js');
const IDS = new Set(PERMISOS.map(p => p.id));

/* Los `perm:` de las pestañas, con su id de pestaña. */
function permisosDeLasPestanas() {
  const src = leer(WS);
  const out = [];
  for (const m of src.matchAll(/\{\s*id:\s*'([a-z_]+)',\s*label:[^,]+,\s*perm:\s*(null|'[^']+'|\[[^\]]*\])/g)) {
    const crudo = m[2];
    if (crudo === 'null') { out.push({ tab: m[1], perms: null }); continue; }
    const perms = crudo.startsWith('[')
      ? [...crudo.matchAll(/'([^']+)'/g)].map(x => x[1])
      : [crudo.slice(1, -1)];
    out.push({ tab: m[1], perms });
  }
  return out;
}

const PESTANAS = permisosDeLasPestanas();

test('se leen las pestañas del menú', () => {
  assert.ok(PESTANAS.length > 15, `sólo leí ${PESTANAS.length} pestañas; el patrón se quedó viejo`);
});

test('ninguna pestaña pide un permiso que no existe', () => {
  /* Un permiso inventado en el menú esconde la pestaña PARA SIEMPRE y para
     todo el mundo menos el dueño, sin un solo error. */
  const malos = [];
  for (const { tab, perms } of PESTANAS) {
    for (const p of perms || []) {
      if (p === '__solo_owner__') continue;      // marca interna, no es un permiso
      if (!IDS.has(p)) malos.push(`${tab} → ${p}`);
    }
  }
  assert.deepEqual(malos, [], 'pestañas que piden permisos fuera del catálogo');
});

test('la rueda de negocios pide lo que su ruta comprueba', () => {
  const rueda = PESTANAS.find(p => p.tab === 'networking');
  assert.deepEqual(rueda.perms, ['gestionar_expositores', 'editar_evento'],
    'vuelve a abrirse para todo el equipo y a contestar 403');

  if (!existsSync(BACK)) return;                 // repos separados
  const back = leer(`${BACK}/routes/networking.js`);
  assert.match(back, /const PERMS_EXPOSITORES = \['gestionar_expositores', 'editar_evento'\]/,
    'el servidor cambió su lista y el menú se quedó con la vieja');
});

test('Stands es la pantalla de quien coordina expositores', () => {
  const stands = PESTANAS.find(p => p.tab === 'stands');
  assert.ok(stands.perms.includes('gestionar_expositores'),
    'el rol que existe para los stands vuelve a no poder abrir la pantalla de stands');
});

test('la facturación va con los permisos de dinero', () => {
  /* Pedía `ver_clientes`, que tienen Puerta, Atención y VIP host: quien está
     escaneando en la entrada veía la facturación del evento. */
  const f = PESTANAS.find(p => p.tab === 'facturacion');
  assert.ok(!f.perms.includes('ver_clientes'),
    'quien escanea en la puerta vuelve a ver la facturación');
  assert.ok(f.perms.includes('ver_pagos'), 'la facturación dejó de pedir un permiso de dinero');
});

test('el calendario y los speakers no se abren en vacío', () => {
  /* Su ruta pide `gestionar_agenda`, `editar_evento` o `checkin`. Con `null`,
     un rol de Finanzas abría el calendario y recibía un 403. */
  for (const tab of ['calendario', 'speakers']) {
    const t = PESTANAS.find(p => p.tab === tab);
    assert.ok(Array.isArray(t.perms) && t.perms.includes('gestionar_agenda'),
      `«${tab}» vuelve a abrirse para quien no puede leerla`);
  }
});
