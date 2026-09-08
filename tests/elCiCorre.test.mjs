/* Que el CI exista, y que corra lo que dice que corre.
 *
 * ── Por qué una prueba sobre el CI ───────────────────────────────────────
 *
 * Porque el fallo no fue que las pruebas fallaran: fue que **nadie las corría**.
 * `npm test` ni siquiera estaba definido en package.json — escribirlo no hacía
 * nada y devolvía un error de npm que se lee como si no hubiera pruebas.
 *
 * Un flujo de CI que instala y no corre nada pasa en verde igual, y da la misma
 * sensación de seguridad que uno que sí funciona. Esto lo fija.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const leer = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const FLUJO = leer('.github/workflows/pruebas.yml');
const PKG = JSON.parse(leer('package.json'));

test('`npm test` corre las pruebas de verdad', () => {
  /* Sin esto, el paso «Pruebas» del CI no ejecuta nada. */
  assert.ok(PKG.scripts.test, 'no hay script `test` en package.json');
  assert.match(PKG.scripts.test, /node --test/);
  assert.match(PKG.scripts.test, /tests\//);
});

test('el CI corre lint, pruebas, build y el widget', () => {
  /* Los cuatro. Cada uno caza algo que los otros no:
     - lint cazó un `usuario is not defined` que se coló al restaurar código;
     - las pruebas comparan cada copia contra su fuente real;
     - el build caza lo que pasa las pruebas y Vite no compila;
     - el widget prueba el botón en un Chromium con dos orígenes. */
  for (const paso of ['npm ci', 'npm run lint', 'npm test', 'npm run build', 'npm run test:widget']) {
    assert.ok(FLUJO.includes(paso), `el CI no corre «${paso}»`);
  }
});

test('y corre en los PR, no sólo al empujar a main', () => {
  /* Enterarse después de fusionar es enterarse tarde: es exactamente lo que
     pasó con los dos commits del 7 de septiembre. */
  assert.match(FLUJO, /pull_request:/);
  assert.match(FLUJO, /push:/);
});

test('instala lo del lock, no lo que le parezca', () => {
  /* `npm install` puede resolver otras versiones y hacer que el CI pruebe algo
     distinto de lo que corre en producción. */
  assert.ok(FLUJO.includes('npm ci'));
  assert.ok(!/run: npm install/.test(FLUJO), 'usa npm install en vez de npm ci');
});

test('el lint no se salta cuando no hay configuración', () => {
  /* `--if-present` en el backend hace que un script ausente pase en verde. Aquí
     el script existe, así que no hace falta — y no debe estar, porque
     convertiría un borrado accidental del script en un CI que no comprueba. */
  assert.ok(!FLUJO.includes('--if-present'), 'un script borrado pasaría en verde');
});
