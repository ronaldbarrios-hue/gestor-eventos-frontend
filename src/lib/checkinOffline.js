/* Cola de escaneos sin conexión.
 *
 * Cuando no hay internet, los escaneos se guardan en `localStorage` y se
 * sincronizan al reconectar. El check-in sin conexión es OPTIMISTA: no se
 * valida contra el servidor hasta la sincronización, y allí se resuelven las
 * boletas ya usadas o inválidas.
 *
 * ── Guardar puede fallar, y hay que decirlo ──────────────────────────────
 *
 * `localStorage.setItem` lanza cuando el almacenamiento está lleno, en modo
 * privado de algunos navegadores, o si el navegador tiene bloqueado el
 * almacenamiento del sitio. Antes eso se tragaba con un `catch` vacío que
 * decía «no romper el escaneo» — pero el escaneo YA estaba roto: la persona
 * había entrado, no quedaba constancia, y a quien está en la puerta se le
 * enseñaba «guardado».
 *
 * En una pantalla se puede callar un fallo y reintentar luego. En una puerta
 * no: quien escanea tiene a alguien delante y necesita saber AHORA si tiene
 * que apuntar el código a mano. Por eso `encolar` dice si guardó.
 *
 * ── Dos clases de escaneo, una sola cola ─────────────────────────────────
 *
 * Aquí caben el ingreso al evento y la entrada a un sub-evento. Van juntos
 * porque quien está en la puerta sólo quiere saber una cosa —«¿me queda algo
 * sin mandar?»— y dos contadores separados harían pensar que uno de los dos
 * ya está resuelto.
 *
 * Cada uno lleva su `tipo`. Lo que se guardó ANTES de que existiera el campo
 * no lo lleva, y eso es exactamente lo que significa `TIPO_INGRESO` por
 * defecto: una cola a medio sincronizar no se puede perder porque se
 * desplegara una versión nueva a mitad del evento.
 *
 * El reingreso NO entra: es un interruptor —entra, sale, entra— y el orden
 * decide el aforo. Ver `CheckinTab`, donde se explica.
 */

export const TIPO_INGRESO = 'ingreso';
export const TIPO_SESION  = 'sesion';

const KEY = (eventoId) => `gestek-offline-checkin:${eventoId}`;

export function leerCola(eventoId) {
  try { return JSON.parse(localStorage.getItem(KEY(eventoId)) || '[]'); } catch { return []; }
}

/* Devuelve `true` sólo si de verdad quedó escrito. */
function guardar(eventoId, cola) {
  try {
    localStorage.setItem(KEY(eventoId), JSON.stringify(cola));
    return true;
  } catch {
    return false;
  }
}

/* `{ guardado, cantidad }`.
 *
 * `cantidad` sale de volver a LEER, no de la lista que teníamos en memoria: si
 * la escritura falló, la que hay guardada es la de antes, y contar la de
 * memoria sería enseñar en pantalla una cola que no existe. */
export function encolar(eventoId, payload, tipo = TIPO_INGRESO) {
  const cola = leerCola(eventoId);
  cola.push({
    ...payload,
    tipo,
    offline_id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  });
  const guardado = guardar(eventoId, cola);
  return { guardado, cantidad: leerCola(eventoId).length };
}

/* Igual: dice si se pudo quitar. Si no, el escaneo se queda en la cola y se
   reintentará — y el servidor contestará 409 porque esa boleta ya se usó. Es
   ruidoso pero no pierde a nadie, que es el orden de prioridades correcto en
   una puerta. */
export function quitar(eventoId, offlineId) {
  return guardar(eventoId, leerCola(eventoId).filter(x => x.offline_id !== offlineId));
}

export function cantidadCola(eventoId) {
  return leerCola(eventoId).length;
}
