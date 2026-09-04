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
