/* Ningún permiso del panel es una casilla decorativa.
 *
 * ── El espejo que faltaba ────────────────────────────────────────────────
 *
 * El backend tiene `permisosQueNoConcedianNada`: ningún permiso del catálogo se
 * puede conceder sin que alguna ruta lo compruebe. Es la mitad del problema.
 *
 * La otra mitad es ésta, y es la que se nos escapó: un permiso que el SERVIDOR
 * comprueba pero que el PANEL no mira en ninguna parte. La casilla se marca, se
 * ve marcada en el rol, su etiqueta promete algo —«Diseñar escarapelas y
 * carnés»— y no hay pantalla, pestaña ni botón que aparezca por tenerla.
 *
 * No es teoría. El 11-sep había SEIS:
 *
 *   gestionar_acreditacion   la pestaña no salía y los diseñadores tampoco
 *   gestionar_padron         no abría Invitaciones
 *   gestionar_vacantes       no abría Vacantes
 *   gestionar_documentos     no abría la zona de subir
 *   publicar_evento          el botón era sólo del dueño (34 roles lo tenían)
 *   gestionar_imagenes       la portada se descartaba en silencio (34 roles)
 *
 * Cuatro de los seis los creó la migración 0124 justo para no tener que
 * entregar el evento entero, y el panel no se enteró de ninguno.
 *
 * Se encontraron a mano, componiendo un rol de logística y comprobando permiso
 * por permiso qué abría cada uno. Este test es para no tener que volver a
 * hacerlo a mano.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');
const CATALOGO = path.join('src', 'lib', 'permisos.js');

/* Sin comentarios, y ésta es la parte que importa: este repo explica mucho, y
   un permiso nombrado sólo dentro de una explicación no lo mira nadie. Ya se
   midió a ojo una vez y salió mal — `gestionar_acreditacion` parecía usado
   porque aparecía en tres comentarios. */
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const permisosDelCatalogo = () => {
  const src = fs.readFileSync(path.join(raiz, CATALOGO), 'utf8');
  return [...src.matchAll(/\{ id: '([a-z_*]+)'/g)]
    .map(m => m[1])
    /* El comodín no se nombra en ninguna pantalla: es «puede todo», y lo
       resuelve `puedeVer` sin que nadie pregunte por él por su nombre. */
    .filter(id => id !== '*');
};

/* Todo el panel en un solo texto, menos el propio catálogo: allí cada permiso
   aparece por definición, y contarlo daría siempre que sí. */
const panel = (() => {
  let acc = '';
  const anda = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) anda(p);
      /* Se limpia CADA archivo antes de juntarlo, no el monton entero despues.
         Juntando primero, un abre-comentario que viva dentro de una cadena en un
         archivo emparejaba con el cierra-comentario de OTRO y se comia todo lo que
         hubiera en medio. Paso: `loQuePuedoHacer.js` desaparecia del texto y cuatro
         permisos que si se usan salian como decorativos. */
      else if (/\.jsx?$/.test(e.name) && !p.endsWith(CATALOGO)) {
        acc += `
${sinComentarios(fs.readFileSync(p, 'utf8'))}`;
      }
    }
  };
  anda(path.join(raiz, 'src'));
  return acc;
})();

/* Los permisos por los que el panel PREGUNTA de verdad.
 *
 * No vale buscar el nombre suelto por el código. Se probó y falló: la primera
 * versión de este test daba por bueno `publicar_evento` porque aparece en
 * `GestbotPage.jsx`, dentro de la lista de herramientas que puede usar el
 * agente. Es el mismo texto y no es una comprobación de permiso — la casilla
 * seguía sin abrir nada.
 *
 * Así que se buscan las formas en que esta interfaz pregunta:
 *   · `perm:` en el menú, suelto o en lista
 *   · `puede('x')` / `puedeVer('x', ...)` dentro de una pantalla
 *   · `permisos.includes('x')`
 *   · `{ permiso: 'x', frase, ruta }` en `lib/loQuePuedoHacer.js`, que es la
 *     tabla de «qué puedo hacer aquí»: enseña la frase y lleva a su pantalla
 *
 * ── Lo que este test NO puede ver ────────────────────────────────────────
 *
 * Hay permisos que el panel nunca nombra porque se los resuelve el servidor y
 * le manda el resultado: el chat recibe `puedeCrear` ya calculado con
 * `crear_canales`, y la pantalla sólo mira ese booleano. Eso es correcto y
 * aquí es invisible.
 *
 * Así que si este test se queja de un permiso, la pregunta es cuál de las tres
 * cosas pasa: falta una comprobación en el panel (el caso de los seis), el
 * permiso lo resuelve el servidor y hay que anotarlo, o el permiso sobra. Lo
 * que NO vale es añadir una entrada de mentira a `loQuePuedoHacer` para
 * callarlo: eso le promete a alguien una pantalla que no existe. */
const preguntados = (() => {
  const ids = new Set();
  for (const m of panel.matchAll(/perm:\s*(\[[^\]]*\]|'[^']*')/g))
    for (const p of m[1].matchAll(/'([^']+)'/g)) ids.add(p[1]);
  for (const m of panel.matchAll(/(?:puede|puedeVer|tienePermiso)\(\s*'([^']+)'/g)) ids.add(m[1]);
  for (const m of panel.matchAll(/permisos\.includes\(\s*'([^']+)'/g)) ids.add(m[1]);
  for (const m of panel.matchAll(/permiso:\s*'([^']+)'/g)) ids.add(m[1]);
  return ids;
})();

test('todo permiso que se puede marcar abre algo en el panel', () => {
  const decorativas = permisosDelCatalogo().filter(id => !preguntados.has(id));

  assert.deepEqual(decorativas, [],
    'estos permisos se marcan en el panel y no hacen que aparezca nada:\n  '
    + decorativas.join('\n  ')
    + '\n  (o el permiso sobra, o hay una pantalla que debería mirarlo y no lo mira)');
});

test('y el catálogo no promete efecto donde no lo hay', () => {
  /* `aplicado: false` pinta «sin efecto aún» junto a la casilla. Es una
     promesa al revés —«esto todavía no hace nada»— y también se puede quedar
     vieja: si el permiso ya funciona, la insignia asusta sin motivo.

     Hoy los 31 están en `aplicado: true`. Lo que se vigila es que un `false`
     nuevo venga acompañado de la verdad: que de verdad no lo use nadie. */
  const src = fs.readFileSync(path.join(raiz, CATALOGO), 'utf8');
  const sinEfecto = [...src.matchAll(/\{ id: '([a-z_]+)'[^}]*aplicado: false/g)].map(m => m[1]);

  const mienten = sinEfecto.filter(id => preguntados.has(id));
  assert.deepEqual(mienten, [],
    'dicen «sin efecto aún» y el panel sí los mira: la insignia asusta sin motivo');
});
