/* Cerrar una ventana no puede tirar lo que alguien acaba de escribir.
 *
 * ── Dicho por quien lo usa ───────────────────────────────────────────────
 *
 * «Suele pasar mucho que se abre una nueva ventana y al dar click por fuera se
 * pierde el progreso de todo.»
 *
 * Medido: trece ventanas tienen el fondo cableado directo a `onClose`. Para
 * una que sólo enseña algo está bien — cerrar es gratis. Para una donde se han
 * escrito ocho preguntas, un clic a dos centímetros del borde borra veinte
 * minutos, sin preguntar y sin deshacer.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = new URL('../', import.meta.url);
const leer = (f) => fs.readFileSync(new URL(f, RAIZ), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* Las ventanas donde se escribe algo que se puede perder. */
const CON_TRABAJO_DENTRO = [
  'src/pages/events/tabs/PreguntasSubEvento.jsx',
  'src/pages/public/InscripcionSesionModal.jsx',
  'src/pages/events/tabs/CategoriasTorneo.jsx',
  'src/pages/events/tabs/ClientesTab.jsx',
];

test('el fondo de esas ventanas no cierra a secas', () => {
  for (const f of CON_TRABAJO_DENTRO) {
    const s = sinComentarios(leer(f));
    assert.match(s, /alPulsarElFondo\(cerrar\)/, `${f}: el fondo cierra sin preguntar`);
    assert.doesNotMatch(s, /bg-black\/\d+[^\n]*onClick=\{onClose\}/,
      `${f}: quedó un fondo cableado a onClose`);
  }
});

test('y sólo pregunta cuando de verdad hay algo que perder', () => {
  /* Un aviso que sale aunque no haya nada que perder se aprende a despachar
     sin leerlo — y entonces no protege el día que sí hay. */
  for (const f of CON_TRABAJO_DENTRO) {
    const s = sinComentarios(leer(f));
    assert.ok(/hayCambios/.test(s) || /useCierreSeguro\(Boolean\(/.test(s),
      `${f}: cierra preguntando siempre, o sin preguntar nunca`);
  }
});

test('lo prellenado no cuenta como trabajo de quien mira', () => {
  /* En la inscripción a un sub-evento, las respuestas llegan prellenadas con lo
     que la persona ya puso al registrarse. Si eso contara, el aviso saldría al
     cerrar sin haber tecleado nada. */
  const s = sinComentarios(leer('src/pages/public/InscripcionSesionModal.jsx'));
  assert.match(s, /partida\.current = JSON\.stringify\(nuevas\);/);
  assert.match(s, /JSON\.stringify\(respuestas\) !== partida\.current/);
});

test('Escape pasa por el mismo camino que el clic fuera', () => {
  /* Iba suelto en cada ventana —o no iba—, y una tecla que borra el trabajo
     sin avisar es peor que un clic fuera: nadie la pulsa a propósito. */
  const h = leer('src/components/ui/cierreSeguro.js');
  assert.match(h, /e\.key === 'Escape'/);
  assert.match(h, /cerrar\(\)/);
  for (const f of CON_TRABAJO_DENTRO) {
    const s = sinComentarios(leer(f));
    assert.doesNotMatch(s, /'Escape'[\s\S]{0,60}onClose\?\.\(\)/,
      `${f}: Escape cierra por su cuenta, saltándose el aviso`);
  }
});

test('guardar cierra sin preguntar', () => {
  /* Si al guardar tambien preguntara, el aviso saldría en el camino normal —
     que es la forma más rápida de que deje de leerse. */
  const s = sinComentarios(leer('src/pages/events/tabs/PreguntasSubEvento.jsx'));
  const guardar = s.slice(s.indexOf('const guardar = async'), s.indexOf('return createPortal'));
  assert.match(guardar, /onClose\(\);/);
  assert.doesNotMatch(guardar, /cerrar\(\)/);
});

test('dos clics fuera seguidos no apilan dos preguntas', () => {
  const h = leer('src/components/ui/cierreSeguro.js');
  assert.match(h, /if \(preguntando\.current\) return;/);
});

test('el clic que sube desde dentro no cierra', () => {
  /* Sin esto, pulsar un campo cierra la ventana. Va en el ayudante y no
     repetido en cada tarjeta, que es donde se olvida. */
  assert.match(leer('src/components/ui/cierreSeguro.js'),
    /e\.target === e\.currentTarget/);
});

test('sin decirle nada, se comporta como antes', () => {
  /* Adoptarlo en una ventana que sólo enseña algo no puede empeorarla. */
  const h = leer('src/components/ui/cierreSeguro.js');
  assert.match(h, /if \(!sucio\.current\) \{ onClose\?\.\(\); return; \}/);
});

/* ── El censo, para que la próxima no nazca torcida ──────────────────── */

test('queda escrito cuántas ventanas siguen cerrando a secas', () => {
  /* No se arreglan las trece de golpe: la mayoría sólo enseña algo, y tocarlas
     todas sería cambiar mucho para arreglar poco. Pero el número se mide, para
     que quien añada una ventana con un formulario dentro vea que existe el
     ayudante. */
  const archivos = [];
  const andar = (dir) => {
    for (const e of fs.readdirSync(new URL(dir, RAIZ), { withFileTypes: true })) {
      const hijo = path.posix.join(dir, e.name);
      if (e.isDirectory()) andar(hijo);
      else if (e.name.endsWith('.jsx')) archivos.push(hijo);
    }
  };
  andar('src');

  const aSecas = archivos.filter(f => /bg-black\/\d+[^\n]*onClick=\{on(Close|Cerrar)\}/.test(leer(f)));
  for (const f of CON_TRABAJO_DENTRO) {
    assert.ok(!aSecas.includes(f), `${f} volvió a cerrar a secas`);
  }
  /* Si este número sube, alguien añadió una ventana con el fondo cableado.
     Que baje está bien; que suba hay que mirarlo. */
  assert.ok(aSecas.length <= 6, `ventanas que cierran a secas: ${aSecas.length}\n  ${aSecas.join('\n  ')}`);
});

/* ── Y cuando lo que se cierra es la pestaña ─────────────────────────── */

test('el navegador pregunta antes de perder un formulario a medias', () => {
  /* Medido: no había un solo `beforeunload` en toda la aplicación. Recargar,
     pulsar «atrás» o cerrar la pestaña se llevaba lo escrito sin decir nada, y
     eso la aplicación no lo puede preguntar por su cuenta — sólo el navegador,
     y sólo si se lo pide. */
  assert.match(leer('src/components/ui/cierreSeguro.js'), /addEventListener\('beforeunload'/);
  for (const f of ['src/pages/events/EventCreatePage.jsx',
                   'src/pages/public/EventoPublicoPage.jsx']) {
    assert.match(sinComentarios(leer(f)), /useAvisoAlSalir\(/, `${f}: no avisa al salir`);
  }
});

test('sólo mientras haya algo que perder', () => {
  /* Registrado siempre, el navegador pregunta al salir de cualquier página y
     se aprende a decir que sí — y entonces no protege el día que sí hay. */
  assert.match(leer('src/components/ui/cierreSeguro.js'),
    /if \(!hayCambios\) return undefined;/);
});

test('en el formulario público, lo prellenado no cuenta como escrito', () => {
  /* `datosIniciales` rellena nombre y correo con los de la cuenta de quien
     entró, y el padrón rellena respuestas por cédula. Comparando contra vacío,
     el aviso saltaría al salir sin haber tecleado nada. */
  const s = sinComentarios(leer('src/pages/public/EventoPublicoPage.jsx'));
  assert.match(s, /JSON\.stringify\(\[form, respuestas\]\) !== partida\.current/);
  /* Y no salta al ir a la pasarela de pago, que es una salida de la buena. */
  /* Con `includes` sobre el texto sin saltos: escribir un salto de linea dentro
     de una expresion regular es exactamente como se rompio esta prueba. */
  assert.ok(s.replace(/\s+/g, ' ').includes('!working && JSON.stringify'));
});

test('el aviso del asistente se lee DESPUÉS de declarar el formulario', () => {
  /* Lo escribí arriba del todo y el build pasó igual —Vite no mira eso—, pero
     `const` no se iza: leer `form` antes de su línea revienta la página entera
     al abrirla. Un fallo que no se ve compilando y se ve siempre al usar. */
  const s = leer('src/pages/events/EventCreatePage.jsx');
  assert.ok(s.indexOf('const [form, setForm]') < s.indexOf('useAvisoAlSalir('),
    'useAvisoAlSalir lee `form` antes de declararlo: la página no abre');
});
