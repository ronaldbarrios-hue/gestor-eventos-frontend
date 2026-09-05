/* Cada error que se traga entero tiene que llevar un motivo escrito.
 *
 * ── Por qué esta prueba y no una prohibición ─────────────────────────────
 *
 * `.catch(() => {})` a veces es lo correcto: el service worker que no puede
 * comprobar si hay versión nueva sin conexión, la barra de marca que si no
 * carga desaparece y deja la página legible. Prohibirlo sería obligar a
 * inventar manejo de errores donde no hace falta.
 *
 * Lo que no puede pasar es que se escriba **sin pensarlo**, porque entonces
 * pasa lo de siempre en este proyecto: la petición falla, la lista se queda
 * vacía, y vacía se lee como «no hay». Ya mordió aquí — el desplegable de
 * torneos afirmaba «este evento todavía no tiene ningún torneo» cuando lo que
 * había pasado es que no pudimos preguntarlo, y el de tipos de boleta dejaba
 * crear un descuento general creyendo que no había nada que acotar.
 *
 * Así que la regla es la misma que ya usan `EXCEPCIONES_ATRAS` y `SUELTAS`:
 * se permite, pero **se escribe por qué**. Un comentario obliga a mirar el
 * caso una vez, que es justo lo que faltaba.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function archivos(dir) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(js|jsx)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

/* Se traga el error entero: ni lo enseña, ni lo apunta, ni cambia el estado. */
const TRAGA = /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/;

/* Un motivo es un comentario en la misma expresión, no en las N líneas de
   encima: aquí se escribe `pedir(...)` en una línea, `.then(...)` en otra y el
   `.catch` en la tercera, y el motivo va arriba del todo. Contando líneas
   sueltas, un motivo bien escrito quedaba fuera de la ventana.
   Se sube mientras se siga dentro de la misma expresión encadenada —líneas que
   empiezan por `.` o `)`, o que no cierran nada— y se para en cuanto acaba una
   sentencia. Doce líneas de tope, que es más de lo que ocupa cualquiera. */
function tieneMotivo(lineas, i) {
  for (let k = i - 1; k >= 0 && k >= i - 12; k--) {
    const l = lineas[k].trim();
    if (!l) continue;
    if (l.startsWith('/*') || l.startsWith('*') || l.startsWith('//')) return true;
    /* Fin de la sentencia anterior: lo de más arriba ya no habla de ésta. */
    if (l.endsWith(';') || l === '}') return false;
  }
  return false;
}

test('un error tragado sin motivo escrito es un dato que desaparece en silencio', () => {
  const sinMotivo = [];
  for (const f of archivos('src')) {
    const lineas = readFileSync(f, 'utf8').replace(/\r/g, '').split('\n');
    lineas.forEach((linea, i) => {
      if (TRAGA.test(linea) && !tieneMotivo(lineas, i)) {
        sinMotivo.push(`${f}:${i + 1}  ${linea.trim().slice(0, 90)}`);
      }
    });
  }
  assert.deepEqual(sinMotivo, [],
    'estos tragan el error sin decir por qué. Si es a propósito, escríbelo encima;\n' +
    'si no, mira qué se queda vacío cuando falla — vacío se lee como «no hay»:\n  ' +
    sinMotivo.join('\n  '));
});
