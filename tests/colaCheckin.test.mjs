/* La cola de escaneos sin conexión: qué se tira y qué se espera.
 *
 * ── Qué se protege aquí ──────────────────────────────────────────────────
 *
 * El escáner guarda los escaneos cuando no hay red y los manda al volver. Al
 * vaciar la cola, **cualquier** respuesta del servidor descartaba el escaneo y
 * el resumen decía «N rechazados» sin más.
 *
 * Eso estaba bien mientras el servidor sólo pudiera contestar «esa boleta ya
 * se usó» o «no existe». Desde que la puerta comprueba quién la atiende
 * (`puedeAtenderPuerta`), puede contestar **403** — y entonces doscientas
 * entradas guardadas durante un corte de red se tirarían por un permiso mal
 * puesto, sin que nadie sepa de quién eran.
 *
 * La regla, y es la que esta prueba fija:
 *
 *   · **Definitivo** (400, 404, 409) — la boleta ya se usó, no existe o es de
 *     otro evento. Reintentar no cambia nada: se descarta.
 *   · **Arreglable** (401, 403, 5xx) — la sesión caducó, quien escanea no está
 *     asignado a la puerta, o el servidor se cayó un momento. Se arregla y la
 *     cola se vacía sola: se queda.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CHECKIN = 'src/pages/events/tabs/CheckinTab.jsx';
const leer = (p) => readFileSync(p, 'utf8');

const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('un rechazo arreglable no descarta el escaneo', () => {
  const src = sinComentarios(leer(CHECKIN));
  assert.match(src, /st === 401 \|\| st === 403 \|\| st >= 500/,
    'no se distingue un rechazo definitivo de uno arreglable: todo se tira igual');

  /* Y el `quitar` sólo puede estar DESPUÉS de esa comprobación. Si estuviera
     antes, la distinción no serviría de nada. */
  const iRegla = src.indexOf('st >= 500');
  const iQuitar = src.indexOf('quitar(evento.id, item.offline_id)');
  assert.ok(iRegla > 0 && iQuitar > iRegla,
    'se descarta el escaneo antes de mirar si el rechazo era arreglable');
});

test('lo que sigue en la cola no se cuenta como sincronizado', () => {
  const src = sinComentarios(leer(CHECKIN));
  assert.match(src, /enEspera/,
    'no se lleva la cuenta de lo que quedó sin registrar');
  assert.match(src, /Falta parte de la cola/,
    'el resumen dice «Sincronizado» aunque queden escaneos sin registrar');
});

test('se dice POR QUÉ quedaron pendientes', () => {
  const src = sinComentarios(leer(CHECKIN));
  assert.match(src, /motivos/,
    'sin el motivo, quien está en la puerta no puede arreglarlo — y es lo único accionable');
});

test('sin respuesta del servidor sigue significando «no hay red»', () => {
  /* Esto ya estaba bien y es lo que no se puede romper: un escaneo sin
     respuesta se queda en la cola, porque es justo lo que la cola resuelve. */
  const src = sinComentarios(leer(CHECKIN));
  assert.match(src, /if \(!e\.response\) continue;/,
    'un fallo de red dejó de dejar el escaneo en la cola');
});

test('guardar puede fallar, y en una puerta eso se dice', () => {
  /* `localStorage.setItem` lanza con el almacenamiento lleno, en modo privado
     de algunos navegadores, o si el sitio lo tiene bloqueado. Ese fallo se
     tragaba con un `catch` vacío que decía «no romper el escaneo» — pero el
     escaneo YA estaba roto: la persona había entrado, no quedaba constancia, y
     a quien está en la puerta se le enseñaba «Guardado sin conexión».

     En una pantalla se puede callar un fallo y reintentar luego. En una puerta
     no: quien escanea tiene a alguien delante y necesita saber AHORA si tiene
     que apuntar el código a mano. */
  const cola = leer('src/lib/checkinOffline.js');
  assert.match(cola, /return \{ guardado, cantidad: leerCola\(eventoId\)\.length \}/,
    'encolar volvió a decir sólo cuántos hay: no distingue guardado de perdido');
  assert.match(cola, /cantidad: leerCola\(eventoId\)\.length/,
    'la cantidad sale de la lista en memoria y no de lo que quedó guardado: enseñaría una cola que no existe');

  const tab = leer('src/pages/events/tabs/CheckinTab.jsx');
  assert.match(tab, /noSeGuardo: true/,
    'el escáner ya no avisa cuando no pudo guardar el escaneo');
  assert.match(tab, /codigo: payload\.codigo \|\| \(payload\.qr_token \|\| ''\)\.slice\(-12\)/,
    'no se enseña el código: la tarjeta dice «apúntalo a mano» y no da qué apuntar');
});

test('el reingreso no se encola, y por eso se avisa', () => {
  /* El reingreso es un interruptor —entra, sale, entra— y el orden decide el
     aforo. Si unos escaneos se guardan y otros salen en el momento, al
     reconectar se aplican mezclados y el número de gente dentro deja de ser el
     de la realidad para el resto del evento. Un aforo mal contado es peor que
     un movimiento no registrado.
     Lo que no vale es lo de antes: perderlo Y enseñar «Network Error». */
  const tab = leer('src/pages/events/tabs/CheckinTab.jsx');
  assert.match(tab, /reingresoMode: true, ok: false, error: e\.response\.data\?\.error/,
    'el reingreso volvió a pintar el error del servidor sin mirar si hubo respuesta');
  assert.match(tab, /noSeGuardo: true, sinCola: true/,
    'sin conexión, el reingreso vuelve a perderse sin decirlo');
});

test('la asistencia a un sub-evento también se guarda sin conexión', () => {
  /* Es idempotente y el orden da igual —a diferencia del reingreso, que es un
     interruptor—, así que guardarla y mandarla luego no descuadra nada. Antes
     se perdía: el taller se llenaba y no quedaba constancia de nadie. */
  const tab = leer(CHECKIN);
  assert.match(tab, /encolar\(evento\.id, \{ \.\.\.payload, sesion_id: sid \}, TIPO_SESION\)/,
    'la asistencia a sub-eventos volvió a perderse sin conexión');
  assert.match(tab, /agendaApi\.marcarAsistencia\(evento\.id, sesionId, payload\)/,
    'la cola no sabe mandar la asistencia: se sincronizaría como si fuera un ingreso');
});

test('lo guardado por la versión anterior no se pierde', () => {
  /* Una cola a medio sincronizar no puede perderse porque se despliegue una
     versión nueva a mitad del evento: lo que se guardó antes de que existiera
     `tipo` no lo lleva, y eso significa ingreso. */
  const tab = sinComentarios(leer(CHECKIN));
  assert.match(tab, /\(tipo \|\| TIPO_INGRESO\) === TIPO_SESION/,
    'un elemento sin `tipo` deja de tratarse como ingreso: la cola vieja se rompe');
});

test('un escaneo rechazado se dice con su código', () => {
  /* «3 rechazados» no se puede seguir; un código sí — con él se busca a la
     persona en la lista y se arregla a mano. Y con los sub-eventos en la cola
     esto pasa de incómodo a grave: en la puerta de un taller es normal que
     alguien no esté inscrito, y descartarlo en silencio significa que entró y
     nadie va a saberlo nunca. */
  const tab = leer(CHECKIN);
  assert.match(tab, /rechazados\.push\(\{/, 'los rechazados vuelven a ser sólo un número');
  assert.match(tab, /r\.rechazados\?\.length > 0/, 'el resumen no enseña cuáles fueron');
});

test('«ya fue usada» no se cuenta como un rechazo que perseguir', () => {
  /* Al vaciar la cola, un 409 «esta boleta ya fue usada» significa que esa
     persona ENTRÓ: otra puerta la registró con red mientras ésta estaba sin
     cobertura, o el escaneo salió y la respuesta no llegó. Pasa
     constantemente y sin que nadie haga nada mal.

     Contarlo entre los rechazados manda a quien está en la puerta a buscar en
     la lista a alguien que ya está dentro — y con doscientos escaneos
     guardados, eso es enterrar los rechazos de verdad entre el ruido.

     En un sub-evento el 409 es «está lleno», que sí es alguien que entró y no
     quedó registrado. Por eso la distinción mira el tipo. */
  const src = sinComentarios(leer(CHECKIN));
  assert.match(src, /if \(data\.ya_usada && \(item\.tipo \|\| TIPO_INGRESO\) !== TIPO_SESION\) \{/,
    'un «ya fue usada» de la cola vuelve a contarse como rechazo');
  assert.match(src, /yaEstaban\+\+;/, 'no se lleva la cuenta aparte');
  assert.match(src, /ya estaban dentro/, 'el resumen no dice cuántas ya estaban dentro');

  /* Y sigue descartándose de la cola: reintentarlo no cambia nada. */
  const iQuitar = src.indexOf('quitar(evento.id, item.offline_id)');
  const iYa = src.indexOf('data.ya_usada');
  assert.ok(iQuitar > 0 && iQuitar < iYa,
    'el escaneo ya registrado se queda en la cola y volvería en cada intento');
});

test('la cola se vacía sola aunque nadie pulse nada', () => {
  /* El evento `online` era el ÚNICO disparador automático, y sólo salta si la
     pestaña está viva justo cuando vuelve la red. En una puerta eso falla de
     las dos maneras: el móvil mata la pestaña por memoria y al reabrirla ya
     hay red —el evento saltó sin nadie escuchando—, o el turno cambia y el
     escáner se abre en otro dispositivo, ya con conexión y con escaneos
     guardados dentro. Quedaba un botón esperando a que alguien lo viera; los
     escaneos no se perdían, pero podían pasarse el evento sin registrarse, y
     entonces el aforo del panel es mentira. */
  const src = sinComentarios(leer(CHECKIN));
  assert.match(src, /if \(!online \|\| !hayCola\) return;\s*\n\s*sincronizarRef\.current\(true\);/,
    'ya no se intenta vaciar la cola al abrir con conexión');
  assert.match(src, /setInterval\(\(\) => sincronizarRef\.current\(true\), 30000\)/,
    'no se reintenta: `navigator.onLine` dice que hay red, no que se llegue al servidor');

  /* Por el `ref`: con `sincronizar` en las dependencias el efecto se rearma en
     cada sincronización —la función depende de `sincronizando`— y dispara otra
     en el acto. Eso no es un reintento, es un bucle. */
  assert.match(src, /\}, \[online, hayCola\]\);/,
    'el efecto volvió a depender de `sincronizar`: se rearma en cada vuelta y no para');
});

test('un reintento automático no borra el escaneo que hay delante', () => {
  /* Si pintara el resumen cada treinta segundos, taparía la tarjeta de la
     persona que quien escanea tiene delante para repetirle que la cola sigue
     sin poder vaciarse. Sólo pinta si algo cambió. */
  const src = sinComentarios(leer(CHECKIN));
  assert.match(src, /const algoCambio = ok \|\| fallidas \|\| yaEstaban;/,
    'no se distingue una sincronización que consiguió algo de una que no');
  assert.match(src, /if \(algoCambio \|\| \(!automatica && enEspera\)\)/,
    'un reintento automático que no consiguió nada vuelve a pintar sobre el escaneo');

  /* Y el botón tiene que llamarla SIN el evento del clic: `automatica` es el
     primer argumento, y un MouseEvent es un valor verdadero — pulsar el botón
     se habría contado como reintento automático y no habría contestado nada. */
  assert.match(src, /onClick=\{\(\) => sincronizar\(\)\}/,
    'el botón pasa el evento del clic como `automatica` y se queda mudo');
});
