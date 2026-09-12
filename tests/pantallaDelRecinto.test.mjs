/* La landing en una pantalla táctil del recinto.
 *
 * ── Qué cambia respecto a la misma página en un móvil ────────────────────
 *
 * La pantalla no es de nadie. Se usa de pie, en treinta segundos, y detrás hay
 * alguien esperando. Quien se va a mitad de un formulario no cierra nada: se da
 * la vuelta y se marcha.
 *
 * ── Lo que se encontró al mirarlo, y era lo importante ───────────────────
 *
 * El formulario guarda el progreso en `localStorage` para que quien recarga no
 * pierda lo escrito. En un móvil eso es un acierto. En una pantalla compartida
 * es peor que dejar los datos a la vista: SOBREVIVE al reinicio, así que el
 * siguiente abre el formulario con el nombre y el correo del anterior ya
 * puestos, y puede enviarlos sin darse cuenta.
 *
 * Volver al inicio sin resolver eso habría parecido que protegía y no habría
 * protegido nada.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const raiz = process.cwd();
const leer = (...t) => fs.readFileSync(path.join(raiz, 'src', ...t), 'utf8').replace(/\r/g, '');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const { esKiosco, INACTIVIDAD, AVISO } = await import('../src/lib/kiosco.js');

test('el kiosco se enciende con un parámetro, no con una ruta gemela', () => {
  /* Una ruta aparte sería otra copia de la landing que mantener, y la copia es
     la que se queda atrás. Es el patrón que este proyecto ya ha pagado. */
  const pagina = sinComentarios(leer('pages', 'public', 'EventoPublicoPage.jsx'));
  assert.match(pagina, /const kiosco = esKiosco\(params\)/);

  assert.equal(esKiosco(new URLSearchParams('kiosco=1')), true);
  assert.equal(esKiosco(new URLSearchParams('kiosco=si')), true);
  assert.equal(esKiosco(new URLSearchParams('kiosco=0')), false);
  assert.equal(esKiosco(new URLSearchParams('')), false);
  /* Sin parámetros no puede reventar: esto se llama en cada render de la página
     pública, que es lo primero que ve alguien que llega por un enlace. */
  assert.equal(esKiosco(undefined), false);
});

test('en kiosco no se hereda el formulario a medias de otra persona', () => {
  const pagina = sinComentarios(leer('pages', 'public', 'EventoPublicoPage.jsx'));

  /* Ni se lee lo guardado… */
  assert.match(pagina, /useState\(\(\) => \(kiosco \? null : leerProgreso\(slug, tipo\.id\)\)\)/,
    'el formulario vuelve a abrirse con el progreso guardado de quien usó la pantalla antes');
  /* …ni se guarda, y se borra lo que hubiera de antes. */
  assert.match(pagina, /if \(kiosco\) \{ olvidarProgreso\(slug, tipo\.id\); return; \}/,
    'en kiosco se vuelve a guardar el progreso en localStorage');

  /* Y el modal se remonta de cero al volver al inicio: reiniciar sus campos uno
     a uno sería una lista que se queda corta el día que se añade uno. */
  assert.match(pagina, /key=\{`reserva-\$\{vuelta\}`\}/,
    'el formulario no se vuelve a montar al volver al inicio');
});

test('vuelve sola al inicio, y avisa antes', () => {
  assert.equal(INACTIVIDAD, 60);
  assert.equal(AVISO, 15);
  assert.ok(AVISO < INACTIVIDAD, 'el aviso dura más que la espera entera');

  const src = sinComentarios(leer('lib', 'kiosco.js'));
  /* Tocar en cualquier sitio cancela: se escucha en captura para enterarse
     aunque algo dentro pare la propagación, y `passive` para no frenar el
     desplazamiento con el dedo. */
  assert.match(src, /capture: true, passive: true/);
  assert.match(src, /'pointerdown', 'keydown', 'touchstart'/);

  /* `alVolver` vive en una ref: metida en las dependencias del efecto, una
     función nueva en cada render reiniciaría el temporizador en cada latido y
     no volvería NUNCA. */
  assert.match(src, /volver\.current = alVolver/);
  assert.match(src, /\}, \[activo, inactividad, aviso\]\);/,
    'el temporizador depende de algo que cambia en cada render');
});

test('al volver al inicio no queda nada abierto', () => {
  const pagina = sinComentarios(leer('pages', 'public', 'EventoPublicoPage.jsx'));
  const i = pagina.indexOf('const alInicio');
  const cuerpo = pagina.slice(i, pagina.indexOf('}, []);', i));
  for (const cierra of ['setReservaTipo(null)', 'setReservaOk(null)', 'setWaitlistTipo(null)']) {
    assert.ok(cuerpo.includes(cierra), `volver al inicio deja abierto: ${cierra}`);
  }
  assert.match(cuerpo, /window\.scrollTo/, 'vuelve al inicio pero a media página');
});

test('la pantalla del recinto no tiene salidas fuera del evento', () => {
  /* Una pantalla en un pasillo que acaba en Instagram se queda ahí hasta que
     alguien del equipo pasa por delante. */
  const css = sinComentarios(leer('index.css'));
  assert.match(css, /\.pantalla-kiosco \[data-fuera\][\s\S]{0,120}display: none/,
    'las salidas marcadas ya no se esconden');
  assert.match(css, /\.pantalla-kiosco a\[target="_blank"\]/,
    'falta el respaldo para los enlaces que aún no llevan `data-fuera`');

  /* Con CSS y no con un `if (kiosco)` en cada sitio: repartido por el pie, la
     cabecera y las redes es otra lista, y la que se olvida deja la salida
     abierta. */
  const branding = leer('components', 'public', 'Branding.jsx');
  assert.match(branding, /href="\/" data-fuera/, 'el pie de GESTEK dejó de marcarse como salida');
  assert.match(branding, /rel="noreferrer" title=\{it\.label\} data-fuera/,
    'las redes del organizador dejaron de marcarse como salida');
});
