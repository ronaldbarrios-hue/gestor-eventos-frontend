/* El iframe insertado en la web de otro.
 *
 * ── Qué se protege aquí ──────────────────────────────────────────────────
 *
 * En festech.co el formulario de registro apareció un día diciendo «No se
 * encontró el evento». El evento existía. Lo que había fallado era la
 * petición — y la pantalla trataba «el servidor dice que no está» y «no pude
 * preguntarle» como el mismo caso.
 *
 * La diferencia importa porque las salidas son opuestas: si no existe, no hay
 * nada que hacer; si no pudimos preguntar, reintentar lo arregla. Contarle lo
 * primero a alguien que está en lo segundo lo manda a llamar al organizador
 * por un problema de dos segundos — y en la web de un cliente, delante de sus
 * visitantes.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const EMBED = 'src/pages/public/EmbedPage.jsx';
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('«no existe» y «no pude preguntar» son dos estados distintos', () => {
  const src = sinComentarios(readFileSync(EMBED, 'utf8'));
  assert.match(src, /setEstado\('sin_conexion'\)|: 'sin_conexion'/,
    'no existe el estado de fallo de comunicación');
  assert.match(src, /status === 404 \? 'no_existe'/,
    'no se mira el status: cualquier fallo volvería a leerse como evento inexistente');
});

test('el fallo de comunicación se dice como tal, y se puede reintentar', () => {
  const src = readFileSync(EMBED, 'utf8');
  const i = src.indexOf("estado === 'sin_conexion'");
  assert.ok(i > 0, 'nadie atiende el estado de fallo de comunicación');
  const pantalla = src.slice(i, src.indexOf("estado === 'no_existe'"));
  assert.match(pantalla, /problema de comunicación/,
    'la pantalla no dice qué pasó');
  assert.match(pantalla, /setIntento\(n => n \+ 1\)/,
    'no hay botón de reintentar: la única salida sería recargar la web entera del cliente');
});

test('reintentar vuelve a pedir de verdad', () => {
  /* Un contador que sube y no está en las dependencias del efecto es un botón
     que no hace nada — y eso se lee peor que no tenerlo. */
  const src = sinComentarios(readFileSync(EMBED, 'utf8'));
  assert.match(src, /\}, \[slug, seccion, intento\]\);/,
    'el contador de reintentos no dispara la carga otra vez');
});
