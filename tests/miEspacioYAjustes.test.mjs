/* Mi espacio: qué puedo hacer en cada evento. Y los ajustes, recortados.
 *
 * ── El hueco ─────────────────────────────────────────────────────────────
 *
 * Quien colabora veía su rol —«Puerta», «Atención»— y nada más. El nombre del
 * rol no dice qué se puede hacer con él: hay que entrar, mirar el menú y
 * deducirlo. Y el enlace llevaba al Resumen, que según el rol ni siquiera se
 * puede abrir.
 *
 * Los permisos ya venían resueltos del servidor. Lo que faltaba era
 * traducirlos a frases y a un sitio a donde ir.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const AJUSTES = 'src/pages/ajustes/AjustesPage.jsx';
const TRABAJO = 'src/pages/equipo/MiTrabajoPage.jsx';
const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

const { PERMISOS } = await import('../src/lib/permisos.js');
const { TRABAJOS, loQuePuedoHacer, porDondeEntro, resumenCorto } =
  await import('../src/lib/loQuePuedoHacer.js');

test('cada trabajo se apoya en un permiso que existe', () => {
  /* Un permiso inventado aquí sale como una frase que nunca se cumple: la
     persona lee que puede hacer algo y al entrar no está. */
  const ids = new Set(PERMISOS.map(p => p.id));
  const malos = TRABAJOS.filter(t => !ids.has(t.permiso)).map(t => t.permiso);
  assert.deepEqual(malos, [], 'trabajos que citan permisos fuera del catálogo');
});

test('un rol de puerta entra por la puerta', () => {
  /* El orden de la tabla decide dónde aterriza, y va de lo más operativo a lo
     más administrativo: quien escanea no quiere el Resumen. */
  const puerta = { permisos: ['checkin', 'ver_clientes'] };
  assert.equal(porDondeEntro(puerta), '?s=asistentes&t=checkin');
  assert.deepEqual(loQuePuedoHacer(puerta), [
    'Escanear entradas en la puerta',
    'Ver la lista de asistentes',
  ]);
});

test('quien coordina expositores entra a su herramienta', () => {
  const coord = { permisos: ['gestionar_expositores', 'ver_clientes'] };
  assert.equal(porDondeEntro(coord), '?s=actividades&t=networking');
});

test('el dueño no recibe una lista de veintidós frases', () => {
  /* Recitarle todo lo que puede a quien es dueño de su evento es ruido. */
  assert.deepEqual(loQuePuedoHacer({ soyOwner: true }), ['Todo: es tu evento']);
  assert.equal(porDondeEntro({ soyOwner: true }), '', 'el dueño entra por donde entra siempre');
});

test('sin permisos, se dice lo que sí se puede', () => {
  /* «No puedes hacer nada» sería falso: cualquiera del equipo tiene sus tareas
     y el chat. Y dejar la caja vacía parece un error de carga. */
  const nada = loQuePuedoHacer({ permisos: [] });
  assert.equal(nada.length, 1);
  assert.match(nada[0], /tareas/);
  assert.equal(porDondeEntro({ permisos: [] }), '?s=equipo&t=tareas');
});

test('con muchos permisos se resume, no se recita', () => {
  const { vistas, resto } = resumenCorto(['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(vistas, ['a', 'b', 'c']);
  assert.equal(resto, 2);
});

test('la pantalla lo usa de verdad', () => {
  const src = leer(TRABAJO);
  assert.match(src, /loQuePuedoHacer\(\{ permisos, soyOwner \}\)/, 'la vista dejó de traducir los permisos');
  assert.match(src, /porDondeEntro\(\{ permisos, soyOwner \}\)/, 'el botón volvió a llevar al Resumen');
  assert.match(src, /ev\.mi_ficha\?\.permisos \|\| \[\]/,
    'dejó de leer los permisos resueltos que ya manda el servidor');
});

test('los ajustes son cuatro apartados, no siete', () => {
  /* Tres estaban casi vacíos: «Seguridad» eran dos acciones de la cuenta,
     «Notificaciones» es una preferencia, e «Integraciones» tenía dos cosas
     reales y siete anunciadas que no existen. */
  const src = leer(AJUSTES);
  const visibles = [...src.matchAll(/\{ id: '([a-z]+)',\s+label:/g)].map(m => m[1]);
  assert.deepEqual(visibles, ['organizacion', 'espacio', 'conexiones', 'preferencias']);
});

test('no se perdió ningún ajuste: se movieron', () => {
  const src = leer(AJUSTES);
  assert.match(src, /apartado === 'perfil'\s+&& <><SettingsPage \/><Seguridad \/><\/>/,
    'la contraseña y el cierre de sesiones se quedaron sin sitio');
  assert.match(src, /<NotificacionesTab \/>/, 'las notificaciones desaparecieron del todo');
  assert.match(src, /<PagosTab \/>/, 'la cuenta de cobro desapareció');
  assert.match(src, /<ConectarClaude \/>/, 'el conector de Claude desapareció');
});

test('un enlace guardado al apartado viejo sigue llevando a algún sitio', () => {
  /* Sin la traducción, un `?a=seguridad` de un marcador pintaba la página en
     blanco: ningún caso encajaba y no se dibujaba nada. */
  const src = leer(AJUSTES);
  assert.match(src, /const REDIRECCIONES = \{[\s\S]*?seguridad\s*: 'perfil'/);
  assert.match(src, /notificaciones: 'preferencias'/);
  assert.match(src, /integraciones\s*: 'conexiones'/);
  assert.match(src, /const apartado = REDIRECCIONES\[pedido\] \|\| pedido;/);
});

test('ya no se anuncia lo que no existe', () => {
  /* Siete integraciones «próximamente» y un laboratorio beta «al final del
     rework». Un menú que promete lo que no hay enseña a no fiarse del menú. */
  const src = leer(AJUSTES);
  const sinComentarios = src
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '')
    .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(sinComentarios, /Próximamente/, 'volvió la estantería de promesas');
  assert.doesNotMatch(sinComentarios, /Zapier|Discord/, 'volvieron los servicios anunciados y no construidos');
  assert.doesNotMatch(sinComentarios, /laboratorio de funciones beta/, 'volvió el cuadro «Experimental» vacío');
});

test('el equipo en «mi espacio» es LA misma pantalla del evento', () => {
  /* Escribir aquí una versión «resumida» habría creado dos pantallas para lo
     mismo, y dos pantallas para lo mismo siempre se separan: una gana un botón,
     la otra se queda con la regla vieja, y quien las usa deja de saber cuál
     manda. Es la avería que este repo lleva pagando todo el día. */
  const src = leer(TRABAJO);
  assert.match(src, /import EquipoTab from '\.\.\/events\/tabs\/EquipoTab\.jsx';/,
    'se dejó de reutilizar la pantalla del evento');
  assert.match(src, /<EquipoTab evento=\{\{ id: ev\.id \}\} \/>/,
    'la pantalla del equipo ya no recibe el evento, o se duplicó');
});

test('el equipo sólo se ofrece a quien puede tocarlo', () => {
  /* Sin esos permisos, esa pantalla contesta 403 en cuanto se toca algo:
     enseñarla sería ofrecer una puerta cerrada. */
  const src = leer(TRABAJO);
  assert.match(src, /const PERMISOS_EQUIPO = \['gestionar_roles', 'invitar_staff', 'remover_miembros'\]/);
  assert.match(src, /if \(!puede\) return null;/,
    'la caja del equipo se enseña a quien no puede abrirla');
  /* Y el dueño siempre puede: no tiene fila en `event_members` con permisos. */
  assert.match(src, /const soyOwner = ev\.mi_rol === 'Organizador';/);
});

test('el equipo no se pide hasta que se abre', () => {
  /* `EquipoTab` pide equipo y roles al montarse. Montarlo por cada evento de
     la lista serían dos peticiones por evento que casi nadie va a mirar. */
  const src = leer(TRABAJO);
  assert.match(src, /\{abierto && \(/, 'el equipo se monta siempre, aunque esté plegado');
});
