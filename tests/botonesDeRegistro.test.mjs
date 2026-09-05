/* Los botones de registro que se pegan en otras webs.
 *
 * ── Lo que reportó quien lo usa ──────────────────────────────────────────
 *
 *   «Lo utilicé y está chévere, solo que no sé cómo funciona con varias
 *    boletas. Solo veo un lugar donde se maneja.»
 *   «Está bueno, pero los botones que se crean no los vuelvo a ver.»
 *
 * Dos fallos distintos:
 *
 *   · Un botón sólo podía llevar a la LISTA de boletas. Con cuatro tipos, no se
 *     podía poner «Comprar VIP» en la página de patrocinadores y «Stand
 *     comercial» en la de expositores: los dos abrían lo mismo.
 *   · El código se generaba, se copiaba y se olvidaba. Para volver a copiarlo,
 *     cambiarle el color o saber cuál funcionó, había que reconstruirlo de
 *     memoria.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const WIDGET = 'public/widget.js';
const EMBED_PAGE = 'src/pages/public/EmbedPage.jsx';
const PANEL = 'src/pages/events/workspace/PublicacionSection.jsx';
const BACK = '../../../../gestor-eventos-backend';
const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

const { widgetSnippet, widgetSnippetEnSitio } = await import('../src/lib/embed.js');
const { codigoDeOrigen, nuevoBoton, cruzarConUso } = await import('../src/lib/botonesDeRegistro.js');

test('un botón puede llevar directo a UNA boleta', () => {
  const cod = widgetSnippet({ origin: 'https://app', slug: 'expo', boleta: 'vip-1', origen: 'home' });
  assert.match(cod, /data-boleta="vip-1"/);
  assert.match(cod, /data-origen="home"/);
});

test('sin boleta, el código no lleva atributos vacíos', () => {
  /* Un `data-boleta=""` en la web de alguien es ruido que invita a rellenarlo
     a mano, y a mano se escribe cualquier cosa. */
  const cod = widgetSnippet({ origin: 'https://app', slug: 'expo' });
  assert.doesNotMatch(cod, /data-boleta/);
  assert.doesNotMatch(cod, /data-origen/);
});

test('las dos formas de pegarlo aceptan lo mismo', () => {
  /* El script solo y el botón colocado a mano: si una acepta la boleta y la
     otra no, el organizador descubre la diferencia en su web. */
  const cod = widgetSnippetEnSitio({ origin: 'https://app', slug: 'expo', boleta: 'vip-1', origen: 'correo' });
  assert.match(cod, /data-boleta="vip-1"/);
  assert.match(cod, /data-origen="correo"/);
});

test('el widget lleva la boleta y el origen hasta el formulario', () => {
  const src = leer(WIDGET);
  assert.match(src, /boleta\s*:\s*dato\(el, 'boleta', ''\)/, 'el widget dejó de leer la boleta');
  assert.match(src, /if \(cfg\.boleta\) extra \+= '&boleta='/, 'la boleta no llega a la URL del formulario');
  assert.match(src, /if \(cfg\.origen\) extra \+= '&origen='/, 'el origen no llega, y sin él no se sabe qué botón trajo a quién');
});

test('una boleta que ya no existe cae a la lista, no rompe', () => {
  /* Un botón viejo en la web de un cliente no puede convertirse en una puerta
     cerrada: si la boleta se desactivó, se enseña la lista. */
  const src = leer(EMBED_PAGE);
  assert.match(src, /const t = tipos\.find\(x => String\(x\.id\) === boletaParam\)/);
  assert.match(src, /if \(t\) setReservaTipo\(t\);/,
    'sin el `if`, una boleta borrada dejaría el formulario en un estado imposible');
});

test('el código del botón no choca con otro', () => {
  /* Dos botones con el mismo origen contarían como uno solo en el informe. */
  const a = { origen: codigoDeOrigen('Home de la web') };
  assert.equal(a.origen, 'home-de-la-web');
  assert.equal(codigoDeOrigen('Home de la web', [a]), 'home-de-la-web-2');
  assert.equal(codigoDeOrigen('Botón · Correo a socios'), 'boton-correo-a-socios');
});

test('el origen se limpia igual que en el servidor', () => {
  /* Si las dos limpiezas se separan, el botón manda un origen y el informe
     cuenta otro: el botón parecería no traer a nadie. */
  if (!existsSync(BACK)) return;
  const back = leer(`${BACK}/lib/origenDeRegistro.js`);
  for (const paso of [
    /normalize\('NFD'\)\.replace/, /toLowerCase\(\)/,
    /replace\(\/\[\^a-z0-9_-\]\+\/g, '-'\)/,
    /replace\(\/-\{2,\}\/g, '-'\)/,
  ]) {
    assert.match(back, paso, 'la limpieza del servidor cambió');
    assert.match(leer('src/lib/botonesDeRegistro.js'), paso, 'la del navegador se quedó atrás');
  }
});

test('un botón guardado nace con todo lo que hace falta para volver a pegarlo', () => {
  const b = nuevoBoton({ nombre: 'Correo a socios', boleta: 'vip-1', texto: 'Reservar' });
  assert.equal(b.nombre, 'Correo a socios');
  assert.equal(b.origen, 'correo-a-socios');
  assert.equal(b.boleta, 'vip-1');
  assert.ok(b.id && b.creado_at, 'sin id ni fecha no se puede ni listar ni ordenar');
});

test('borrar un botón no borra a quien trajo', () => {
  /* Sus inscripciones existen. Esconderlas haría que la suma de esta pantalla
     no cuadrara con la lista de asistentes. */
  const { conUso, directo, huerfanos } = cruzarConUso(
    [{ id: '1', nombre: 'Home', origen: 'home' }],
    [
      { origen: 'home', total: 10, pagadas: 4 },
      { origen: 'cartel-viejo', total: 3, pagadas: 3 },
      { origen: null, total: 40, pagadas: 20 },
    ],
  );
  assert.equal(conUso[0].uso.total, 10);
  assert.equal(directo.total, 40, '«directo» dejó de contarse: la mayoría entra así');
  assert.deepEqual(huerfanos.map(h => h.origen), ['cartel-viejo'],
    'las inscripciones de un botón borrado desaparecieron de la cuenta');
});

test('un botón sin inscripciones cuenta cero, no se rompe', () => {
  const { conUso } = cruzarConUso([{ id: '1', nombre: 'Nuevo', origen: 'nuevo' }], []);
  assert.equal(conUso[0].uso.total, 0);
});

test('la pantalla dice qué NO pasa al quitar un botón', () => {
  /* Sin decirlo, quitar de la lista parece que borra su historia — y entonces
     nadie limpia la lista y acaba llena de botones muertos. */
  assert.match(leer(PANEL), /sigue funcionando, y las \$\{b\.uso\?\.total \|\| 0\} inscripciones que trajo se quedan/,
    'quitar un botón dejó de explicar qué se conserva');
});
