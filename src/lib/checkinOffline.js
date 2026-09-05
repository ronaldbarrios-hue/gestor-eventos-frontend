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
 */

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
export function encolar(eventoId, payload) {
  const cola = leerCola(eventoId);
  cola.push({
    ...payload,
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
