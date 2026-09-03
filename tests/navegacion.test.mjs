/* Que volver siga siendo una sola cosa.
 *
 * ── Por qué esto se comprueba ────────────────────────────────────────────
 *
 * Había dieciséis vueltas atrás escritas a mano, cada una con su texto y su
 * aspecto. No aparecieron de golpe: aparecieron de una en una, cada vez que
 * alguien —yo incluido— añadió una pantalla y escribió la vuelta a mano porque
 * era más rápido que buscar cómo lo hacían las demás.
 *
 * Por eso esto es una prueba y no una nota en un documento: lo que no se
 * comprueba, vuelve.
 *
 * Correr: node --test tests/navegacion.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(RAIZ, 'src');

function jsx(dir = SRC, salida = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) jsx(p, salida);
    else if (n.endsWith('.jsx')) salida.push(p);
  }
  return salida;
}

/* Quita los comentarios, y no por elegancia: la primera versión de esta prueba
   se delataba a sí misma. El comentario que explica por qué NO se usa
   `history.back()` contiene esas palabras, y el que cuenta que había seis
   vueltas escritas a mano contiene la flecha. Un texto que explica lo que no se
   hace no puede contar como haberlo hecho.

   Se quitan siguiendo el estado y no línea a línea: dentro de un bloque de
   varias líneas, las intermedias sólo empiezan por asterisco si a alguien le
   apeteció alinearlas. */
function sinComentarios(src) {
  const ABRE = '/' + '*';
  const CIERRA = '*' + '/';
  let fuera = '';
  let enBloque = false;
  for (const linea of src.split('\n')) {
    let l = linea;
    if (enBloque) {
      const fin = l.indexOf(CIERRA);
      if (fin === -1) { fuera += '\n'; continue; }
      l = l.slice(fin + 2);
      enBloque = false;
    }
    const ini = l.indexOf(ABRE);
    if (ini !== -1) {
      const fin = l.indexOf(CIERRA, ini + 2);
      if (fin === -1) { enBloque = true; l = l.slice(0, ini); }
      else l = l.slice(0, ini) + l.slice(fin + 2);
    }
    fuera += l.replace(/\/\/.*$/, '') + '\n';
  }
  return fuera;
}

const ARCHIVOS = jsx().map(p => [relative(RAIZ, p).replace(/\\/g, '/'), readFileSync(p, 'utf8')]);

test('la flecha de volver no se teclea dentro del texto', () => {
  /* Una flecha en la cadena no es un icono: es un carácter que hereda el
     interlineado de la fuente, se descuadra respecto a la palabra y cambia de
     grosor según el sistema. Es lo que se veía mal.

     Se busca la flecha seguida de una letra o de una llave, y no la flecha
     suelta: sola, como el paso anterior de un paginador o el indicador de una
     condición, es un símbolo y está bien. */
  const malos = [];
  for (const [ruta, src] of ARCHIVOS) {
    if (ruta.endsWith('components/ui/Volver.jsx')) continue;
    for (const linea of sinComentarios(src).split('\n')) {
      if (/←\s*[A-Za-zÁÉÍÓÚÑáéíóúñ{]/.test(linea)) malos.push(`${ruta}: ${linea.trim().slice(0, 90)}`);
    }
  }
  assert.deepEqual(malos, [], `Usa <Volver> en vez de escribir la flecha:\n${malos.join('\n')}`);
});

test('el componente dice a dónde va, no que retrocede', () => {
  /* Retroceder en el historial devuelve a donde estabas, que no siempre es
     donde quieres ir: quien llega a la página de un torneo desde una búsqueda
     no tiene atrás, y quien entra a editar un stand desde tres sitios acabaría
     en tres sitios. Cada uso declara su destino. */
  const src = sinComentarios(readFileSync(join(SRC, 'components/ui/Volver.jsx'), 'utf8'));
  assert.ok(!/history\.back|navigate\(-1\)/.test(src),
    'Volver ya no declara destino: retrocede en el historial');
  assert.match(src, /<Link to=\{a\}/, 'Volver ya no navega por ruta');
});

test('la pantalla de «evento no encontrado» es una sola', () => {
  /* Estaba copiada en las seis páginas públicas que cuelgan de un evento. Si
     vuelve a copiarse, los textos se separan: una dirá una cosa y otra otra
     para el mismo caso. */
  const copias = ARCHIVOS.filter(([ruta, src]) =>
    ruta.startsWith('src/pages/public/')
    && !ruta.endsWith('EventoNoEncontrado.jsx')
    && /Evento no encontrado\.<\/p>/.test(src));
  assert.deepEqual(copias.map(([r]) => r), [],
    'Usa <EventoNoEncontrado /> en vez de repetir la pantalla');
});

test('la salida del panel dice a dónde va, y es una sola', () => {
  /* En la cabecera del panel había un cuadrado con una flecha cuyo destino
     vivía sólo en el `title` —que en un móvil no existe—, con el nombre del
     evento al lado en gris muerto: uno llevaba a algún sitio sin decir a cuál,
     el otro decía dónde estabas sin llevar a ninguna parte.

     Y era la tercera salida al mismo sitio, contando la del menú lateral y el
     selector de eventos. */
  const src = readFileSync(join(SRC, 'pages/events/workspace/EventWorkspace.jsx'), 'utf8');
  assert.ok(!/title="Volver a Eventos"/.test(src),
    'volvió el botón de flecha sin texto en la cabecera del panel');
  assert.match(sinComentarios(src), /Mis eventos/,
    'la salida del panel ya no dice a dónde lleva');
});
