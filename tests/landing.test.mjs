/* La landing: los bloques vacíos y el dato que llega y nadie enseña.
 *
 * ── Qué se protege aquí ──────────────────────────────────────────────────
 *
 * Doce bloques devolvían `null` cuando no tenían nada, y lo devolvían también
 * para el editor. El efecto: se añade «Speakers», el bloque se pinta con alto
 * cero y queda una franja invisible que no se puede pulsar. El bloque está ahí,
 * guardado en la página, y no hay forma de seleccionarlo para llenarlo — la
 * única salida era borrarlo y empezar de nuevo.
 *
 * Volver a romperlo cuesta escribir `return null` en el sitio de siempre, y no
 * falla nada: el bloque sencillamente desaparece.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const BLOCKS = 'src/pages/events/editor/blocks.jsx';
/* Sin los retornos de carro. El archivo está en CRLF y el corte por función
   busca `\n}\n`: con `\r` de por medio no casaba nunca, el corte se iba hasta
   el final del archivo y la primera prueba pasaba en verde por encontrar los
   marcadores de OTRO bloque. Una prueba que pasa por el motivo equivocado es
   peor que una que falla. */
const leer = () => readFileSync(BLOCKS, 'utf8').replace(/\r/g, '');
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

/* Los que pueden quedarse sin nada que enseñar. Los que no están aquí es
   porque su contenido lo escribe siempre una persona (título, separador) o
   porque ya se resolvieron antes (portada, descripción, dirección, enlaces,
   galería del evento, boletas, recompensas, expositores, agenda, torneos,
   mapa del evento). */
const PUEDEN_ESTAR_VACIOS = [
  'SpeakersPreview', 'SponsorsPreview', 'GaleriaPreview', 'FAQPreview',
  'RedesPreview', 'VideoPreview', 'CountdownPreview', 'MapaPreview',
  'HeroPreview', 'CTAPreview', 'CitaPreview', 'TextoPreview', 'InfoPreview',
];

const cuerpoDe = (src, nombre) => {
  const i = src.indexOf(`function ${nombre}(`);
  assert.ok(i >= 0, `no existe ${nombre}: ¿se renombró un bloque?`);
  return src.slice(i, src.indexOf('\n}\n', i));
};

test('un bloque vacío se le enseña a quien monta, no a quien visita', () => {
  const src = sinComentarios(leer());
  for (const nombre of PUEDEN_ESTAR_VACIOS) {
    const cuerpo = cuerpoDe(src, nombre);
    assert.match(cuerpo, /if \(!isEditor\) return null;/,
      `${nombre} no distingue el editor: o desaparece para quien lo está montando, o le enseña un hueco a quien visita`);
    assert.match(cuerpo, /<VacioEditor /,
      `${nombre} no dice qué le falta: quien monta la página ve una franja invisible que no puede pulsar`);
  }
});

test('ninguno se esconde también del editor', () => {
  /* El fallo exacto que había: `return null` a secas, sin mirar `isEditor`. */
  const src = sinComentarios(leer());
  for (const nombre of PUEDEN_ESTAR_VACIOS) {
    const cuerpo = cuerpoDe(src, nombre);
    /* `if (!isEditor) return null;` es justamente lo correcto, así que se
       excluye: sin eso la prueba se acusaría a sí misma. */
    const suelto = cuerpo.split('\n')
      .filter(l => /^\s*if \([^)]*\) return null;/.test(l))
      .filter(l => !l.includes('!isEditor'));
    assert.equal(suelto.length, 0,
      `${nombre} vuelve a esconderse sin mirar si es el editor: ${suelto[0]?.trim()}`);
  }
});

test('el hueco es uno solo, no doce', () => {
  /* Doce huecos escritos por separado acaban con doce bordes, doce radios y
     doce maneras de decir lo mismo. */
  assert.match(sinComentarios(leer()), /function VacioEditor\(/,
    'desapareció el hueco compartido');
});

test('la agenda dice hasta cuándo, dónde y si todavía cabes', () => {
  /* `fin`, `track` y el cupo llegaban del servidor y no se enseñaban. Saber que
     algo empieza a las 10 sin saber cuándo acaba no deja planear el día, y
     «quedan 3» y «me apunto luego» no son la misma decisión. */
  const cuerpo = cuerpoDe(sinComentarios(leer()), 'AgendaPreview');
  assert.match(cuerpo, /hasta\(s\.fin\)/, 'la agenda no dice a qué hora acaba');
  assert.match(cuerpo, /s\.track/, 'la agenda no dice la sala: con varias en paralelo no se sabe qué choca');
  assert.match(cuerpo, /s\.lleno/, 'la agenda no dice si ya está completo');
});

test('el directorio dice la zona, no sólo el número de stand', () => {
  /* El servidor resuelve `zona_nombre` a propósito —para que aquí se lea «Zona
     Gamer» y no un identificador— y la tarjeta no lo leía. «C10» sin zona es el
     número de la casa sin la calle. */
  assert.match(cuerpoDe(sinComentarios(leer()), 'ExpositoresPreview'), /x\.zona_nombre/,
    'la tarjeta del expositor sigue sin decir en qué zona está');
});

test('una fecha límite que no se ve no es una fecha límite', () => {
  /* `early_bird_hasta` y `venta_hasta` se usaban para tachar el precio y apagar
     el botón, y no se enseñaban: la tarjeta ponía «Early» sin decir hasta
     cuándo, y quien volvía al día siguiente se encontraba otro precio. */
  const cuerpo = cuerpoDe(sinComentarios(leer()), 'TicketsPreview');
  assert.match(cuerpo, /Este precio hasta el/, 'no se dice hasta cuándo dura el precio de lanzamiento');
  assert.match(cuerpo, /La venta cierra el/, 'no se dice cuándo cierra la venta');
});
