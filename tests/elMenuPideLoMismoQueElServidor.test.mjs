/* Cada pestaña tiene que pedir lo MISMO que la ruta que hay detrás.
 *
 * ── Los dos finales malos ────────────────────────────────────────────────
 *
 * El menú más ANCHO que el servidor: la pestaña se abre y todo lo de dentro
 * devuelve 403. Una pantalla que existe para decirte que no puedes.
 *
 * El menú más ESTRECHO: la pestaña no aparece aunque el servidor te dejaría.
 * Éste es el peor de los dos, porque no da ningún error — la función
 * simplemente no está, y quien la busca concluye que la plataforma no la hace.
 *
 * Los dos aparecieron en la auditoría del 11-sep:
 *
 *   Invitaciones  pedía `ver_clientes` y todas las rutas del padrón piden
 *                 `editar_evento`: Puerta, Atención y Finanzas veían la
 *                 pestaña para no poder usarla
 *   Emails        pedía sólo `editar_pagina_publica` y el servidor acepta
 *                 también `editar_evento`: quien tenía el segundo podía editar
 *                 las plantillas y no veía la pestaña
 *
 * ── Por qué el literal está aquí ─────────────────────────────────────────
 *
 * Leer el repo del backend pasa en local y falla en CI, donde sólo está
 * clonado éste. Cada lado fija el suyo; si divergen, falla ruidosamente. Es la
 * misma regla que `elPanelPuedeConcederTodo`.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.join(process.cwd(), 'src', 'pages', 'events', 'workspace', 'EventWorkspace.jsx'), 'utf8').replace(/\r/g, '');

/* Lo que exige el servidor, comprobado ruta por ruta el 2026-09-11.
 *
 * Sólo las pestañas cuya ruta tiene una lista de permisos clara. Las que abren
 * varias pantallas con permisos distintos —o las que son de todo el equipo,
 * `perm: null`— se dejan fuera a propósito: fijarlas aquí sería inventarse una
 * regla que el servidor no tiene. */
const LO_QUE_PIDE_EL_SERVIDOR = {
  analytics  : ['ver_analytics'],                                  // routes/analytics.js
  calendario : ['gestionar_agenda', 'editar_evento', 'checkin'],   // PERMS_AGENDA_LEER
  torneos    : ['gestionar_torneo', 'editar_evento'],              // PERMS_TORNEO
  networking : ['gestionar_expositores', 'editar_evento'],         // PERMS_EXPOSITORES
  boletas    : ['gestionar_tickets'],                              // PERMS_TICKETS
  plano      : ['gestionar_tickets'],                              // routes/espacios.js
  promociones: ['gestionar_descuentos'],                           // routes/promociones.js
  /* Dos cosas dentro con dueños distintos: el padrón pide `editar_evento`
     (PERMS_PADRON) y la lista de espera `gestionar_clientes` desde que dejó de
     ser del dueño. La pestaña se abre con cualquiera de los dos y
     `PreviosSection` decide dentro cuál de las dos vistas enseña — pidiendo
     sólo el primero, quien lleva los clientes no llegaba nunca a la fila
     aunque el servidor ya se la aceptara. */
  previos    : ['editar_evento', 'gestionar_clientes'],            // PERMS_PADRON + routes/waitlist.js
  emails     : ['editar_pagina_publica', 'editar_evento'],         // PERMS_EDITAR
  accesos    : ['gestionar_accesos'],
  aforo      : ['checkin'],
  clientes   : ['ver_clientes'],
  vacantes   : ['editar_evento'],                                  // PERMS_VACANTES
  /* Los dos permisos que dan algo dentro: `checkin` abre la etiquetadora (que
     no guarda nada) y `editar_evento` los dos disenadores, que guardan en
     `page_json`. Con `ver_clientes` la pestana se abria en blanco. */
  acreditacion: ['checkin', 'editar_evento'],
};

/* Saca el `perm` de una pestaña tal como está escrito en el menú. */
function permDe(id) {
  const re = new RegExp(`\\{\\s*id:\\s*'${id}'[^}]*?perm:\\s*(\\[[^\\]]*\\]|'[^']*'|null)`, 's');
  const m = SRC.match(re);
  assert.ok(m, `no se encontró la pestaña '${id}' o no declara perm`);
  const crudo = m[1];
  if (crudo === 'null') return null;
  return [...crudo.matchAll(/'([^']+)'/g)].map(x => x[1]);
}

for (const [id, esperado] of Object.entries(LO_QUE_PIDE_EL_SERVIDOR)) {
  test(`la pestaña «${id}» pide lo mismo que su ruta`, () => {
    const enElMenu = permDe(id);
    assert.ok(enElMenu, `«${id}» quedó sin permiso: se abre para cualquiera del equipo`);

    const sobran = enElMenu.filter(p => !esperado.includes(p));
    assert.deepEqual(sobran, [],
      `«${id}» se abre con permisos que la ruta no acepta: la pestaña se abre y da 403`);

    const faltan = esperado.filter(p => !enElMenu.includes(p));
    assert.deepEqual(faltan, [],
      `«${id}» esconde la pestaña a quien el servidor sí deja entrar — y eso no da error, `
      + 'la función simplemente no aparece');
  });
}

test('las pestañas de todo el equipo lo dicen a propósito', () => {
  /* `perm: null` es una decisión, no un olvido: cada persona entra a ver lo
     suyo y lo que puede hacer dentro lo decide la pantalla. Si una pestaña
     nueva nace sin `perm`, esta lista obliga a pensarlo. */
  const DE_TODOS = ['general', 'tareas', 'solicitudes', 'chat', 'ranking'];
  for (const id of DE_TODOS) {
    assert.equal(permDe(id), null, `«${id}» dejó de ser de todo el equipo`);
  }
});

test('lo que es del dueño se marca como tal, no con un permiso cualquiera', () => {
  /* `__solo_owner__` lo entiende `puedeVer` y deja pasar también al co-dueño
     (`*`). Poner ahí un permiso normal abriría ajustes o integraciones a un
     rol del equipo sin que nadie lo decidiera. */
  for (const id of ['integraciones', 'automatizaciones']) {
    assert.deepEqual(permDe(id), ['__solo_owner__']);
  }
});
