/* Que no haya que escribir dos veces lo mismo.
 *
 * ── El mapa, medido ──────────────────────────────────────────────────────
 *
 *   Sesión abierta → formulario de compra    NO heredaba nada (lo peor: es el
 *                                            caso más común y el dato ya estaba
 *                                            en el contexto)
 *   Boleta → inscripción a sub-evento        identidad SÍ · respuestas NO
 *   Boleta → ficha de expositor              nombre y correo SÍ · respuestas NO
 *   Boleta → equipo del torneo               nombre y correo SÍ · respuestas NO
 *
 * Correr: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { datosIniciales, seRellenoAlgo } from '../src/lib/datosDeQuienEntra.js';

const leer = (f) => readFileSync(f, 'utf8').replace(/\r/g, '');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ── 1 · La sesión abierta ────────────────────────────────────────────── */

test('sin sesión, el formulario sigue naciendo en blanco', () => {
  assert.deepEqual(datosIniciales(null), { nombre: '', email: '', telefono: '' });
  assert.deepEqual(datosIniciales(undefined), { nombre: '', email: '', telefono: '' });
});

test('con sesión, se rellena lo que se sabe', () => {
  assert.deepEqual(
    datosIniciales({ nombre: 'Ana Ruiz', email: 'ana@x.co', telefono: '3001112233' }),
    { nombre: 'Ana Ruiz', email: 'ana@x.co', telefono: '3001112233' },
  );
});

test('un correo no se pone como nombre', () => {
  /* `mapUser` cae a `user.email` cuando no hay nombre en los metadatos. Un
     correo en la casilla «Nombre completo» se ve como un dato bueno y no lo es:
     quien lo mira por encima lo da por rellenado y manda su correo como nombre. */
  const u = { nombre: 'ana@x.co', email: 'ana@x.co' };
  assert.equal(datosIniciales(u).nombre, '');
  assert.equal(datosIniciales(u).email, 'ana@x.co');
  /* Y da igual la caja: el mismo correo escrito distinto sigue siendo el mismo. */
  assert.equal(datosIniciales({ nombre: 'ANA@X.CO', email: 'ana@x.co' }).nombre, '');
});

test('lo que falta se queda vacío, no en «undefined»', () => {
  /* Un `undefined` en un input controlado lo vuelve no controlado, y React
     avisa por consola mientras el campo deja de responder. */
  const d = datosIniciales({ email: 'a@b.co' });
  assert.equal(d.nombre, '');
  assert.equal(d.telefono, '');
  for (const v of Object.values(d)) assert.equal(typeof v, 'string');
});

test('se puede saber si se rellenó algo, para poder decirlo', () => {
  assert.equal(seRellenoAlgo(datosIniciales(null)), false);
  assert.equal(seRellenoAlgo(datosIniciales({ email: 'a@b.co' })), true);
});

test('los dos formularios públicos empiezan con quien entró', () => {
  /* Esta prueba exigía la MISMA línea literal en los dos sitios, y eso dejó de
     valer: el 7-sep se añadió un borrador en localStorage para la reserva, así
     que ahí manda lo que la persona ya había escrito y `datosIniciales` es el
     respaldo. Es mejor que antes. Lo que hay que fijar es la intención —que
     ninguno de los dos nazca en blanco— y no la forma.

     Ese mismo refactor quitó `datosIniciales` de los dos sitios mientras traía
     el borrador. Se restauró: las dos cosas caben, y sin el prellenado alguien
     con cuenta vuelve a teclear su nombre y su correo. */
  const p = sinComentarios(leer('src/pages/public/EventoPublicoPage.jsx'));
  const veces = [...p.matchAll(/datosIniciales\(usuario\)/g)].length;
  assert.equal(veces, 2, 'la reserva y la lista de espera tienen que arrancar igual');
  /* Y ninguno nace en blanco a mano. */
  assert.doesNotMatch(p, /useState\(\{ nombre: '', email: '', telefono: '' \}\)/);
  /* En la reserva, el borrador gana al prellenado: lo que la persona escribió
     no se pisa con lo de su cuenta. */
  assert.match(p, /progresoInicial\?\.form \|\| datosIniciales\(usuario\)/);
});

/* ── 2 · Las respuestas ya contestadas ────────────────────────────────── */

const MODAL = leer('src/pages/public/InscripcionSesionModal.jsx');
const MODAL_LIMPIO = sinComentarios(MODAL);

test('el taller pide lo que ya contestó al comprar', () => {
  assert.match(MODAL_LIMPIO, /eventosApi\.prellenarSesion\(slug, sesion\.id, codigoListo\)/);
  const api = sinComentarios(leer('src/api/eventos.js'));
  assert.match(api, /sesiones\/\$\{sesionId\}\/prellenar/);
});

test('no se pide sin código ni sin preguntas', () => {
  /* Sin código no hay a quién preguntarle, y sin preguntas no hay nada que
     rellenar: sería una petición por cada taller que se abre. */
  assert.match(MODAL_LIMPIO, /if \(!codigoListo \|\| codigoListo\.length < 4 \|\| !pide\.length\) return;/);
});

test('lo escrito a mano no se pisa', () => {
  /* Pisar lo que alguien acaba de teclear es peor que no prellenar nada. */
  assert.match(MODAL_LIMPIO, /if \(vacio\) \{ nuevas\[id\] = v; n\+\+; \}/);
});

test('que esto falle no impide apuntarse', () => {
  /* Es una comodidad, no un requisito. */
  assert.match(MODAL_LIMPIO, /\.catch\(\(\) => \{\}\);/);
});

test('se dice que están rellenadas y de dónde salen', () => {
  /* Ver datos escritos sin explicación hace dudar de si ya se envió algo. */
  assert.match(MODAL, /Rellenamos \$\{heredadas\} respuestas con lo que pusiste al registrarte/);
  assert.match(MODAL, /Puedes cambiarlas si algo ya no aplica/);
});

/* ── 3 · Los dos destinos que faltaban ────────────────────────────────── */

test('el capitán ve rellenado lo que puso al inscribir su equipo', () => {
  const p = sinComentarios(leer('src/pages/public/EquipoTorneoPage.jsx'));
  /* Las sugerencias PRIMERO y lo guardado encima: lo que el equipo ya envió
     nunca se pisa con una sugerencia. */
  assert.match(p, /setRespuestas\(\{ \.\.\.\(d\.sugeridas \|\| \{\}\), \.\.\.\(d\.equipo\?\.respuestas \|\| \{\}\) \}\)/);
  assert.match(leer('src/pages/public/EquipoTorneoPage.jsx'), /al inscribir tu equipo/);
});

test('la empresa ve rellenado lo que puso al comprar su stand', () => {
  const p = sinComentarios(leer('src/pages/public/ExpositorPage.jsx'));
  assert.match(p, /normaliza\(\{ \.\.\.\(d\.ficha \|\| \{\}\), \.\.\.\(d\.sugeridas \|\| \{\}\) \}\)/);
  assert.match(leer('src/pages/public/ExpositorPage.jsx'), /al comprar tu stand/);
});

test('a la empresa se le dice que TODAVÍA no está guardado', () => {
  /* Su ficha es pública: creer que ya se envió y no publicarla deja su stand en
     blanco delante de todo el evento. */
  assert.match(leer('src/pages/public/ExpositorPage.jsx'), /todavía no están guardados/);
});

test('los cuatro sitios que heredan lo dicen', () => {
  /* Ver campos escritos sin explicación hace dudar de si ya se envió algo. */
  const dicen = [
    'src/pages/public/InscripcionSesionModal.jsx',
    'src/pages/public/EquipoTorneoPage.jsx',
    'src/pages/public/ExpositorPage.jsx',
  ];
  for (const f of dicen) {
    assert.match(leer(f), /Rellenamos/, `${f} rellena sin decirlo`);
  }
});
