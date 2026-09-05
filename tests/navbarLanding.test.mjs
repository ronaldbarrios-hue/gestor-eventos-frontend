/* El navbar del evento: que se sienta parte de la página, no posado encima.
 *
 * ── Lo que se veía ───────────────────────────────────────────────────────
 *
 * La barra de la portada tenía fondo propio y un borde inferior duro: se leía
 * como una pieza de GESTEK apoyada sobre la web del organizador. En una
 * plataforma de marca blanca eso es exactamente lo que no puede pasar.
 *
 * Y los mismos cinco enlaces se pintaban en DOS sitios con clases escritas a
 * mano —la barra de la portada y el marco de las sub-páginas—, que ya habían
 * derivado: el marco marcaba la sección actual invirtiendo el color y la barra
 * de la portada no marcaba nada. Moverse entre secciones se veía como cambiar
 * de sitio, que es la queja de origen del marco.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CHROME = 'src/components/public/EventChrome.jsx';
const MARCO = 'src/components/public/BarraEvento.jsx';
const PORTADA = 'src/pages/public/EventoPublicoPage.jsx';
const PREVIEW = 'src/pages/events/tabs/PaginaPublicaTab.jsx';
const BUILDER = 'src/pages/events/editor/ExperienceBuilder.jsx';
const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

/* Del modulo plano y no del `.jsx`: node no importa JSX, y desde ahi estas
   pruebas se saltarian solas diciendo «ok». */
const { claseEnlaceSeccion, estiloEnlaceSeccion } = await import('../src/lib/enlaceSeccion.js');

test('el enlace de sección se pinta en UN sitio', () => {
  /* Si vuelven las clases a mano, los dos sitios vuelven a derivar. */
  for (const [archivo, donde] of [[MARCO, 'el marco de las sub-páginas'], [PORTADA, 'la barra de la portada']]) {
    assert.match(leer(archivo), /claseEnlaceSeccion\(/, `${donde} dejó de usar el enlace compartido`);
  }
});

test('la sección actual se marca, y con el color del evento', () => {
  /* El tinte sale de `--brand-primary`, que la pone el evento. Con el gris del
     sistema, la barra parecía de GESTEK y no del organizador. */
  const activo = estiloEnlaceSeccion(true);
  assert.match(activo.borderColor, /--brand-primary/);
  assert.match(activo.background, /--brand-primary/);
  assert.equal(estiloEnlaceSeccion(false), undefined, 'un enlace normal no debe llevar tinte');

  /* Tinte y no relleno: un fondo sólido con el color de marca obliga a saber
     si el texto va en blanco o en negro, y eso depende de cada marca. */
  assert.doesNotMatch(claseEnlaceSeccion(true), /bg-text-1|text-bg/,
    'el activo volvió a rellenarse con un color fijo: se rompe con marcas claras');
});

test('la barra se funde con la página', () => {
  const src = leer(PORTADA);
  assert.doesNotMatch(src, /bg-bg\/85 backdrop-blur-md border-b border-border\/60/,
    'volvió el fondo propio con borde duro: la barra se ve posada encima');
  assert.match(src, /bg-gradient-to-b from-bg via-bg\/90 to-bg\/0/,
    'el fondo dejó de desvanecerse hacia la página');
  assert.match(src, /borderBottom: '1px solid color-mix\(in srgb, var\(--brand-primary/,
    'la línea de separación dejó de ser del color del evento');
});

test('«Datos» dice a quién le sirve', () => {
  /* Lo que hay dentro de la página también son datos: el nombre no distinguía
     nada. Es el modo en el que trabaja quien programa, y nombrarlo así lo hace
     encontrable para quien lo necesita. */
  const preview = leer(PREVIEW);
  assert.match(preview, /Modo desarrollador/, 'el botón volvió a llamarse «Datos»');
  assert.doesNotMatch(preview, /<span className="hidden sm:inline">Datos<\/span>/,
    'quedó el nombre viejo en el botón');
});

test('la misma pantalla se llama igual desde los dos sitios', () => {
  /* Se entra desde la barra del preview y desde el conmutador del editor. Dos
     nombres para la misma pantalla obligan a probar los botones para descubrir
     que llevan al mismo lado. */
  assert.match(leer(BUILDER), /\['codigo', 'Desarrollador'\]/,
    'el editor volvió a llamarlo de otra forma que la barra del preview');
});
