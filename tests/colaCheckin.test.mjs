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
