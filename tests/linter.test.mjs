/* El linter, dentro de la suite.
 *
 * ── Por qué esto es una prueba y no una nota en el README ────────────────
 *
 * `eslint.config.js` existe desde hace tiempo y tiene una sola regla,
 * `no-undef`, puesta ahí por una clase de fallo que ya mordió tres veces según
 * su propio comentario: una función que se llama y que nadie escribió, o una
 * variable de otro componente usada como si fuera global.
 *
 * Lo que no había era nada que lo ejecutara. Ni un script en `package.json`,
 * ni CI, ni esta suite. Un linter que nadie corre es un archivo de
 * configuración.
 *
 * Y no es hipotético: escribiendo esta misma tanda usé `inscripcionAbierta`
 * dentro de `SesionRow`, que no la recibe. **Vite compiló sin una queja** —es
 * un error de ejecución, no de compilación— y las 49 pruebas pasaron. El
 * linter lo habría cazado en dos segundos, si alguien lo hubiera corrido.
 *
 * Por eso vive aquí: `node --test tests/` es lo que se corre de verdad.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

test('eslint no encuentra nada en src/', () => {
  assert.ok(existsSync('eslint.config.js'), 'desapareció la configuración del linter');

  /* Se llama al .js con node y no al `.bin/eslint`: en Windows ese enlace es
     un `.cmd`, y `execFileSync` no puede lanzar un .cmd sin shell — devuelve
     EINVAL, que se lee como «el linter encontró problemas» y no lo es. Con el
     .js directo la prueba se comporta igual en los tres sistemas. */
  const bin = 'node_modules/eslint/bin/eslint.js';
  if (!existsSync(bin)) {
    /* Sin dependencias instaladas no se puede afirmar nada. Se dice y se
       pasa: una prueba que falla por no haber corrido `npm install` enseña a
       ignorar los fallos. */
    console.warn('[linter] eslint no está instalado; no se pudo comprobar.');
    return;
  }

  try {
    execFileSync(process.execPath, [bin, 'src', '--max-warnings', '0'], { stdio: 'pipe', encoding: 'utf8' });
  } catch (e) {
    /* La salida de eslint va a stdout, no a stderr. Sin esto el mensaje del
       fallo llegaría vacío y habría que volver a correrlo a mano para verlo —
       que es justo la fricción por la que un linter deja de usarse. */
    assert.fail(`el linter encontró problemas:\n\n${e.stdout || e.stderr || e.message}`);
  }
});
