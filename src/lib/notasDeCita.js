/* Las notas de una rueda de negocios: no perderlas, encontrarlas y sacarlas.
 *
 * ── Por qué esto no es un detalle ────────────────────────────────────────
 *
 * Una rueda son quince o veinte reuniones de veinte minutos. Lo que se escribe
 * entre una y otra es TODO lo que queda de ese día: al día siguiente nadie
 * recuerda cuál era cuál. Y se escribe de pie, con prisa, en un móvil, entre
 * dos reuniones — que es el peor sitio para perder algo.
 *
 * Guardar al salir del campo era razonable y tiene un agujero: en un móvil,
 * cambiar de aplicación no siempre dispara ese evento. La persona escribe, se
 * va a la siguiente mesa, y la nota no salió nunca. Y no se entera.
 *
 * ── Las tres piezas ──────────────────────────────────────────────────────
 *
 * · Un BORRADOR local por cita. Se escribe en cuanto se teclea, así que un
 *   cierre, una recarga o la pestaña muerta por memoria no se llevan nada.
 * · Se limpia sólo cuando el servidor confirma. Mientras haya borrador
 *   distinto de lo guardado, hay algo pendiente y se puede decir.
 * · `localStorage` puede fallar —modo privado, almacenamiento lleno—: todo va
 *   en try/catch y sin borrador la nota sigue funcionando como antes.
 */

const CLAVE = (citaId) => `gestek-nota-cita:${citaId}`;

export function guardarBorrador(citaId, texto) {
  try {
    if (!texto) localStorage.removeItem(CLAVE(citaId));
    else localStorage.setItem(CLAVE(citaId), texto);
    return true;
  } catch {
    return false;
  }
}

export function leerBorrador(citaId) {
  try {
    return localStorage.getItem(CLAVE(citaId));
  } catch {
    return null;
  }
}

export function olvidarBorrador(citaId) {
  try { localStorage.removeItem(CLAVE(citaId)); } catch { /* noop */ }
}

/* ── Buscar entre las notas ───────────────────────────────────────────────
 *
 * Con veinte citas, «¿cuál era la del proveedor de gafetes?» no se contesta
 * mirando: se contesta escribiendo. Busca en el nombre de la mesa, en el stand
 * y en la nota, sin tildes ni mayúsculas — quien busca escribe «gafetes», no
 * «Gafetes S.A.S.». */
const sinTildes = (v) => String(v ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrarCitas(citas, { texto = '', soloConNotas = false } = {}) {
  const q = sinTildes(texto).trim();
  return (citas || []).filter((c) => {
    if (soloConNotas && !c.notas) return false;
    if (!q) return true;
    const heno = sinTildes([
      c.horario?.expositor?.nombre,
      c.horario?.expositor?.stand,
      c.notas,
    ].join(' '));
    return heno.includes(q);
  });
}

/* ── Sacarlas de aquí ─────────────────────────────────────────────────────
 *
 * Una nota que sólo se puede leer dentro de la aplicación no sirve para lo que
 * se tomó: el seguimiento se hace al día siguiente, en el correo o en la hoja
 * de cálculo de alguien. Se genera CSV porque es lo que abre Excel y lo que
 * traga cualquier CRM.
 *
 * El separador es `;` y no `,`: Excel en español abre los `,` en una sola
 * columna, y quien recibe esto no va a ir a Datos → Texto en columnas. */
export function citasComoCSV(citas, tituloEvento = '') {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const hora = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };
  const filas = [
    ['Evento', 'Fecha y hora', 'Con quién', 'Stand', 'Estado', 'Mis notas'].map(esc).join(';'),
    ...(citas || []).map(c => [
      tituloEvento,
      hora(c.horario?.inicio),
      c.horario?.expositor?.nombre,
      c.horario?.expositor?.stand,
      c.estado === 'solicitada' ? 'Pedida' : 'Confirmada',
      c.notas,
    ].map(esc).join(';')),
  ];
  /* El BOM va delante para que Excel no destroce las tildes. Sin él,
     «Reunión» se abre como «ReuniÃ³n» y la nota queda inservible. */
  return `﻿${filas.join('\r\n')}\r\n`;
}
