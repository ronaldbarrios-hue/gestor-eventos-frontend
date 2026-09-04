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
import { join, sep, dirname, relative } from 'node:path';
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

test('no quedan flechas de «atrás» sueltas en el panel', () => {
  /* Se pidió quitarlas todas, y la primera pasada se quedó a medias: cambié el
     TEXTO de «Salir del evento» a «Mis eventos» y dejé el icono de flecha
     delante, y dejé la flecha de la barra de arriba, que además hacía
     `navigate(-1)` con su destino escondido en el `aria-label`.

     Una flecha delante de un destino con nombre no añade nada: sugiere
     «atrás», que es justo lo que esos botones no hacen. */
  for (const ruta of ['components/layout/TopBar.jsx', 'pages/events/workspace/EventWorkspace.jsx']) {
    const src = sinComentarios(readFileSync(join(SRC, ruta), 'utf8'));
    assert.ok(!/BackIcon/.test(src), `volvió la flecha de atrás en ${ruta}`);
  }
});

test('compartir abre el menú del sistema, no un campo para teclear un número', () => {
  /* «Al darle compartir, que aparezcan opciones como WhatsApp, Instagram, etc.,
     como usualmente sale.» La primera versión pedía escribir un teléfono y
     abría wa.me: eso contesta otra pregunta. `navigator.share` es ese menú, y
     existe en todos los móviles y en Windows; wa.me se queda sólo como salida
     para los escritorios donde no existe. */
  const src = sinComentarios(readFileSync(join(SRC, 'components/public/EnviarEntrada.jsx'), 'utf8'));
  assert.match(src, /navigator\.share/, 'compartir ya no usa el menú del sistema');
  assert.match(src, /hayMenuSistema \?/, 'wa.me dejó de ser sólo el respaldo');
});

test('la ficha de una zona ocupa el ancho, y va debajo de su zona', () => {
  /* Se pidió más espacio para editar zonas dos veces. La primera pasada sólo
     quitó la tarjeta de relleno cuando no había nada elegido —media medida—: la
     lista seguía trabajando en dos tercios de pantalla y la ficha metía cinco
     bloques en una tira de 380 px. */
  const src = sinComentarios(readFileSync(join(SRC, 'pages/events/workspace/espacio/ZonasSection.jsx'), 'utf8'));
  assert.ok(!/lg:grid-cols-\[minmax\(0,1fr\)_380px\]/.test(src),
    'volvió la columna lateral fija de la ficha de zona');
  assert.match(src, /z\.id === sel && seleccionada/,
    'la ficha ya no se pinta debajo de su propia zona');
});

test('el editor dice si la página se ve, y deja publicarla desde ahí', () => {
  /* Se podía montar la página entera sin enterarse nunca de si estaba viva: el
     estado —borrador o publicado— y el botón de publicar vivían dos pantallas
     más atrás, en la cabecera del panel. El recorrido natural —montar, mirar,
     publicar— obligaba a SALIR del editor justo al final para hacer lo único
     que quedaba por hacer. */
  const editor = sinComentarios(readFileSync(join(SRC, 'pages/events/editor/ExperienceBuilder.jsx'), 'utf8'));
  assert.match(editor, /<EstadoPagina/, 'el editor ya no dice si la página está publicada');

  const estado = sinComentarios(readFileSync(join(SRC, 'pages/events/editor/EstadoPagina.jsx'), 'utf8'));
  assert.match(estado, /avisosDelEvento/,
    'publicar dejó de enseñar lo que falta — y esa lista ya existía');
  /* Recargar al publicar se llevaría por delante los cambios sin guardar del
     editor. Publicar no toca los bloques: no hay nada que volver a pedir. */
  assert.ok(!/location\.reload/.test(estado),
    'publicar recarga la página y se lleva los cambios sin guardar');
});

test('todas las páginas del evento tienen la misma anchura de columna', () => {
  /* Cada una eligió el suyo: 4xl en agenda y torneo, 3xl en ranking, lg en la
     rueda sin sesión. Al saltar de una a otra el texto cambiaba de anchura —y
     el nombre del evento y las secciones con él—, que el ojo lee como «esto es
     otro sitio» aunque el menú diga lo contrario.

     4xl porque es el ancho de los bloques de la portada: así la columna no se
     mueve tampoco al entrar desde la landing. */
  const paginas = ARCHIVOS.filter(([ruta]) =>
    /src\/pages\/public\/(Agenda|Mapa|Networking|Ranking|Torneo|TorneosResumen)/.test(ruta));
  assert.ok(paginas.length >= 6, 'faltan páginas del evento que comprobar');

  const malas = [];
  for (const [ruta, src] of paginas) {
    for (const m of sinComentarios(src).matchAll(/py-10 max-w-(\w+) mx-auto/g)) {
      if (m[1] !== '4xl') malas.push(`${ruta}: ${m[0]}`);
    }
  }
  assert.deepEqual(malas, [],
    'Alguna página del evento volvió a elegir su propia anchura');
});

test('el bloque de código va aislado, y sin `allow-same-origin`', () => {
  /* Todo el catálogo es un contrato en JSON para que no haya HTML suelto: un
     <script> en la landing correría con el origen del evento y lo ve todo el
     público. Este bloque es la excepción, y sólo lo es por DÓNDE se pinta.

     `sandbox` sin `allow-same-origin` mete el código en un origen opaco: no
     puede leer cookies, ni el token del organizador que lo está editando, ni
     tocar la página de alrededor. Las dos banderas juntas —scripts y
     same-origin— anulan el sandbox y devuelven el problema entero.

     Por eso esto se comprueba: es una línea que alguien puede «arreglar» un día
     para que su widget acceda al padre, y a partir de ahí no protege nada. */
  const src = readFileSync(join(SRC, 'pages/events/editor/blocks.jsx'), 'utf8');
  const sandboxes = [...src.matchAll(/sandbox="([^"]*)"/g)].map(m => m[1]);
  assert.ok(sandboxes.length > 0, 'el bloque de código dejó de pintarse en un iframe con sandbox');
  for (const s of sandboxes) {
    assert.ok(!/allow-same-origin/.test(s),
      `un sandbox de la landing lleva allow-same-origin: «${s}»`);
  }
});

/* ── El retroceso, en TODA la aplicación ──────────────────────────────────
 *
 * La prueba de arriba mira `Volver.jsx` y sólo ese archivo. Por eso sobrevivió
 * un `navigate(-1)` en `PublicLayout` —la página de la boleta, que se abre
 * desde un correo y por tanto no tiene «atrás» dentro del sitio— durante todo
 * el tiempo en que se dio la limpieza por terminada.
 *
 * Guardar el componente nuevo y no mirar el resto es la forma más común de
 * dejar una tarea a medias creyéndola hecha. */

const EXCEPCIONES_ATRAS = {
  'pages/public/legal.jsx':
    'A los términos se llega desde la mitad de un registro, y el sitio al que se quiere volver es exactamente ese. Es el caso que `Volver.jsx` deja abierto en su propio comentario. Usa el componente compartido, con onClick.',
};

test('nadie más retrocede en el historial', () => {
  const malos = [];
  for (const abs of jsx()) {
    /* `sep` de node:path en vez de un literal con barra invertida: en Windows
       las rutas vienen con ella y escribirla aquí es pelearse con el escapado
       de cuatro capas. */
    const rel = abs.slice(SRC.length + 1).split(sep).join('/');
    if (rel === 'components/ui/Volver.jsx') continue;
    const src = sinComentarios(readFileSync(abs, 'utf8'));
    if (!/history[.]back\(\)|navigate\(-1\)/.test(src)) continue;
    if (rel in EXCEPCIONES_ATRAS) continue;
    malos.push(rel);
  }
  assert.deepEqual(malos, [],
    `retroceden en el historial sin justificarlo: ${malos.join(', ')}.\n` +
    'O declara a dónde va con <Volver a="…">, o añádelo a EXCEPCIONES_ATRAS con el motivo.');
});

test('una excepción que ya no retrocede sale de la lista', () => {
  /* Si no, la lista se vuelve un cementerio y deja de decir nada. */
  const sobran = Object.keys(EXCEPCIONES_ATRAS).filter((rel) => {
    const src = sinComentarios(readFileSync(join(SRC, rel), 'utf8'));
    return !/history[.]back\(\)|navigate\(-1\)/.test(src);
  });
  assert.deepEqual(sobran, [], `ya no retroceden, quítalas de EXCEPCIONES_ATRAS: ${sobran.join(', ')}`);
});
