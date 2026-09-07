/* Crear el torneo sin salir del formulario, y las boletas que se quedaban fuera.
 *
 * ── Los dos huecos ───────────────────────────────────────────────────────
 *
 * 1. Un tipo de boleta que crea equipos tiene que decir a qué torneo, y si el
 *    evento no tiene ninguno el formulario mandaba a otra pestaña. Volver
 *    significaba perder el nombre, el precio y la descripción ya escritos: la
 *    salida real era cancelar y empezar de cero.
 *
 * 2. Quien mete al equipo es un disparador de la base que corre
 *    `AFTER INSERT OR UPDATE OF estado` sobre la boleta. Al pasar un tipo a
 *    «Un equipo» después de haber vendido, las boletas ya pagadas no entran
 *    —su estado ya no cambia— y no hay ningún error que ver. Se descubre el
 *    día de la competencia, contando sillas.
 *
 * Correr: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (f) => readFileSync(f, 'utf8').replace(/\r/g, '');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const TAB = leer('src/pages/events/tabs/TicketsTab.jsx');
const LIMPIO = sinComentarios(TAB);

/* ── 1 · El torneo se crea aquí ───────────────────────────────────────── */

test('el formulario deja crear el torneo sin salir', () => {
  assert.match(LIMPIO, /const crearTorneoAqui = async \(\) => \{/);
  assert.match(LIMPIO, /torneosApi\.crear\(eventoId, \{ nombre, formato: FORMATO_AL_VUELO \}\)/);
  /* Y ya no manda a otra pestaña a perder lo escrito. */
  assert.doesNotMatch(LIMPIO, /Crea uno —desde el sub-evento o en la/);
});

test('el torneo recién creado queda elegido', () => {
  /* Crearlo y dejar el desplegable en «¿a qué torneo entra?» sería hacer el
     trabajo y no cerrarlo: el formulario seguiría sin poder guardarse. */
  assert.match(LIMPIO, /setTorneos\(ts => \[\.\.\.ts, nuevo\]\)/);
  assert.match(LIMPIO, /update\('crea_torneo_id', nuevo\.id\)/);
});

test('el formato que se manda es uno que el servidor acepta', () => {
  /* Escribir aquí un formato inventado no falla al escribirlo: falla al pulsar
     el botón, con un «Formato inválido» que no dice cuál era el bueno. Pasó al
     escribir esto —«eliminacion_simple», que no existe—. */
  const m = TAB.match(/const FORMATO_AL_VUELO = '([a-z_]+)';/);
  assert.ok(m, 'no encuentro FORMATO_AL_VUELO');

  const servidor = ['../gestor-eventos-backend/routes/torneos.js',
    '../../../../gestor-eventos-backend/routes/torneos.js']
    .map(f => resolve(process.cwd(), f)).find(f => existsSync(f));
  if (servidor) {
    const lista = readFileSync(servidor, 'utf8').match(/const FORMATOS_VALIDOS = \[([^\]]+)\]/);
    assert.ok(lista, 'no encuentro FORMATOS_VALIDOS en el servidor');
    assert.ok(lista[1].includes(`'${m[1]}'`),
      `el servidor no acepta el formato «${m[1]}»; acepta ${lista[1].trim()}`);
  } else {
    /* El backend es otro repositorio y puede no estar al lado. Se comprueba al
       menos que no se coló el valor equivocado que ya falló una vez. */
    assert.notEqual(m[1], 'eliminacion_simple');
  }
});

/* ── 2 · Las boletas que se quedaban fuera ────────────────────────────── */

test('se pregunta cuántas se quedarían fuera, y sólo cuando aplica', () => {
  /* Sobre un tipo que todavía no existe no hay boletas que preguntar, y sobre
     uno que no crea equipos la pregunta no significa nada. */
  assert.match(LIMPIO, /if \(!initial\?\.id \|\| form\.crea !== 'equipo'\) \{ setSueltas\(null\); return; \}/);
  assert.match(LIMPIO, /ticketsApi\.boletasSinEquipo\(eventoId, initial\.id\)/);
});

test('si no se puede preguntar, no se inventa un número', () => {
  /* Decir «0 boletas sueltas» cuando no se sabe es peor que no decir nada:
     deja a alguien tranquilo sobre algo que no se comprobó. */
  assert.match(LIMPIO, /\.catch\(\(\) => \{ if \(vivo\) setSueltas\(null\); \}\)/);
});

test('el aviso sale con el botón que lo arregla, no solo con el susto', () => {
  assert.match(LIMPIO, /sueltas\?\.cuantas > 0 &&/);
  assert.match(LIMPIO, /ticketsApi\.crearEquipos\(eventoId, initial\.id\)/);
  assert.match(TAB, /Meterlas al torneo/);
});

test('después de meterlas el aviso desaparece', () => {
  /* Un aviso que sigue ahí después de resolverlo enseña a ignorar los avisos. */
  assert.match(LIMPIO, /setSueltas\(\{ cuantas: 0, aviso: null \}\)/);
});

/* ── La capa de API ───────────────────────────────────────────────────── */

test('las dos llamadas apuntan a las rutas del servidor', () => {
  const api = sinComentarios(leer('src/api/tickets.js'));
  assert.match(api, /tickets\/\$\{ticketId\}\/boletas-sin-equipo/);
  assert.match(api, /tickets\/\$\{ticketId\}\/crear-equipos/);
});
