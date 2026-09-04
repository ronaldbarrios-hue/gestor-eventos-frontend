/* El editor de la página: dos modos, y lo que se exporta se puede tocar.
 *
 * ── Qué se protege aquí ──────────────────────────────────────────────────
 *
 * El editor tenía nueve controles compitiendo antes de tocar un solo bloque:
 * seis arriba —estado, volver, publicación, navbar, marca, guardar— y tres en
 * la franja de páginas. Eso es lo que se sentía saturado, y lo que se deshace
 * aquí tiene que quedarse deshecho.
 *
 * Y una cosa que sí es de comportamiento: **lo que se copia es lo que se ve**.
 * Si el código exportado se puede editar pero se copia el generado, tocarlo es
 * un adorno — y lo que acaba en la web de un cliente no es lo que se aprobó.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const BUILDER = 'src/pages/events/editor/ExperienceBuilder.jsx';
const EXPORT  = 'src/pages/events/editor/ExportIframeModal.jsx';
const AJUSTES = 'src/pages/events/editor/AjustesDelSitio.jsx';

const leer = (p) => readFileSync(p, 'utf8');
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('los ajustes del sitio son UN cajón, no tres', () => {
  const src = sinComentarios(leer(BUILDER));
  for (const viejo of ['marcaOpen', 'navOpen', 'pubOpen']) {
    assert.ok(!src.includes(viejo),
      `volvió \`${viejo}\`: eran tres armazones idénticos para la misma pregunta`);
  }
  assert.match(src, /<AjustesDelSitio/, 'desapareció el cajón único');
});

test('el cajón se abre en la pestaña que le piden, no en la última usada', () => {
  /* `useState` sólo lee su valor inicial la primera vez. Sin reconciliar, el
     aviso de «tu página vive en otro dominio» abriría el cajón donde se quedó
     y no llevaría a Publicación. */
  const src = sinComentarios(leer(AJUSTES));
  assert.match(src, /if \(abierta && abierta !== pedida\)/,
    'el cajón no reconcilia la pestaña pedida con la que está abierta');
});

test('hay DOS modos de trabajo, y colocar vive dentro de Visual', () => {
  const src = sinComentarios(leer(BUILDER));
  assert.match(src, /\['visual', 'Visual'\], \['codigo', 'Código'\]/,
    'desapareció el conmutador de dos modos');
  /* Lienzo/Secciones es cómo se COLOCA, y sólo tiene sentido mirando. En modo
     código era un botón que no cambiaba lo que se veía. */
  assert.match(src, /\{!verDatos && \(\s*<button\s*\n?\s*onClick=\{toggleModo\}/,
    'el conmutador de lienzo se enseña también en modo código');
});

test('exportar está a la vista, no escondido en un hover', () => {
  const src = sinComentarios(leer(BUILDER));
  assert.match(src, /setEmbedId\('__pagina__'\)/,
    'no hay botón de exportar en la barra: seguía sólo en el hover de cada bloque');
  assert.match(src, /embedId === '__pagina__'/,
    'el botón de exportar la página no tiene quien lo atienda');
});

test('lo que se copia es lo que se ve', () => {
  const src = sinComentarios(leer(EXPORT));
  assert.match(src, /const codigoFinal = tocado \?\? snippet/,
    'no existe el código final: se estaría copiando el generado');
  assert.match(src, /copiar\(codigoFinal, 'Código'\)/,
    'el botón copia el generado mientras la pantalla enseña otra cosa');
  assert.doesNotMatch(src, /<textarea\s+readOnly\s+value=\{snippet\}/,
    'el código volvió a ser de sólo lectura');
});

test('ninguna opción borra lo escrito a mano por la espalda', () => {
  /* Cambiar una opción regenera el código entero. Conservar lo escrito encima
     de una plantilla nueva sería adivinar qué parte era suya, y adivinar mal
     deja un iframe roto en la web de un cliente. Se descarta — avisando. */
  const src = sinComentarios(leer(EXPORT));
  assert.match(src, /const conOpcion = /, 'desapareció la guarda de las opciones');

  /* Y tiene que estar USADA. Una guarda definida y sin conectar es peor que no
     tenerla: se lee el código y parece que el caso está cubierto. */
  const usos = (src.match(/conOpcion\(set\w+\)/g) || []).length;
  assert.ok(usos >= 6, `sólo ${usos} opciones pasan por la guarda: las demás borran lo escrito sin avisar`);

  /* Ningún control debe llamar al setter crudo. */
  const enJsx = src.slice(src.indexOf('return createPortal'));
  for (const crudo of ['setAlcance(', 'setModo(', 'setTema(', 'setAutoAlto(', 'setHeredarEstilo(']) {
    assert.ok(!enJsx.includes(crudo),
      `un control llama a \`${crudo}\` directamente y se salta la guarda`);
  }
});
