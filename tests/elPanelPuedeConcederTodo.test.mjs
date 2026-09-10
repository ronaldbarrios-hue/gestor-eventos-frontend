/* El panel tiene que poder conceder todo lo que el servidor comprueba.
 *
 * La lista de permisos del panel (`src/lib/permisos.js`) se mantenía «a mano y
 * a propósito idéntica» a la del backend (`core/permisos/catalogo.js`). Duró lo
 * que duran esas cosas: se añadió `borrar_boletas`, se protegió la ruta con él,
 * se puso el botón — y la casilla no apareció nunca. O sea que quien organiza
 * NO podía concedérselo a nadie. El permiso existía, la ruta lo pedía, el botón
 * estaba, y no había forma de unir los tres.
 *
 * Y no daba ningún error. La casilla simplemente no estaba, y quien la buscaba
 * concluía que la plataforma no lo hacía.
 *
 * Ahora manda el catálogo que viaja en `GET /eventos/:id/roles`. Estas pruebas
 * sujetan que el panel lo USE y que el respaldo local no se quede corto.
 *
 * El literal de abajo está fijado aquí a propósito: leer el repo del backend
 * pasa en local y falla en CI, donde sólo está clonado este. Cada lado fija el
 * suyo, y si divergen falla ruidosamente — que es justo lo que no pasó.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const leer = (f) => fs.readFileSync(path.join(process.cwd(), 'src', f), 'utf8').replace(/\r/g, '');

/* Los 26 de `core/permisos/catalogo.js` al 2026-09-10. */
const DEL_SERVIDOR = [
  'editar_evento', 'publicar_evento', 'editar_pagina_publica', 'gestionar_imagenes',
  'gestionar_agenda', 'gestionar_torneo', 'gestionar_expositores', 'gestionar_accesos',
  'invitar_staff', 'gestionar_roles', 'remover_miembros', 'gestionar_solicitudes', 'ver_documentos',
  'gestionar_tickets', 'gestionar_descuentos',
  'ver_clientes', 'gestionar_clientes', 'checkin', 'vip_zone', 'borrar_boletas',
  'crear_canales', 'borrar_mensajes', 'publicar_anuncios',
  'ver_pagos', 'reembolsar', 'ver_analytics',
];

const PERMISOS_JS = leer('lib/permisos.js');
const idsLocales = [...PERMISOS_JS.matchAll(/\{\s*id:\s*'([^']+)'/g)].map(m => m[1]);

test('el respaldo local no se queda corto', () => {
  const faltan = DEL_SERVIDOR.filter(p => !idsLocales.includes(p));
  assert.deepEqual(faltan, [],
    'el servidor comprueba permisos que el panel no sabe pintar: no se pueden conceder');
});

test('y no ofrece permisos que el servidor no conoce', () => {
  /* El error al revés: una casilla que se marca, se guarda y no hace nada.
     `*` es la excepción legítima — no es un permiso del catálogo, es el
     co-dueño, y `assertPermiso` lo trata aparte. */
  const sobran = idsLocales.filter(p => p !== '*' && !DEL_SERVIDOR.includes(p));
  assert.deepEqual(sobran, [], 'el panel ofrece permisos que ninguna ruta comprueba');
});

test('cuando el servidor manda su catálogo, manda él', () => {
  /* Lo importante de la corrección: si el servidor conoce un permiso que esta
     lista no tiene, el panel lo pinta igual con la etiqueta que le manden.
     Saldrá sin explicación larga —eso se arregla escribiéndola— pero se PUEDE
     conceder, que es lo que faltaba. */
  assert.match(PERMISOS_JS, /export function permisosPorGrupo\(catalogo\)/,
    'permisosPorGrupo sigue ignorando lo que diga el servidor');
  assert.match(PERMISOS_JS, /Array\.isArray\(catalogo\)/);

  const equipo = leer('pages/events/tabs/EquipoTab.jsx');
  assert.match(equipo, /rs\.catalogo/, 'la pantalla no lee el catálogo de la respuesta');
  /* Los dos sitios donde se arma un rol: crear y editar. Si sólo uno lo
     recibe, se puede conceder un permiso al crear el rol y no al corregirlo. */
  assert.equal((equipo.match(/catalogo=\{catalogo\}/g) || []).length, 4,
    'falta pasar el catálogo en alguno de los sitios que arman un rol');
});

test('el co-dueño sobrevive aunque el servidor no lo mande', () => {
  /* `*` no está en el catálogo del servidor: es una cadena que `assertPermiso`
     trata aparte. Si al usar el catálogo remoto se perdiera, dejaría de poder
     nombrarse a un co-dueño — y en FESTECH el evento lo llevan varias
     organizaciones. */
  assert.match(PERMISOS_JS, /p\.id === '\*'/);
});

test('limpiar un aforo depende del permiso, no de haber creado el evento', () => {
  /* El botón iba contra `soyOwner`: quien lleva la logística veía el número y
     para ponerlo a cero al terminar una charla tenía que llamar a quien creó el
     evento, en mitad del día. El servidor ya lo concede por permiso; era la
     pantalla la que no. */
  const aforo = leer('pages/events/workspace/asistentes/AforoSection.jsx');
  assert.match(aforo, /puedeLimpiar/, 'la pantalla no recibe quién puede limpiar');
  assert.doesNotMatch(aforo, /soyOwner \? \(\) => limpiar/, 'todavía queda un botón atado al dueño');
  assert.doesNotMatch(aforo, /\{soyOwner && <button onClick=\{\(\) => limpiar/, 'el "Limpiar todo" sigue siendo del dueño');
  /* Y si una pantalla vieja no lo pasa, se cae a `soyOwner` — nunca se abre
     sola. */
  assert.match(aforo, /puedeLimpiar === undefined \? soyOwner/);

  const ws = leer('pages/events/workspace/EventWorkspace.jsx');
  assert.match(ws, /puedeLimpiar=\{puedeVer\('gestionar_accesos'/,
    'el workspace no calcula el permiso de limpiar');
});
