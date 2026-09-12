/* La pantalla de jurados dice cómo traer a alguien que no es del equipo.
 *
 * ── La pregunta que la destapó ───────────────────────────────────────────
 *
 * Armando FESTECH: «¿pueden ser personas registradas en el evento, o
 * registrarlas manualmente?».
 *
 * La respuesta del servidor es que no: `assertEsJurado` exige ser miembro
 * ACTIVO del evento, y la ruta de añadir jurado lo vuelve a comprobar. Está
 * bien que sea así, y la razón está escrita en `routes/torneoJurado.js`: ser
 * jurado no puede ser la puerta de entrada al panel de alguien que no tenía
 * por qué estar ahí.
 *
 * Pero sí hay camino, y la pantalla no lo decía. `assertEsJurado` pide ser
 * miembro Y estar en la lista — no mira el catálogo de permisos. O sea que un
 * rol SIN NINGÚN permiso basta: el jurado entra, califica, y no ve ni los
 * inscritos ni el dinero. Que es justo lo que se quiere de un inversionista o
 * un profesor invitado a un DemoDay.
 *
 * ── Y el callejón sin salida ─────────────────────────────────────────────
 *
 * Con `elegibles = 0` y `jurados = 0` —un torneo recién creado en un evento
 * cuyo equipo aún no existe— la vista no pintaba NADA: ni selector, ni frase.
 * Un recuadro diciendo que no hay jurados y ninguna forma de que los haya.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(
  path.join(process.cwd(), 'src', 'pages', 'events', 'tabs', 'torneo', 'TorneoJurado.jsx'), 'utf8').replace(/\r/g, '');
const sinComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('siempre se explica cómo traer a un jurado de fuera del equipo', () => {
  assert.match(sinComentarios, /¿Y si el jurado no es del equipo\?/,
    'la pantalla vuelve a dejar sin respuesta a quien quiere un jurado externo');

  /* Y la explicación tiene que decir la parte que la hace segura: SIN
     PERMISOS. Sin eso, lo que se entiende es «mételo al equipo», y quien lo
     lea deprisa le dará un rol de coordinador a un jurado externo. */
  assert.match(sinComentarios, /sin permisos marcados/,
    'se dice que lo invites al equipo sin decir que el rol va sin permisos');
});

test('no hay callejón sin salida con el equipo vacío', () => {
  /* El caso que no pintaba nada: sin elegibles y sin jurados. */
  assert.match(sinComentarios, /elegibles\.length === 0 && jurados\.length === 0/,
    'con el equipo vacío la pantalla vuelve a no ofrecer ninguna salida');

  /* El bloque de ayuda NO puede estar dentro de un `elegibles.length > 0`:
     ahí desaparecería justo en el caso en que hace falta. */
  const i = sinComentarios.indexOf('¿Y si el jurado no es del equipo?');
  const antes = sinComentarios.slice(Math.max(0, i - 400), i);
  assert.ok(!/\{elegibles\.length > 0 && \(/.test(antes),
    'la ayuda quedó dentro del bloque que sólo se pinta cuando hay elegibles');
});

test('el aviso de «nadie puede calificar» sigue en pie', () => {
  /* Es el que hace que alguien abra esta pestaña. */
  assert.match(sinComentarios, /function FaltaParaCalificar/);
  assert.match(sinComentarios, /Nadie puede calificar/);
  assert.match(sinComentarios, /onIr\('jurados'\)|onIr\(f\.ir\)/,
    'el aviso ya no lleva a la pestaña donde se arregla');
});
