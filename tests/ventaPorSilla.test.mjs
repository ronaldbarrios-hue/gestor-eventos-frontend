/* Elegir y comprar un sitio concreto, de punta a punta.
 *
 * ── Lo que se cuida en el lado del navegador ─────────────────────────────
 *
 * El servidor impide la doble venta con un índice único; eso está probado en el
 * backend. Aquí lo que se protege es lo otro: que la silla se SUELTE cuando
 * alguien se va, que el reloj se vea, y que el carrito de una pestaña no pise
 * el de la otra.
 *
 * Sin lo primero, una preventa deja el mapa en rojo sin una sola venta hecha:
 * cada persona que se lo piensa bloquea un sitio diez minutos.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const leer = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const API = leer('src/api/espacios.js');
const ELEGIR = leer('src/components/public/ElegirSitio.jsx');
const PUBLICA = leer('src/pages/public/EventoPublicoPage.jsx');
const PANEL = leer('src/pages/events/tabs/PlanoTab.jsx');

/* ── 1 · Soltar lo que no se usa ─────────────────────────────────────── */

test('cerrar el formulario devuelve la silla', () => {
  /* Es lo que hace que el mapa vuelva a estar disponible. Sin esto, en una
     preventa el plano se ve agotado sin que nadie haya comprado. */
  const s = sinComentarios(ELEGIR);
  assert.match(s, /useEffect\(\(\) => \(\) => \{[\s\S]{0,200}planoApi\.soltar/);
});

test('y cambiar de opinión no acumula sillas bloqueadas', () => {
  /* Sin soltar la anterior, cambiar de silla tres veces deja tres sitios
     retenidos diez minutos cada uno — todos de la misma persona. */
  const s = sinComentarios(ELEGIR);
  assert.match(s, /if \(valor && valor !== u\.id\) await planoApi\.soltar/);
});

test('soltar nunca rompe la pantalla', () => {
  /* Si ya no era suya, ya está soltada. Un error rojo al cerrar una ventana
     por algo que salió bien es peor que no avisar. */
  assert.match(ELEGIR, /planoApi\.soltar\([^)]*\)\.catch\(\(\) => \{\}\)/);
});

/* ── 2 · El reloj ────────────────────────────────────────────────────── */

test('se ve cuánto queda, en minutos y segundos', () => {
  /* Quien rellena un formulario largo sin saber que hay plazo se encuentra con
     «se acabó el tiempo» al final, cuando ya escribió todo. */
  const s = sinComentarios(ELEGIR);
  assert.match(s, /Math\.floor\(seg \/ 60\)/);
  assert.match(s, /padStart\(2, '0'\)/);
  assert.match(s, /Reservado \$\{m\}:\$\{s\}/);
});

test('al llegar a cero no se borra lo escrito', () => {
  /* El servidor rechaza la compra con un mensaje que explica qué pasó y deja
     volver a elegir. Cerrar de golpe el formulario por un temporizador del
     navegador sería peor que el problema. */
  const s = sinComentarios(ELEGIR);
  assert.doesNotMatch(s, /onClose|setForm\(|olvidarProgreso/);
});

/* ── 3 · El carrito ──────────────────────────────────────────────────── */

test('cada pestaña lleva su propio carrito', () => {
  /* Con `localStorage`, abrir el plano en dos pestañas haría que la segunda
     creyera que las sillas de la primera son suyas — y soltara las que la
     primera está a punto de pagar. */
  assert.match(API, /sessionStorage\.getItem/);
  assert.doesNotMatch(sinComentarios(API), /localStorage/);
});

test('y funciona en navegación privada', () => {
  /* Si el almacenamiento está bloqueado, se genera uno de usar y tirar: la
     compra funciona igual dentro de esta carga de página, que es todo lo que
     dura una retención. */
  /* Sin comentarios: el que explica por qué está ahí mide más que la ventana
     que le daba la expresión regular, y la hacía fallar sobre código correcto. */
  assert.match(sinComentarios(API), /catch \{\s*return `c_/);
});

test('la silla NO se guarda en el borrador', () => {
  /* Una retención dura diez minutos. Restaurar «tu silla es la C-14» media
     hora después sería mentirle a alguien sobre algo que ya no tiene. */
  const s = sinComentarios(PUBLICA);
  assert.doesNotMatch(s, /guardarProgreso\([^)]*sitio/);
  assert.match(s, /const \[sitio, setSitio\] = useState\(null\)/);
});

/* ── 4 · Punta a punta ───────────────────────────────────────────────── */

test('la silla y su carrito viajan con la compra', () => {
  /* El servidor comprueba que la retención sea de este carrito y siga viva
     ANTES de emitir. Sin el carrito no puede distinguir a quién es. */
  assert.match(sinComentarios(PUBLICA), /espacio_id: sitio\.id, sesion_espacio: sitio\.sesion/);
});

test('sólo se ofrecen las sillas de la boleta que se está comprando', () => {
  /* Enseñar la platea a quien compra gradería es ofrecerle algo que el
     servidor le va a rechazar al pagar. */
  assert.match(sinComentarios(ELEGIR), /u\.ticket_type_id === ticketTypeId/);
});

test('un evento sin plano no enseña ni un hueco', () => {
  /* La inmensa mayoría se venden por aforo. El selector no puede aparecer
     vacío en el formulario de todos los eventos que existen hoy. */
  assert.match(sinComentarios(ELEGIR), /if \(!mapa\.hay_plano\) return null;/);
});

test('el mapa se recarga después de tomar una silla', () => {
  /* Mientras esta persona decidía, otras han comprado. Enseñar el mapa de hace
     tres minutos hace que la siguiente elección falle sin motivo aparente. */
  const tomar = ELEGIR.slice(ELEGIR.indexOf('const tomar = async'), ELEGIR.indexOf('if (mapa === null)'));
  assert.ok((tomar.match(/cargar\(\);/g) || []).length >= 2,
    'no se recarga el mapa tras tomar, ni tras fallar al tomar');
});

/* ── 5 · El panel ────────────────────────────────────────────────────── */

test('el organizador ve qué está vendido y qué retenido', () => {
  /* Un plano donde no se ve lo vendido no sirve para decidir nada. */
  const s = sinComentarios(PANEL);
  assert.match(s, /r\.estado === 'vendido'/);
  assert.match(s, /r\.expira_at && new Date\(r\.expira_at\)\.getTime\(\) > ahora/);
});

test('una retención caducada no se pinta como ocupada', () => {
  /* Aunque el barrido no haya pasado. Si contara, el organizador creería que
     va mejor de lo que va. */
  const s = sinComentarios(PANEL);
  const bloque = s.slice(s.indexOf('const ocupado = useMemo'), s.indexOf('const precioDe'));
  assert.match(bloque, /getTime\(\) > ahora/);
});

test('avisa cuando unos sitios no se pueden comprar', () => {
  /* Sin localidad, una unidad vendible no la puede comprar nadie: el servidor
     no sabe qué cobrar. El plano se vería lleno y la venta no funcionaría. */
  assert.match(PANEL, /o estos sitios no se podrán comprar/);
});

test('liberar una silla vendida avisa de lo que implica', () => {
  /* La boleta ya emitida se queda sin sitio. No es un botón más. */
  assert.match(PANEL, /está VENDIDA/);
  assert.match(PANEL, /Queda anotado quién lo hizo/);
});

test('el generador dice cuántos sitios va a crear antes de crearlos', () => {
  /* «12 filas de 20» son 240 sitios. Verlo antes evita generar 2.000 por un
     cero de más y tener que borrarlos uno a uno. */
  assert.match(PANEL, /Se crearán \$\{total\}/);
  assert.match(PANEL, /y el máximo de una vez es/);
});

/* ── 6 · El plano dibujado ───────────────────────────────────────────── */

const PLANO = leer('src/components/public/PlanoSVG.jsx');

test('el plano usa UN manejador, no uno por silla', () => {
  /* Dos mil sillas con su propio `onClick` no van en un móvil de gama media:
     cada cambio vuelve a evaluar el árbol entero. Comprobado en Chromium con
     240: cero manejadores por silla, y el clic llega igual. */
  assert.match(PLANO, /onClick=\{alPulsar\}/);
  /* Sin comentarios antes de cortar: el de cabecera dice «dos mil `<rect>`» y
     el corte empezaba ahí, arrastrando el `onClick` del `<svg>`. Es la tercera
     vez esta sesión que una prueba mide un comentario en vez del código. */
  const limpio = PLANO.replace(/\/\*[\s\S]*?\*\//g, '');
  const rect = limpio.slice(limpio.indexOf('<rect'), limpio.indexOf('</rect>'));
  assert.doesNotMatch(rect, /onClick/);
  assert.match(PLANO, /data-id=\{u\.id\}/);
});

test('el zoom mueve el viewBox, no cada silla', () => {
  /* Es una sola propiedad del SVG y el navegador lo resuelve sin repintar dos
     mil nodos. Un `transform` recalculado por silla sería lo contrario.
   *
   * Lo que se comprueba es eso y no «no hay transform»: la silla SÍ lleva un
   * `transform` de giro —los planos de teatro tienen las butacas de cara al
   * escenario— pero es estático, sale de su propia geometría y no se toca al
   * ampliar. La versión anterior de esta prueba prohibía la palabra entera y
   * habría bloqueado el giro sin que eso protegiera nada.
   *
   * Y se cortan los comentarios antes de medir: el de cabecera dice
   * «dos mil `<rect>`» y el corte empezaba ahí. Van cuatro veces que una prueba
   * mide un comentario en vez del código. */
  assert.match(PLANO, /viewBox=\{viewBox\}/);
  const limpio = PLANO.replace(/\/\*[\s\S]*?\*\//g, '');
  const rect = limpio.slice(limpio.indexOf('<rect'), limpio.indexOf('</rect>'));
  for (const t of rect.match(/transform=\{[^}]*\}/g) || []) {
    assert.doesNotMatch(t, /v\.|vista|viewBox|caja/,
      `el transform de la silla depende de la vista: ${t}`);
    assert.match(t, /rot/, `transform de la silla que no es el giro: ${t}`);
  }
});

test('el encuadre sale del contenido', () => {
  /* Veinte mesas y dos mil sillas tienen que caber igual. Comprobado en
     Chromium: con 240 sillas el viewBox las encuadra todas. */
  assert.match(PLANO, /const caja = useMemo/);
  assert.match(PLANO, /Math\.min\(\.\.\.xs\)/);
});

test('sin coordenadas no se dibuja nada, y no pasa nada', () => {
  /* El plano es una forma de elegir, no la única: quien llama enseña la lista,
     que funciona igual. */
  assert.match(PLANO, /if \(!caja\) return null;/);
  assert.match(sinComentarios(ELEGIR), /hayGeometria && enSeccion\.length > 6/);
});

test('se puede volver al encuadre', () => {
  /* Sin esto, tres arrastres y el plano se pierde de vista sin forma de
     recuperarlo. */
  assert.match(PLANO, /Centrar/);
});

test('el plano no habla con el servidor', () => {
  /* Retener, soltar y el reloj viven en `ElegirSitio`. Así el plano se puede
     cambiar por una lista, o al revés, sin tocar la lógica de la compra. */
  assert.doesNotMatch(PLANO, /planoApi|fetch\(|axios/);
});

/* ── 7 · Los tres caminos de compra ──────────────────────────────────── */

test('la silla viaja también en el camino de pago', () => {
  /* Sin esto, un concierto emitiría la boleta y dejaría la silla retenida
     hasta caducar — y se vendería a otra persona con la primera ya pagada. */
  const s = sinComentarios(PUBLICA);
  assert.equal((s.match(/espacio_id: sitio\.id, sesion_espacio: sitio\.sesion/g) || []).length, 2,
    'la silla viaja en uno solo de los dos caminos');
});

test('el organizador ve el plano sin publicar el evento', () => {
  /* Salió montando un concierto: se arman 124 sitios y la única forma de ver
     lo que verá el público era hacer el evento público. Y no hacía falta
     ningún endpoint nuevo — el panel ya tiene los espacios y las reservas. */
  const s = sinComentarios(PANEL);
  assert.match(s, /<PlanoSVG/);
  assert.match(s, /Ver como lo verá quien compra/);
});

test('la vista previa usa el MISMO mapa que se sirve al público', () => {
  /* Una copia «de previsualización» acabaría enseñando algo que no es lo que
     se vende, y nadie lo notaría hasta que un comprador viera otra cosa. */
  assert.match(PANEL, /from '\.\.\/\.\.\/\.\.\/components\/public\/PlanoSVG\.jsx'/);
});

test('en la vista previa no se puede elegir nada', () => {
  /* El organizador está mirando, no comprando. Un clic que retuviera una silla
     desde el panel dejaría sitios bloqueados sin que nadie los esté pagando. */
  assert.match(sinComentarios(PANEL), /valor=\{null\} onElegir=\{\(\) => \{\}\}/);
});

test('y avisa si hay sitios que no se pueden comprar', () => {
  /* Se ven igual en el plano. Sin decirlo, la vista previa da una falsa
     sensación de que todo está listo. */
  assert.match(PANEL, /Los sitios sin tipo de boleta se ven igual y no se pueden comprar/);
});
