/* La lista de asistentes se acababa en la 100 y no lo decía.
 *
 * El servidor servía de cien en cien —su valor por defecto— y esta pantalla no
 * mandaba página ni pintaba un paginador. En un evento de 386 boletas se veían
 * las primeras 100 y la lista simplemente terminaba: sin error, sin aviso, sin
 * nada que dijera que había 286 más.
 *
 * Es el peor de los tres finales posibles. Un error se arregla; una lista
 * vacía se nota; una lista que se corta en silencio se cree — y quien buscaba a
 * alguien de la mitad concluía que no estaba inscrito.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.join(process.cwd(), 'src', 'pages', 'events', 'tabs', 'ClientesTab.jsx'), 'utf8').replace(/\r/g, '');

test('se pide una página concreta, de 50', () => {
  assert.match(SRC, /const POR_PAGINA = 50;/);
  const carga = SRC.slice(SRC.indexOf('const reload'), SRC.indexOf('const reload') + 900);
  assert.match(carga, /page: pagina/, 'no se manda la página: siempre se pide la primera');
  assert.match(carga, /limit: POR_PAGINA/);
});

test('el paginador dice cuánta lista queda, no sólo en qué página estás', () => {
  /* El número que importa es «de 386», no «página 3». Antes no había ninguno
     de los dos. */
  assert.match(SRC, /\{primeraDeLaPagina\}–\{ultimaDeLaPagina\} de \{total\}/);
  assert.match(SRC, /paginas > 1/, 'el paginador sale también cuando hay una sola página');
  /* `total` es el de la CONSULTA —con los filtros puestos—, no el del evento:
     filtrando por «Sin pagar» tiene que decir cuántos sin pagar hay. */
  assert.match(SRC, /const total\s*=\s*data\?\.total/);
});

test('cambiar un filtro vuelve a la página 1, y en el mismo manejador', () => {
  /* La trampa clásica: estás en la página 5, filtras por algo que tiene doce
     resultados, y te queda una página vacía con un «no hay resultados» que es
     mentira.
     En el mismo manejador y no en un `useEffect` aparte: así los dos cambios
     entran en el mismo render y la lista se pide una vez, no dos —una de ellas
     con la página vieja. */
  assert.match(SRC, /const filtrar = \(fn\) => \{ fn\(\); setPagina\(1\); \};/);
  for (const setter of ['setQ', 'setTipoFilter', 'setEstadoFilter']) {
    assert.match(SRC, new RegExp(`filtrar\\(\\(\\) => ${setter}\\(`),
      `${setter} cambia el filtro sin volver a la página 1`);
  }
});

test('se puede filtrar por tipo de boleta, con los tipos que manda el servidor', () => {
  /* Los tipos SON las actividades en la mayoría de estos eventos —«Registro»,
     «PijaoTech», «DemoDay»—, así que sin este filtro, para saber quién va a
     una hay que leer 386 filas mirando la columna de la derecha. El servidor
     ya aceptaba `ticket_type_id`; lo que no había era dónde elegirlo. */
  assert.match(SRC, /ticket_type_id: tipoFilter/);
  assert.match(SRC, /const tipos\s*=\s*data\?\.tipos/,
    'la lista de tipos se pide aparte: el desplegable puede ofrecer uno que la consulta no reconoce');
  /* Con un solo tipo, filtrar por él es no filtrar. */
  assert.match(SRC, /tipos\.length > 1 && \(/);
});

test('el PDF sigue siendo de TODA la lista, no de la página que se ve', () => {
  /* Es la trampa que introduce la paginación: el PDF se armaba con lo que la
     pantalla tenía cargado, así que habría salido un PDF de 50 filas titulado
     «Lista de asistentes». No se nota hasta que alguien pasa lista en la
     puerta con él. */
  assert.match(SRC, /const traerTodos = async \(\) =>/);
  assert.match(SRC, /onClick=\{pdfDeTodos\}/, 'el botón sigue exportando sólo la página visible');
  /* La única llamada pasa la lista entera. Se mira la llamada y no cualquier
     aparición del nombre: la firma de la función se llama `clientes` y seguirá
     llamándose así. */
  const llamadas = [...SRC.matchAll(/(?<!function )exportarPDF\((\w+)/g)].map(m => m[1]);
  assert.deepEqual(llamadas, ['todos'],
    'alguna llamada al PDF sigue pasando sólo la página visible');
  /* Y respeta los filtros: si estás mirando «Sin pagar», el PDF es de ésos. */
  const todos = SRC.slice(SRC.indexOf('const traerTodos'), SRC.indexOf('const [armandoPdf'));
  assert.match(todos, /estado: estadoFilter/);
  assert.match(todos, /ticket_type_id: tipoFilter/);
  /* Se para por lo que llegó, no por el total: si alguien se registra mientras
     exportas, un bucle que confía en el total no termina. */
  /* Se compara contra lo que el servidor DICE que cabe en una pagina, no
     contra lo que se pidio: un bucle que pide 500 y compara contra 500 para en
     la primera tanda el dia que el tope baja a 200. Eso paso de verdad en
     «Reparto sin correo». */
  assert.match(todos, /tanda\.length < \(d\.por_pagina \?\? POR_TANDA\)/);
  assert.match(todos, /p >= 20/, 'sin cinturón, una lista enorme deja el navegador pidiendo páginas');
});

/* ── Y las otras dos listas que se cortaban igual ────────────────────── */

const leer = (...t) => fs.readFileSync(path.join(process.cwd(), 'src', ...t), 'utf8');

/* Sin comentarios: la redaccion vieja se cita EN el comentario que explica por
   que se fue, asi que una prueba que la busca en el archivo entero mide su
   propia explicacion. Van tres veces hoy. */
const sinComentarios = (...t) => leer(...t)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(String.fromCharCode(10)).filter(l => !l.trim().startsWith('//')).join(String.fromCharCode(10));

test('los inscritos de un sub-evento se piden por tramos, y la búsqueda la hace el servidor', () => {
  /* Tope de 500 sin decirlo, y la búsqueda filtrando en memoria sobre lo
     cargado. Lo segundo es lo peor de los dos: con la lista partida, buscaría
     sólo dentro de la página que se ve, y contestaría «nadie con ese nombre»
     cuando la persona sí está. */
  const src = leer('pages', 'events', 'tabs', 'agenda', 'InscritosSesion.jsx');
  assert.match(src, /const POR_PAGINA = 50;/);
  assert.match(src, /page: pagina, limit: POR_PAGINA/);
  assert.match(src, /q: busca\.trim\(\)/, 'la búsqueda no viaja al servidor');
  assert.match(src, /const filtrada = lista \|\| \[\];/,
    'sigue filtrando en memoria: eso busca sólo dentro de la página');
  assert.match(src, /tramo\.paginas > 1/, 'no hay paginador');

  /* Y los dos números de la cabecera son del sub-evento, no de la página:
     «50 apuntados» en un taller de ochenta se usa para decidir si queda cupo. */
  assert.match(src, /tramo\.apuntados \?\?/);
  assert.match(src, /tramo\.asistieron \?\?/);
});

test('la auditoría se pide por tramos y se puede filtrar por acción', () => {
  /* Se servían los últimos 100: en un evento con equipo eso es un día, así que
     «quién tocó qué» contestaba sobre hoy y parecía contestar sobre el evento
     entero — que es justo lo que se pregunta cuando algo salió mal la semana
     pasada. */
  const src = leer('pages', 'events', 'tabs', 'EquipoTab.jsx');
  assert.match(src, /const AUDITORIA_POR_PAGINA = 50;/);
  assert.match(src, /page: pagina, limit: AUDITORIA_POR_PAGINA/);
  assert.match(src, /d\.acciones/, 'las acciones no salen del servidor');
  assert.match(src, /ACCION_LABEL\[a2\] \|\| a2/,
    'una acción sin etiqueta desaparece del filtro en vez de salir con su id');

  const api = leer('api', 'auditoria.js');
  assert.match(api, /list: \(eventoId, params = \{\}\)/, 'la llamada no acepta página ni filtro');
});

test('el historial de stands y el registro de correos tampoco se cortan ya', () => {
  /* Un stand con cola escanea cien en una tarde; un evento manda un correo por
     boleta. Las dos listas contestaban sobre lo reciente y parecian contestar
     sobre el evento. */
  const stands = leer('pages', 'events', 'tabs', 'StandsTab.jsx');
  assert.match(stands, /const POR_PAGINA_HISTORIAL = 50;/);
  assert.match(stands, /page: pagHistorial/);
  assert.match(stands, /tramo\.paginas > 1/, 'el historial no tiene paginador');

  const cola = leer('pages', 'events', 'workspace', 'comercial', 'EstadoCola.jsx');
  /* Decia «ultimos N», que era honesto y no servia: N era lo cargado y la
     pregunta que trae a la gente aqui es por una persona concreta. */
  assert.match(cola, /\{envios\.length\} de \{totalEnvios\}/);
  assert.match(cola, /solo: 'fallidos'/, 'no se puede mirar solo lo que no salio');
  /* Y los filtros van en las dependencias del efecto: si no, se escriben y no
     pasa nada — el fallo mas silencioso de todos. */
  assert.match(cola, /\[evento\.id, buscaEnvio, soloFallidos\]/);
});

test('los dos bucles que recorren la lista entera se guian por el servidor', () => {
  /* El bucle de «Reparto sin correo» pedia 500 y comparaba contra 500. El dia
     que el servidor puso su tope en 200, cada tanda volvia con 200,
     `200 < 500` daba verdadero y el bucle PARABA EN LA PRIMERA: repartir 200
     de 386 sin que nada lo dijera. Lo introduje yo al poner el tope. */
  const reparto = leer('pages', 'events', 'workspace', 'asistentes', 'RepartoSinCorreo.jsx');
  assert.match(reparto, /const POR_TANDA = 200;/);
  assert.match(reparto, /lote\.length < \(r\.por_pagina \?\? POR_TANDA\)/,
    'el bucle vuelve a fiarse de lo que pidio en vez de lo que le dieron');
  assert.doesNotMatch(reparto, /limit: 500/);
});

test('la lista de eventos no llama «total» a lo que cargo', () => {
  /* Decia «conteos sobre TODO el universo» y eran los primeros doscientos. Con
     menos de doscientos da lo mismo —por eso nadie lo noto—; con mas, la
     cabecera contaba mal y la busqueda de esa pantalla, que es sobre lo
     cargado, no encontraba lo que quedo fuera. */
  const src = leer('pages', 'events', 'EventsListPage.jsx');
  assert.match(src, /total\s*:\s*totalEventos \|\| eventos\.length/);
  assert.match(src, /data\.total \?\?/, 'no lee el total que manda el servidor');
  assert.match(src, /eventos\.length < conteos\.total &&/,
    'no avisa cuando hay mas de los que se cargaron');
  assert.doesNotMatch(sinComentarios('pages', 'events', 'EventsListPage.jsx'), /sobre TODO el universo/);
});
