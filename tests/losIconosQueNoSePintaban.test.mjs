/* Ningún icono llamado por un nombre que no existe.
 *
 * ── Cómo apareció ────────────────────────────────────────────────────────
 *
 * Escribiendo el aviso del torneo puse `<Icono name="alerta">`. Dos errores en
 * seis caracteres: la prop es `nombre`, y el icono se llama `aviso`.
 *
 * `Icono` hace `if (!trazo) return null`. O sea que el icono no se pinta y no
 * pasa nada más: ni error en consola, ni hueco, ni aviso. Se descubre mirando
 * la pantalla y pensando «¿aquí no iba un triángulo?».
 *
 * Al buscar si me había pasado sólo a mí, salieron TRES más, ya en producción:
 *
 *   PlanoTab             dos iconos (`hecho`, `aviso`)
 *   VerificarBoletaPage  uno (`entrada`) — y ésta es la página pública que
 *                        abre alguien con una boleta en la mano
 *
 * Todos con `name=` en vez de `nombre=`. Ninguno se estaba pintando.
 *
 * ── Por qué el componente no avisa, y por qué está bien ──────────────────
 *
 * Porque devolver `null` es lo correcto en pantalla: un icono que falta no
 * puede tumbar la vista de nadie ni pintar una caja rota delante de un
 * asistente. El sitio donde hay que enterarse es éste.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const raiz = process.cwd();
const FUENTE_ICONOS = path.join('src', 'components', 'ui', 'Iconos.jsx');

const nombresValidos = (() => {
  const src = fs.readFileSync(path.join(raiz, FUENTE_ICONOS), 'utf8');
  /* Las claves de `TRAZOS`, que es la lista de verdad. Se leen del fuente y no
     importando el módulo: es JSX y aquí no hay quien lo compile. */
  const i = src.indexOf('const TRAZOS = {');
  assert.ok(i > 0, 'Iconos.jsx ya no define TRAZOS como se esperaba');
  const cuerpo = src.slice(i, src.indexOf('\n};', i));
  return new Set([...cuerpo.matchAll(/^\s{2}([a-zA-Z_][\w]*)\s*:/gm)].map(m => m[1]));
})();

const pantallas = (() => {
  const out = [];
  const anda = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) anda(p);
      else if (e.name.endsWith('.jsx')) out.push(p);
    }
  };
  anda(path.join(raiz, 'src'));
  return out;
})();

test('la lista de iconos se pudo leer', () => {
  /* Sin esto, un cambio de forma en `Iconos.jsx` dejaría el conjunto vacío y
     los dos tests de abajo pasarían sin comprobar nada — quejándose de cero
     iconos porque no encontró ninguno que mirar. */
  assert.ok(nombresValidos.size > 10,
    `sólo se leyeron ${nombresValidos.size} iconos: la lista no se está leyendo bien`);
});

test('nadie llama a <Icono> con la prop equivocada', () => {
  /* `name=` en vez de `nombre=` no da error: el icono simplemente no sale. */
  const malos = [];
  for (const p of pantallas) {
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(/<Icono\s+name=/g)) malos.push(path.relative(raiz, p));
  }
  assert.deepEqual([...new Set(malos)], [],
    'usan `name=` en vez de `nombre=`, así que esos iconos no se pintan');
});

test('ningún icono se llama por un nombre que no existe', () => {
  const malos = [];
  for (const p of pantallas) {
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(/<Icono\s+nombre="([^"]+)"/g)) {
      if (!nombresValidos.has(m[1])) malos.push(`${path.relative(raiz, p)} → ${m[1]}`);
    }
  }
  assert.deepEqual(malos, [],
    'estos iconos no existen en `TRAZOS`, así que no se pintan y nadie se entera');
});
