/* A quién se le pregunta cada cosa.
 *
 * ── Lo que pasó ─────────────────────────────────────────────────────────
 *
 * El mismo editor de formulario se monta desde DOS sitios —«Tu página →
 * Formularios» y «Entradas y dinero → Proceso de compra»— y sólo el segundo le
 * pasaba la boleta que se estaba editando. El primero, por tanto, no tenía
 * forma de acotar nada: todo lo que se agregaba ahí caía en TODAS las boletas,
 * en silencio.
 *
 * Un evento real acabó con veinte preguntas de postulación de startup
 * —«Nombre de la Startup», «¿Cuántos fundadores tiene?»— saliendo en el
 * registro general y en las demás boletas. Nadie se enteró hasta que alguien
 * abrió el formulario público y contó siete pasos.
 *
 * No fue un error de quien lo configuró: fue una pantalla sin la pregunta que
 * hacía falta.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (f) => readFileSync(f, 'utf8').replace(/\r/g, '');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const EDITOR = leer('src/pages/events/tabs/FormularioTab.jsx');
const WORKSPACE = leer('src/pages/events/workspace/EventWorkspace.jsx');
const CHECKOUT = leer('src/pages/events/workspace/comercial/CheckoutSection.jsx');
const PUBLICA = leer('src/pages/public/EventoPublicoPage.jsx');

/* ── El selector vive en el editor, no en quien lo llama ─────────────── */

test('el editor pinta su propio selector de boleta cuando nadie se lo pasa', () => {
  /* La regla no puede vivir en quien llama: quien llama se olvida, y eso es
     exactamente lo que pasó. */
  const limpio = sinComentarios(EDITOR);
  assert.match(limpio, /ticketTypeId: ticketTypeControlado/);
  assert.match(limpio, /loControlaElPadre = ticketTypeControlado !== undefined/);
  assert.match(limpio, /!loControlaElPadre && tiposBoleta\.length > 1/);
});

test('los dos sitios que montan el editor acaban con selector', () => {
  /* Uno lo controla desde fuera y el otro deja que el editor se gobierne solo.
     Lo que no puede volver a existir es una tercera forma: montarlo pasando
     `ticketTypeId={null}` fijo, que es «acótalo a nada» y vuelve a dejar la
     pantalla sin pregunta. */
  assert.match(sinComentarios(WORKSPACE), /<FormularioTab evento=\{evento\} \/>/);
  assert.match(sinComentarios(CHECKOUT), /ticketTypeId=\{tipoSel\}/);

  for (const [nombre, texto] of [['EventWorkspace', WORKSPACE], ['CheckoutSection', CHECKOUT]]) {
    assert.equal(/ticketTypeId=\{null\}/.test(sinComentarios(texto)), false,
      `${nombre} monta el editor acotado a nada`);
  }
});

test('con «todas» elegido, la pantalla lo dice en voz alta', () => {
  /* Antes decía «las preguntas que agregues valen para todas las boletas», que
     es cierto y no suena a advertencia. */
  assert.match(EDITOR, /se le pide a TODAS las boletas/);
});

/* ── Y una ficha entera no cae en todas de un clic ───────────────────── */

test('agregar una ficha a TODAS las boletas se pregunta antes', () => {
  /* Con selector y sin este aviso, seguiría siendo un clic el que le pone
     veinte preguntas de startup a quien sólo viene a la charla. */
  const trozo = EDITOR.slice(EDITOR.indexOf('const agregarVarios'));
  const cuerpo = trozo.slice(0, trozo.indexOf('\n  };'));
  assert.match(cuerpo, /confirmDialog/);
  assert.match(cuerpo, /!ticketTypeId && tiposBoleta\.length > 1/);
});

test('en un evento de una sola boleta no se pregunta nada', () => {
  /* «Todas» y «ésta» son lo mismo, y preguntarlo sería ruido. */
  const trozo = EDITOR.slice(EDITOR.indexOf('const agregarVarios'));
  assert.match(trozo.slice(0, trozo.indexOf('\n  };')), /tiposBoleta\.length > 1/);
});

/* ── Traer mis datos: dos llaves, y una nunca va sola ────────────────── */

const CUERPO_ATAJO = (() => {
  const t = PUBLICA.slice(PUBLICA.indexOf('function TraerMisDatos'));
  return t.slice(0, t.indexOf('\n}\n'));
})();

test('se ofrecen las dos formas, a la vista', () => {
  /* Escondida detrás de un enlace, la segunda no la encuentra quien perdió el
     correo — que es justo quien la necesita. */
  assert.match(CUERPO_ATAJO, /Con el código de mi boleta/);
  assert.match(CUERPO_ATAJO, /Con mi documento/);
});

test('el documento NUNCA viaja sin el correo', () => {
  /* Una cédula no es un secreto —está impresa, se fotocopia— y al otro lado
     están las respuestas del formulario, que en una ficha de caracterización
     incluyen datos sensibles. Con el documento suelto esto sería un buscador
     de personas. */
  assert.match(CUERPO_ATAJO, /documento: doc\.trim\(\), email: correo\.trim\(\)/);
  /* Y el botón no se enciende hasta que hay los dos. */
  assert.match(CUERPO_ATAJO, /Boolean\(doc\.trim\(\) && correo\.includes\('@'\)\)/);
});

test('se explica por qué se piden los dos', () => {
  /* Sin explicación, pedir dos datos donde antes bastaba uno se lee como un
     trámite de más. */
  assert.match(CUERPO_ATAJO, /sólo tu número de cédula/);
});

test('una sola función de búsqueda para las dos llaves', () => {
  /* Escritas aparte, una acabaría enseñando el resultado y la otra no. */
  assert.equal((CUERPO_ATAJO.match(/const buscar = /g) || []).length, 1);
});

test('no se dice cuál de las dos cosas falló', () => {
  /* Distinguir «ese código no existe» de «ese documento no está» es lo que
     haría útil ir probando. */
  assert.match(CUERPO_ATAJO, /No encontramos un registro con eso/);
});

test('un fallo del atajo no bloquea el registro', () => {
  /* Incluye el 429 del limitador: esto es una comodidad, no un paso. */
  assert.match(CUERPO_ATAJO, /catch \{[\s\S]*?encontrado: false/);
});

/* El filtro de `session_id` vive en el backend y su prueba también: una prueba
   del frontend que lee archivos del otro repo pasa en esta máquina y falla en
   integración continua, donde ese repo no está. Ver
   `test/formularioSoloDelEvento.test.js` allí. */
