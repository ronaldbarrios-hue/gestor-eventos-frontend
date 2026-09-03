/* Que el menú no deje pantallas huérfanas ni enlaces rotos.
 *
 * Reagrupar el workspace mueve tres cosas a la vez y hay que moverlas juntas:
 * la lista de secciones, el mapa de direcciones viejas y el reparto de
 * pantallas. Si una se queda atrás no da error — deja una pestaña en blanco, o
 * manda un enlace guardado al Resumen sin explicación. Es el tipo de fallo que
 * sólo se ve entrando a mano por cada una de las 33 pestañas.
 *
 * Se comprueba sobre el fuente, como `montaje.test.js` en el backend: lo que
 * importa es la correspondencia entre tres listas, no lo que React pinta.
 *
 * Correr: node --test tests/menu.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUENTE = readFileSync(
  join(RAIZ, 'src/pages/events/workspace/EventWorkspace.jsx'), 'utf8',
);

/* Los pares `seccion/tab` que el menú ofrece. */
function delMenu() {
  const bloque = FUENTE.slice(
    FUENTE.indexOf('const SECCIONES = ['),
    FUENTE.indexOf('function puedeVer('),
  );
  const pares = [];
  /* Cada sección abre con su id y arrastra sus tabs hasta la siguiente. La
     primera coincidencia dentro de ese trozo es la sección misma, así que se
     salta por posición y no por nombre: `zonas/zonas` es una pestaña legítima
     y descartarla por llamarse igual que su sección la haría invisible a esta
     prueba, que es justo lo que no puede pasar. */
  const secciones = [...bloque.matchAll(/\{\s*id:\s*'([\w-]+)',\s*label:[^\n]*tabs:\s*\[/g)];
  for (let i = 0; i < secciones.length; i++) {
    const desde = secciones[i].index;
    const hasta = i + 1 < secciones.length ? secciones[i + 1].index : bloque.length;
    const cuerpo = bloque.slice(desde, hasta);
    const ids = [...cuerpo.matchAll(/\{\s*id:\s*'([\w-]+)',\s*label:/g)].map(m => m[1]);
    for (const tab of ids.slice(1)) pares.push(`${secciones[i][1]}/${tab}`);
  }
  return pares;
}

const conCaso = new Set(
  [...FUENTE.matchAll(/case\s+'([\w-]+\/[\w-]+)'/g)].map(m => m[1]),
);

const reubicadas = (() => {
  const bloque = FUENTE.slice(
    FUENTE.indexOf('const REUBICADAS = {'),
    FUENTE.indexOf("const sBruto = searchParams.get('s')"),
  );
  return [...bloque.matchAll(/'([\w-]+\/[\w-]+)'\s*:\s*\['([\w-]+)',\s*'([\w-]+)'\]/g)]
    .map(m => ({ vieja: m[1], nueva: `${m[2]}/${m[3]}` }));
})();

test('el menú reconoce su propia estructura', () => {
  const pares = delMenu();
  assert.ok(pares.length > 25, `sólo reconozco ${pares.length} pestañas: la prueba se quedó vieja`);
  assert.ok(reubicadas.length > 20, 'ya no reconozco el mapa de rutas viejas: revísalo');
});

test('toda pestaña del menú tiene una pantalla que pintar', () => {
  /* Sin esto, una pestaña renombrada cae en el `default` y enseña «Módulo en
     construcción» a alguien que tenía esa pantalla funcionando ayer. */
  const huerfanas = delMenu().filter(p => !conCaso.has(p));
  assert.deepEqual(huerfanas, [], `pestañas sin pantalla: ${huerfanas.join(', ')}`);
});

test('toda ruta vieja lleva a una pestaña que existe', () => {
  const menu = new Set(delMenu());
  const rotas = reubicadas.filter(r => !menu.has(r.nueva) && !conCaso.has(r.nueva));
  assert.deepEqual(rotas.map(r => `${r.vieja} → ${r.nueva}`), [],
    'estas direcciones viejas apuntan a una pestaña que ya no existe');
});

test('ninguna ruta vieja apunta a sí misma', () => {
  /* Una entrada `a/b: [a, b]` es ruido que engaña al leer el mapa: parece que
     algo se mudó y no se mudó nada. */
  const bobas = reubicadas.filter(r => r.vieja === r.nueva);
  assert.deepEqual(bobas.map(r => r.vieja), []);
});

test('los enlaces internos del código apuntan a pestañas que existen', () => {
  /* `?s=…&t=…` escrito a mano en otra pantalla. Antes de reagrupar había al
     menos cinco, y son los que se quedan rotos en silencio. Valen los que
     estén en el menú y los que el mapa de rutas viejas sepa traducir. */
  const menu = new Set(delMenu());
  const viejas = new Set(reubicadas.map(r => r.vieja));
  const malos = [];

  const recorrer = (dir) => {
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) { recorrer(ruta); continue; }
      if (!/\.(jsx?|mjs)$/.test(nombre)) continue;
      const txt = readFileSync(ruta, 'utf8');
      for (const m of txt.matchAll(/[?&]s=([\w-]+)&t=([\w-]+)/g)) {
        const par = `${m[1]}/${m[2]}`;
        if (!menu.has(par) && !viejas.has(par)) {
          malos.push(`${nombre}: ${par}`);
        }
      }
    }
  };
  recorrer(join(RAIZ, 'src'));

  assert.deepEqual(malos, [], 'estos enlaces no llevan a ninguna parte');
});

/* ── Los enlaces que salen del BACKEND ───────────────────────────────────
 *
 * Las notificaciones llevan dentro un `/eventos/:id?s=…&t=…` escrito a mano:
 * «alguien se postuló a esta vacante», «la zona gamer está llena». Cuando el
 * menú se reagrupa, esos enlaces **no fallan: dejan al organizador en el
 * Resumen**. Ni error, ni 404, ni nada en un log. Pulsa el aviso, ve otra
 * pantalla y asume que no había nada que ver.
 *
 * Encontrados tres malos el 2026-09-02. El peor no era de la reagrupación:
 * `?s=vacantes` **nunca** fue una sección —vacantes siempre fue una pestaña—,
 * así que el aviso de una postulación no ha llevado a las vacantes en su vida.
 *
 * Vive aquí y no en el backend porque aquí está el menú, que es la verdad. El
 * repo del backend se busca hacia arriba para que funcione también desde un
 * worktree; si no está, la prueba se salta. */
function repoBackend() {
  let dir = RAIZ;
  for (let i = 0; i < 6; i++) {
    const cand = join(dir, '..', 'gestor-eventos-backend');
    if (existsSync(join(cand, 'routes'))) return cand;
    dir = join(dir, '..');
  }
  return null;
}

test('los avisos del backend llevan a una pantalla que existe', (t) => {
  const backend = repoBackend();
  if (!backend) { t.skip('el repo del backend no está cerca: nada que comparar'); return; }

  const menu = new Set(delMenu());
  const viejas = new Set(reubicadas.map((r) => r.vieja));
  const secciones = new Set([...menu].map((p) => p.split('/')[0]));

  const malos = [];
  const recorrer = (dir) => {
    for (const nombre of readdirSync(dir)) {
      if (nombre === 'node_modules' || nombre === '.claude') continue;
      const abs = join(dir, nombre);
      if (statSync(abs).isDirectory()) { recorrer(abs); continue; }
      if (!nombre.endsWith('.js')) continue;
      const txt = readFileSync(abs, 'utf8');
      const rel = abs.slice(backend.length + 1).split(/[\\/]/).join('/');
      for (const m of txt.matchAll(/\?s=([\w-]+)(?:&t=([\w-]+))?/g)) {
        const [, sec, tab] = m;
        if (!tab) {
          /* Sin pestaña sólo vale si `sec` ES una sección: el panel abre su
             primera. `?s=vacantes` no lo es. */
          if (!secciones.has(sec)) malos.push(`${rel}: ?s=${sec} (no es una sección)`);
          continue;
        }
        const par = `${sec}/${tab}`;
        if (!menu.has(par) && !viejas.has(par)) malos.push(`${rel}: ?s=${sec}&t=${tab}`);
      }
    }
  };
  for (const c of ['routes', 'lib', 'modules', 'core', 'scripts']) {
    const d = join(backend, c);
    if (existsSync(d)) recorrer(d);
  }

  assert.deepEqual(malos, [], 'estos avisos dejan al organizador en el Resumen sin decirle por qué');
});
