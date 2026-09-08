/* Qué puede hacer Claude con tu cuenta, elegido al generar el token.
 *
 * ── Un error mío, anotado porque enseña ──────────────────────────────────
 *
 * Empecé construyendo una pantalla nueva de «Conectar Claude» en Integraciones,
 * convencido de que el servidor MCP era inalcanzable porque `api_tokens` tenía
 * cero filas.
 *
 * **Ya existía**, en Ajustes, con OAuth como camino normal y el token como plan
 * B para Claude Code y Claude Desktop — y con un comentario que explica por qué
 * el token va replegado: «si se ofrecen los dos caminos al mismo nivel, la
 * mitad de la gente elige el que deja una credencial pegada en un archivo».
 *
 * La tabla estaba vacía porque el camino normal no usa tokens, no porque nadie
 * pudiera llegar. Cometí el fallo que llevo la sesión entera arreglando:
 * construir una segunda copia de algo que ya estaba.
 *
 * Lo que sí faltaba, y es lo que queda: poder acotar el token.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const leer = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const PANTALLA = leer('src/pages/ajustes/ConectarClaude.jsx');
const API = leer('src/api/integraciones.js');

test('hay UNA pantalla de conectar Claude, no dos', () => {
  /* La comprobación que me habría ahorrado el rodeo. */
  const hay = ['src/pages/ajustes/ConectarClaude.jsx', 'src/components/ConectarClaude.jsx']
    .filter(f => { try { leer(f); return true; } catch { return false; } });
  assert.deepEqual(hay, ['src/pages/ajustes/ConectarClaude.jsx']);
});

test('se elige qué podrá hacer el token, y viaja al crearlo', () => {
  /* Un token que nace pudiendo todo y se limita después ya estuvo pudiendo
     todo. */
  assert.match(sinComentarios(API), /crearToken : \(nombre, scopes\)/);
  assert.match(sinComentarios(PANTALLA), /crearToken\('Claude \(MCP\)', marcados\)/);
});

test('el catálogo de permisos lo manda el servidor', () => {
  /* Mantener aquí una copia de los grupos es la forma habitual de que se
     separen: el servidor añadiría uno y la pantalla seguiría enseñando cuatro. */
  const s = sinComentarios(PANTALLA);
  assert.match(s, /setAlcances\(d\.alcances \|\| \[\]\)/);
  assert.doesNotMatch(s, /const (GRUPOS|ALCANCES) = \[/);
});

test('si el catálogo no llega, se puede conectar igual', () => {
  /* No poder elegir permisos no puede impedir conectar: sin catálogo se crea
     con todo, que es exactamente lo que hacía antes. */
  assert.match(PANTALLA, /\.catch\(\(\) => \{\}\)/);
  assert.match(sinComentarios(PANTALLA), /\{alcances\.length > 0 && \(/);
});

test('«ver información» no se puede desmarcar', () => {
  /* Un token que no lee no sirve para nada. */
  assert.match(sinComentarios(PANTALLA), /disabled=\{a\.fijo\}/);
  assert.match(sinComentarios(PANTALLA), /!a\.fijo && setMarcados/);
});

test('y un solo botón de generar', () => {
  /* Escribí dos en el mismo bloque: uno que cargaba el catálogo y otro que
     creaba. Dos botones con el mismo texto en la misma caja no se eligen, se
     pulsan al azar. */
  assert.equal((PANTALLA.match(/Generar el token/g) || []).length, 1);
});

test('la advertencia dice lo que ahora es cierto', () => {
  /* Decía «un token vale por tu cuenta entera». Ya no tiene por qué: lo que
     puede hacer se elige. Una advertencia que describe otro comportamiento es
     peor que ninguna. */
  assert.doesNotMatch(PANTALLA, /vale por tu cuenta entera/);
  assert.match(PANTALLA, /si no eliges\s*\n?\s*nada, puede todo/);
});
