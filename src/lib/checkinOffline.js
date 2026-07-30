/* Cola offline de check-ins. Cuando no hay internet, los escaneos se guardan
   en localStorage y se sincronizan al reconectar. El check-in offline es
   OPTIMISTA: no valida contra el servidor hasta la sincronización (ahí se
   resuelven boletas ya usadas o inválidas). */

const KEY = (eventoId) => `gestek-offline-checkin:${eventoId}`;

export function leerCola(eventoId) {
  try { return JSON.parse(localStorage.getItem(KEY(eventoId)) || '[]'); } catch { return []; }
}
function guardar(eventoId, cola) {
  try { localStorage.setItem(KEY(eventoId), JSON.stringify(cola)); } catch { /* almacenamiento lleno: no romper el escaneo */ }
}
export function encolar(eventoId, payload) {
  const cola = leerCola(eventoId);
  cola.push({ ...payload, offline_id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, at: new Date().toISOString() });
  guardar(eventoId, cola);
  return cola.length;
}
export function quitar(eventoId, offlineId) {
  guardar(eventoId, leerCola(eventoId).filter(x => x.offline_id !== offlineId));
}
export function cantidadCola(eventoId) {
  return leerCola(eventoId).length;
}
