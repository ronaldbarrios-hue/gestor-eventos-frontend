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
