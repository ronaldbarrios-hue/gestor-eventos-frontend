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

test('un bloque vacío no se pinta en la página pública', () => {
  /* «Aún no hay premios publicados» es útil para quien está montando la página
     —dice que el bloque está puesto y esperando— y no le dice nada a quien la
     visita: para él es un título, un recuadro y una frase que ocupan pantalla
     para contar que no hay nada. De ahí los huecos grandes entre secciones que
     se veían en el evento real.

     La regla ya existía en los bloques de sistema y se comprueba aquí porque el
     siguiente bloque que alguien añada volverá a olvidarla: el editor le pasa
     `isEditor` y la página pública no, así que el vacío se ve bien mientras se
     escribe y sólo molesta en producción. */
  const src = readFileSync(join(SRC, 'pages/events/editor/blocks.jsx'), 'utf8');
  const vacios = [...src.matchAll(/Aún no hay|El mapa aún no está configurado/g)];
  const guardas = [...src.matchAll(/if \([^)]*!isEditor\) return null|if \(!isEditor\) return null/g)];
  assert.ok(guardas.length >= vacios.length,
    `Hay ${vacios.length} avisos de «vacío» y sólo ${guardas.length} guardas de isEditor: `
    + 'algún bloque enseña su vacío al visitante');
});

test('el correo se previsualiza con el renderizador que lo envía', () => {
  /* El panel tenía una imitación en JSX del correo: su propio maquetado, su
     propia sustitución de variables y su propia copia de `esClaro`. Dos
     renderizadores del mismo correo, y el que el organizador aprobaba no era
     el que salía — aprobaba una maqueta.

     Lo que se prohíbe es SUSTITUIR, no nombrar: los textos por defecto de las
     plantillas contienen las variables y tienen que contenerlas. Lo que no
     puede volver es un `.replace()` que las resuelva aquí. */
  const src = readFileSync(join(SRC, 'pages/events/workspace/comercial/EmailsSection.jsx'), 'utf8');
  assert.match(sinComentarios(src), /emailsApi\.previsualizar/,
    'la previa del correo ya no la hace el servidor');
  assert.ok(!/\.replace\(\/\\{\\{/.test(sinComentarios(src)),
    'el panel volvió a sustituir variables por su cuenta: eso lo hace renderEmail');
});

test('hay UN editor de la página, no dos', () => {
  /* `PageBuilder.jsx` eran 470 líneas —páginas, bloques, plantillas— sin un
     solo consumidor: un segundo editor de lo mismo que hace ExperienceBuilder,
     construido y nunca enchufado. Resucitarlo habría dejado dos editores de la
     misma página; se rescató lo único que tenía y el otro no —ver la página
     como datos— y el resto se borró.

     Si vuelve a aparecer un segundo editor, esto lo dice antes de que alguien
     empiece a arreglar cosas en el que no se usa. */
  const editores = ARCHIVOS.filter(([ruta, src]) =>
    ruta.startsWith('src/pages/events/editor/')
    && /export default function \w*(PageBuilder|Builder)\b/.test(src));
  assert.deepEqual(editores.map(([r]) => r), ['src/pages/events/editor/ExperienceBuilder.jsx']);
});

test('la vista de datos edita el mismo contrato que valida el servidor', () => {
  /* No es una consola de HTML, y no por falta de tiempo: un <script> en la
     landing corre con el origen del evento y lo ve todo el público. El
     contrato en JSON es además lo que permite que un asistente escriba la
     página por MCP y que el servidor pueda decir que no. */
  const src = readFileSync(join(SRC, 'pages/events/editor/VistaDesarrollador.jsx'), 'utf8');
  const codigo = sinComentarios(src);
  assert.match(codigo, /BLOCKS\[/, 'la vista de datos ya no comprueba el tipo contra el catálogo');
  assert.ok(!/dangerouslySetInnerHTML/.test(codigo), 'la vista de datos pinta HTML crudo');
  /* El alcance: la página entera o un bloque suelto. Es lo que se pidió. */
  assert.match(codigo, /Toda la página/, 'ya no se puede mirar la página entera');
});

test('las secciones públicas empiezan todas con el mismo ritmo', () => {
  /* Doce bloques escribían su propio título, con cuatro tamaños distintos y
     tres separaciones distintas debajo. Nadie decidió eso: se fue acumulando,
     un bloque cada vez, copiando el de al lado y ajustando a ojo. Es la mitad
     de lo que hace que una página «se vea mal» sin que se pueda señalar qué
     está mal.

     El siguiente bloque que alguien añada volverá a copiar el de al lado, así
     que esto lo dice antes. */
  const src = sinComentarios(readFileSync(join(SRC, 'pages/events/editor/blocks.jsx'), 'utf8'));
  const sueltos = [...src.matchAll(/\{data\.titulo && <h2[^>]*>/g)];
  assert.deepEqual(sueltos.map(m => m[0].slice(0, 60)), [],
    'Usa <CabeceraSeccion> en vez de escribir el título de la sección a mano');
});

test('el panel y el servidor conocen los mismos bloques', () => {
  /* El catálogo del panel pinta y el del servidor valida. Si se separan, el
     organizador arrastra un bloque que existe en pantalla y el guardado lo
     rechaza —o peor: un bloque que el servidor acepta no se pinta y la página
     pública sale con un hueco. Los dos nuevos, agenda y torneos, tienen que
     estar en los dos sitios. */
  const panel = readFileSync(join(SRC, 'pages/events/editor/blocks.jsx'), 'utf8');
  for (const tipo of ['agenda', 'torneos']) {
    assert.match(panel, new RegExp(`\n  ${tipo}: \{`), `el panel no conoce el bloque «${tipo}»`);
  }
});

test('las secciones del evento se declaran una sola vez', () => {
  /* «Al seleccionar Mapa del evento, y al darle en Rueda de negocios, es como
     si redirigiera a otra página». El enlace era correcto: lo que cambiaba era
     la ropa. La portada tenía su fila de cinco enlaces escritos a mano —y
     pintados de cinco colores, sin que el color significara nada— y las
     sub-páginas tenían otra lista, con otras etiquetas: «Ver Torneo» en una,
     «Torneo» en la otra.

     Dos listas del mismo conjunto siempre acaban diciendo cosas distintas. */
  const chrome = readFileSync(join(SRC, 'components/public/EventChrome.jsx'), 'utf8');
  assert.match(chrome, /export const SECCIONES_PUBLICAS/, 'ya no hay una lista única de secciones');

  const landing = sinComentarios(readFileSync(join(SRC, 'pages/public/EventoPublicoPage.jsx'), 'utf8'));
  assert.match(landing, /seccionesDe\(evento, nav\)/, 'la portada volvió a escribir su propia lista');
  /* Los colores sueltos eran el síntoma visible: si vuelven, es que alguien
     escribió otra vez los enlaces a mano. */
  assert.ok(!/Ver Torneo/.test(landing), 'la portada volvió a tener su propia etiqueta para el torneo');

  const barra = sinComentarios(readFileSync(join(SRC, 'components/public/BarraEvento.jsx'), 'utf8'));
  assert.match(barra, /seccionesDe\(evento/, 'las sub-páginas ya no usan la lista compartida');
  assert.match(barra, /aria-current/, 'la sección actual ya no se marca');
});
