/* Lo que se descarga antes de ver nada.
 *
 * ── Qué pasó ─────────────────────────────────────────────────────────────
 *
 * `DescargarEntrada` importaba `jspdf` arriba del archivo, y la página pública
 * del evento importa ese componente. Resultado: el generador de PDF entraba en
 * el paquete que se baja TODO el que abre la página de un evento — también quien
 * sólo está mirando si va, y también el formulario metido dentro de la web de un
 * cliente— para una función que sólo sirve después de comprar y sólo si alguien
 * pulsa «descargar».
 *
 * Medido: el camino inicial pasó de ~646 kB comprimidos a ~278 kB. Con 7.000
 * asistentes mirando desde el móvil, esa diferencia se paga en datos ajenos.
 *
 * ── Por qué esto es una prueba y no un apunte ────────────────────────────
 *
 * Porque volver a romperlo cuesta una línea —un `import` arriba en vez de
 * dentro— y no falla nada: la página sigue funcionando, sólo pesa el triple.
 * Es exactamente la clase de cosa que nadie nota hasta que alguien se queja de
 * que va lento, y para entonces nadie sabe cuándo empezó.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

/* Las librerías que sólo hacen falta cuando alguien pide un archivo, y los
   archivos por los que puede llegar quien todavía no ha comprado nada. */
const PESADAS = ['jspdf', 'pdfjs-dist', 'html2canvas'];
const CAMINO_PUBLICO = [
  'src/components/public/DescargarEntrada.jsx',
  'src/pages/public/EventoPublicoPage.jsx',
  'src/pages/public/MiTicketPage.jsx',
  'src/pages/public/EmbedPage.jsx',
];

test('nadie del camino público trae el generador de PDF de entrada', () => {
  for (const f of CAMINO_PUBLICO) {
    const src = sinComentarios(readFileSync(f, 'utf8'));
    for (const lib of PESADAS) {
      /* Estático es `import ... from 'jspdf'`. Dentro de un `await import()`
         no cuenta: eso es justamente lo que queremos. */
      const estatico = new RegExp(`^\s*import[^\n]*from\s*['"][^'"]*${lib}`, 'm');
      assert.doesNotMatch(src, estatico,
        `${f} trae \`${lib}\` arriba: vuelve al paquete que baja todo el mundo`);
    }
  }
});

test('el PDF se trae al pulsar, no al abrir', () => {
  const src = sinComentarios(readFileSync('src/components/public/DescargarEntrada.jsx', 'utf8'));
  assert.match(src, /await import\('\.\.\/\.\.\/lib\/boletaPdf\.jsx'\)/,
    'se perdió el import perezoso: el generador vuelve al arranque');
});

test('las librerías de PDF no se agrupan a mano', () => {
  /* Con un nombre de trozo propio, Rollup les metía dentro su ayudante de
     precarga y el trozo se cargaba desde el principio igual: separado en el
     papel y descargado de todas formas. Sin nombre, cada una cae en el trozo
     perezoso de quien la pide. */
  const cfg = readFileSync('vite.config.js', 'utf8');
  assert.match(cfg, /jspdf.*pdfjs-dist.*html2canvas[\s\S]{0,80}return undefined/,
    'las librerías de PDF volvieron a tener trozo propio, y con él vuelven al arranque');
});

test('el build no dejó el PDF en la precarga', { skip: !existeDist() }, () => {
  /* Sólo si hay un build a mano. No se construye aquí: tardaría medio minuto
     en cada corrida por una comprobación que el propio despliegue ya hace. */
  const html = readFileSync('dist/index.html', 'utf8');
  const precargados = [...html.matchAll(/assets\/([a-zA-Z0-9._-]+\.js)/g)].map(m => m[1]);
  for (const nombre of precargados) {
    const js = readFileSync(`dist/assets/${nombre}`, 'utf8');
    assert.ok(!/jsPDF|pdfjs/.test(js.slice(0, 200)),
      `${nombre} se precarga y lleva PDF dentro`);
  }
});

function existeDist() {
  try { return readdirSync('dist').includes('index.html'); } catch { return false; }
}

test('el público no se descarga la librería de arrastrar y soltar', () => {
  /* `blocks.jsx` lo importan CUATRO páginas públicas, y llevaba `@dnd-kit`
     dentro por `PreviewReorder` — que sólo corre en el editor. O sea que el
     formulario de registro metido en la web de un cliente se bajaba 16 kB
     comprimidos de una librería para no arrastrar nada.
     Verificado en el navegador: la página pública ya no pide ni el módulo ni
     la librería. */
  const src = sinComentarios(readFileSync('src/pages/events/editor/blocks.jsx', 'utf8'));
  assert.doesNotMatch(src, /from\s+'@dnd-kit/,
    'volvió `@dnd-kit` a blocks.jsx: con él vuelve al paquete de las páginas públicas');
  assert.match(src, /lazy\(\(\) => import\('\.\/PreviewReorder\.jsx'\)\)/,
    'se perdió la carga perezosa del reordenador');
});

test('reordenar no se rompió por sacarlo de sitio', () => {
  /* Al moverlo casi le quito el asa de arrastre, que existe por un motivo
     escrito: la sección seleccionada es `pointer-events-none`, así que un asa
     que apareciera al pasar por encima no se vería nunca. */
  const src = readFileSync('src/pages/events/editor/PreviewReorder.jsx', 'utf8');
  assert.match(src, /pointer-events-auto/,
    'el asa de arrastre perdió `pointer-events-auto`: no se puede agarrar nada');
  assert.match(src, /const ESTRATEGIAS = \{/,
    'la estrategia volvió a pasarse como objeto: quien llame tendrá que importar dnd-kit otra vez');
});
