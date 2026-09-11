/* Lo que el servidor abrió, la pantalla tiene que enseñarlo.
 *
 * Dos permisos dejaron de ser «ser el dueño» en el servidor:
 *
 *   · la lista de espera  → `gestionar_clientes`
 *   · el aviso al equipo  → `publicar_anuncios`
 *
 * Un cambio así se queda a medias con una facilidad enorme: el servidor
 * acepta, y la pantalla sigue preguntando `soyOwner` por su cuenta. No falla
 * nada — la función simplemente no está para quien ya puede usarla, que es el
 * peor de los dos finales malos porque no da ningún error.
 *
 * Fue exactamente lo que pasó con `publicar_anuncios`: el permiso existía
 * desde la migración 0122, la pestaña «Anuncios» ya lo pedía, y el atajo del
 * Resumen seguía tapado por un `soyOwner`.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const leer = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8').replace(/\r/g, '');
/* Sin comentarios: arriba se nombra `soyOwner` cinco veces explicando por qué
   no debe estar, y un test que mide sus propias explicaciones no mide nada. */
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('la lista de espera ya no se reserva a quien creó el evento', () => {
  const src = sinComentarios(leer('src', 'pages', 'events', 'workspace', 'asistentes', 'PreviosSection.jsx'));

  /* El corte de antes: `if (!soyOwner) return <InvitacionesSection …>`. Con él,
     quien lleva los clientes nunca veía la fila aunque el servidor se la
     aceptara. */
  assert.ok(!/if\s*\(\s*!soyOwner\s*\)/.test(src),
    'la lista de espera vuelve a esconderse detrás de «soy el dueño»');
  assert.match(src, /gestionar_clientes/,
    'la lista de espera no mira el permiso que pide su ruta');

  /* Y el dueño sigue entrando: `exige` le concede `*` en el servidor, y aquí
     tiene que valer lo mismo o la pantalla sería más estrecha que la ruta. */
  assert.match(src, /soyOwner \|\| permisos\.includes\('\*'\)/,
    'el dueño o el co-dueño dejaron de poder ver lo que el servidor les deja');
});

test('quien sólo tiene uno de los dos permisos no ve un conmutador a un 403', () => {
  const src = sinComentarios(leer('src', 'pages', 'events', 'workspace', 'asistentes', 'PreviosSection.jsx'));
  assert.match(src, /if \(!puedeEspera\)\s+return <InvitacionesSection/,
    'sin permiso de la fila, se sigue ofreciendo el botón de la fila');
  assert.match(src, /if \(!puedeInvitar\) return <WaitlistTab/,
    'sin permiso del padrón, se sigue ofreciendo el botón de invitaciones');

  /* Y se arranca en algo que se pueda ver: empezar siempre en «invitaciones»
     dejaba a quien sólo atiende la fila mirando una pantalla vacía. */
  assert.match(src, /useState\(puedeInvitar \? 'invitaciones' : 'espera'\)/,
    'la vista inicial no depende de lo que cada quien puede ver');
});

test('«Redactar anuncio» se ofrece a quien tiene el permiso, no al dueño', () => {
  const resumen = sinComentarios(leer('src', 'pages', 'events', 'workspace', 'ResumenSection.jsx'));
  assert.ok(!/\{soyOwner && \(onEditar \|\| onAnuncio \|\| onEliminar\)/.test(resumen),
    'el Resumen vuelve a tapar las acciones con «soy el dueño»');

  /* La decisión se toma donde se conocen los permisos, y llega ya hecha: cada
     acción viene en `null` si no toca. Es como `onEliminar` lo hacía desde
     siempre. */
  const workspace = sinComentarios(leer('src', 'pages', 'events', 'workspace', 'EventWorkspace.jsx'));
  assert.match(workspace, /onAnuncio=\{puedeVer\('publicar_anuncios'/,
    'el atajo del anuncio no mira `publicar_anuncios`');
  assert.match(workspace, /onEditar=\{puedeVer\('editar_evento'/,
    'el atajo de editar no mira `editar_evento`');
});

test('quien puede diseñar la escarapela ve dónde se diseña', () => {
  /* La migración 0124 partió `editar_evento` para que diseñar una escarapela
     no obligara a entregar el evento entero, y creó `gestionar_acreditacion`.
     El servidor lo acepta —`LLAVES_ESTRECHAS` le abre `wallet`, `puntos` y
     `credenciales`— pero el panel seguía pidiendo `editar_evento` en los dos
     sitios: la pestaña no salía en el menú, y dentro tampoco salían las dos
     pantallas de diseño.

     O sea: el permiso se concedía, se veía marcado, su etiqueta en el catálogo
     decía «Diseñar escarapelas y carnés», y no abría ninguna de las dos. Sin
     ningún error de por medio — se descubre preguntando «¿y dónde se diseña?».

     Se encontró componiendo un rol de logística para TechNova y comprobando
     permiso por permiso qué abría cada uno, en vez de dar por bueno que la
     casilla existiera. */
  const workspace = sinComentarios(leer('src', 'pages', 'events', 'workspace', 'EventWorkspace.jsx'));
  assert.match(workspace, /id: 'acreditacion'[^}]*'gestionar_acreditacion'/,
    'la pestaña de Acreditación no se abre con el permiso que la 0124 creó para eso');

  const seccion = sinComentarios(leer('src', 'pages', 'events', 'workspace', 'asistentes', 'AcreditacionSection.jsx'));
  assert.match(seccion, /const disena = puede\('editar_evento'\) \|\| puede\('gestionar_acreditacion'\);/,
    'los dos diseñadores vuelven a pedir sólo `editar_evento`');
  /* Imprimir sigue siendo de la puerta: no guarda nada. */
  assert.match(seccion, /puede\('checkin'\) \? \[\['etiquetas'/,
    'imprimir en la etiquetadora dejó de ir con `checkin`');
});

test('los cuatro permisos finos de la 0124 abren la pantalla que prometen', () => {
  /* La migración 0124 partió `editar_evento`, que era una llave maestra, en
     cuatro permisos finos: documentos, acreditación, padrón y vacantes. La
     razón era una sola — que para dejar subir un contrato o diseñar una
     escarapela no hubiera que entregar el evento entero.
     
     El servidor los acepta los cuatro. El panel no sabía de NINGUNO: se podían
     conceder, salían marcados en la lista de roles con su etiqueta, y no abrían
     nada. Cuatro casillas decorativas, sin un solo error de por medio.
     
     Salió componiendo un rol de logística para TechNova y comprobando permiso
     por permiso qué abría cada uno. */
  const ws = sinComentarios(leer('src', 'pages', 'events', 'workspace', 'EventWorkspace.jsx'));

  /* Vacantes: PERMS_VACANTES = ['gestionar_vacantes','editar_evento'] */
  assert.match(ws, /id: 'vacantes'[^}]*'gestionar_vacantes'/,
    'la pestaña de Vacantes no se abre con `gestionar_vacantes`');

  /* Invitaciones: PERMS_PADRON = ['gestionar_padron','editar_evento'] */
  assert.match(ws, /id: 'previos'[^}]*'gestionar_padron'/,
    'la pestaña de Invitaciones no se abre con `gestionar_padron`');
  const previos = sinComentarios(leer('src', 'pages', 'events', 'workspace', 'asistentes', 'PreviosSection.jsx'));
  assert.match(previos, /puede\('editar_evento'\) \|\| puede\('gestionar_padron'\)/,
    'dentro de Invitaciones, el padrón sigue pidiendo sólo `editar_evento`');

  /* Documentos: subir guarda la clave `documentos` de `page_json`, que
     `LLAVES_ESTRECHAS` abre con `gestionar_documentos`. */
  assert.match(ws, /puedeVer\('gestionar_documentos'/,
    'la zona de subir documentos sigue escondida a quien tiene `gestionar_documentos`');

  /* Acreditación ya estaba, y se queda fijada aquí con las otras tres para que
     las cuatro se lean juntas: son el mismo arreglo. */
  assert.match(ws, /id: 'acreditacion'[^}]*'gestionar_acreditacion'/);
});

test('publicar el evento va con su permiso, no con ser el dueño', () => {
  /* `POST /:id/estado` exige `publicar_evento` y nada más — el servidor ya se
     arregló. El botón del panel seguía pidiendo la propiedad, así que medido:
     34 roles tenían el permiso concedido y ninguno veía el botón. */
  const ws = sinComentarios(leer('src', 'pages', 'events', 'workspace', 'EventWorkspace.jsx'));
  assert.match(ws, /puedeVer\('publicar_evento', mandaTodo, permisos\) && \['borrador', 'configuracion'\]/,
    'el botón de publicar vuelve a pedir ser el dueño');
  assert.ok(!/soyOwner && \['borrador', 'configuracion'\]/.test(ws));
});

test('no se ofrece la portada a quien el servidor no deja cambiarla', () => {
  /* `cover_url` y `gallery` sólo los abre `gestionar_imagenes`, y el guardado
     del evento no rechaza lo que no puedes tocar: lo DESCARTA y responde 200.
     Quien cambiaba portada y título a la vez veía «Guardado», el título
     cambiaba y la portada no. Medido: 34 de los 102 roles que pueden editar el
     evento no tienen `gestionar_imagenes`.

     Es el peor de la familia: los otros esconden una función a quien puede
     usarla — molesto pero visible en cuanto alguien pregunta. Éste dice que
     guardó algo que no guardó. */
  const edit = sinComentarios(leer('src', 'pages', 'events', 'EventEditPage.jsx'));
  assert.match(edit, /const puedeImagenes = permisos\.includes\('\*'\) \|\| permisos\.includes\('gestionar_imagenes'\)/,
    'la página de editar no mira `gestionar_imagenes`');
  assert.match(edit, /\{puedeImagenes && \(/, 'la sección de imágenes se ofrece igualmente');

  /* Y por defecto no esconde nada: hasta que el servidor responde, `['*']`.
     Al revés, la pantalla parpadearía escondiendo la portada a su dueño. */
  assert.match(edit, /useState\(\['\*'\]\)/,
    'el estado inicial de permisos esconde cosas antes de saber quién eres');
});
