/* Lo que se le dice a alguien que no tiene cuenta cuando algo falla.
 *
 * ── El patrón, encontrado ya cuatro veces ────────────────────────────────
 *
 * Una pantalla pública pide algo, la petición falla, y la pantalla afirma una
 * causa concreta que no sabe:
 *
 *   · el iframe de festech.co decía «No se encontró el evento» con el evento
 *     ahí puesto;
 *   · el portal del expositor decía «El código X no corresponde a un stand»
 *     descartando el error entero;
 *   · la página del equipo remataba un «Network Error» con «el código es el
 *     de tu boleta»;
 *   · y la rueda de negocios —hecha justamente para quien NO tiene cuenta—
 *     le enseñaba «Token requerido.».
 *
 * Las cuatro son la misma: un fallo de transporte contado como si fuera culpa
 * de quien mira. Y las cuatro mandan a esa persona a arreglar algo que no está
 * roto — o a llamar al organizador.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

/* Las pantallas que ve alguien sin sesión, y qué hacen con un fallo. */
const PUBLICAS = [
  'src/pages/public/RuedaPublicaPage.jsx',
  'src/pages/public/EquipoTorneoPage.jsx',
  'src/pages/public/ExpositorPage.jsx',
];

test('ninguna pantalla pública pinta el texto crudo del servidor al cargar', () => {
  /* En una acción —guardar, canjear— el mensaje del servidor sí lo escribió
     alguien para una persona. Al CARGAR no: ahí lo que llega es el estado de
     la máquina. */
  for (const f of PUBLICAS) {
    const src = sinComentarios(leer(f));
    assert.ok(src.includes('mensajePublico('),
      `${f} no traduce el fallo: un corte de red llega como «Network Error»`);
  }
});

test('el traductor separa lo que se reintenta de lo que no', () => {
  /* La pantalla necesita saber si ofrecer un botón, y eso no se deduce leyendo
     una frase. */
  const src = sinComentarios(leer('src/lib/mensajeDeError.js'));
  assert.match(src, /reintentable: true/, 'nada se puede reintentar');
  assert.match(src, /reintentable: false/, 'todo se puede reintentar, incluido lo que no existe');
  assert.match(src, /if \(!status\)/,
    'no se distingue «no hubo respuesta» — que es justo el caso que se contaba mal');
});

test('un 401 no llega nunca a una página pública', () => {
  /* La rueda de negocios enseñaba «Token requerido.» a quien entraba sin
     cuenta, que es exactamente el público de esa página. */
  const src = sinComentarios(leer('src/lib/mensajeDeError.js'));
  assert.match(src, /NO_SE_CUENTAN = \[401, 403\]/,
    'los estados de sesión vuelven a contarse tal cual al visitante');
});

test('la pista de «revisa tu código» sólo cuando el código puede ser el problema', () => {
  /* Con un fallo de comunicación, mandar a revisar el código es mandar a
     buscar donde no está. */
  for (const f of ['src/pages/public/EquipoTorneoPage.jsx', 'src/pages/public/ExpositorPage.jsx']) {
    const src = sinComentarios(leer(f));
    assert.match(src, /reintentable \?/,
      `${f} enseña la misma pista pase lo que pase`);
  }
});

test('el embed sigue distinguiendo los dos fracasos', () => {
  /* De donde salió todo esto. */
  const src = sinComentarios(leer('src/pages/public/EmbedPage.jsx'));
  assert.match(src, /status === 404 \? 'no_existe'/,
    'el iframe vuelve a leer cualquier fallo como evento inexistente');
});
