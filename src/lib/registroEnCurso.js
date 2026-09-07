/* «Empecé el registro, se me cerró la pestaña / se me fue el internet, y toca
 * escribirlo todo otra vez.»
 *
 * Con un formulario de varias preguntas repartido en pasos (ver
 * `modulosFormulario.js`), cerrar el modal a mitad de camino —sin querer, por
 * una llamada, porque el navegador recargó— tiraba todo lo escrito. Volver a
 * abrir "Reserva tu cupo" / "Compra tu boleta" empezaba SIEMPRE desde cero.
 *
 * Esto guarda lo que la persona ya escribió (sus datos, las respuestas del
 * organizador, el paso en el que iba y el código de descuento si escribió uno)
 * en SU navegador, igual que `guardarBoleta` en `BoletaConocida.jsx` — nunca
 * viaja al servidor. Se guarda por evento y por tipo de boleta, porque son
 * formularios distintos (uno puede tener preguntas que otro no).
 *
 * Se borra sola a los pocos días (por si alguien más usa el mismo navegador
 * más adelante y no tiene sentido ofrecerle un formulario ajeno a medio
 * llenar) y se borra también en el momento en que el registro se completa —
 * ahí ya no es "en curso", es una boleta hecha. */

const VENCE_MS = 3 * 24 * 60 * 60 * 1000; // 3 días

const clave = (slug, tipoId) => `gestek-registro:${slug}:${tipoId}`;

export function guardarProgreso(slug, tipoId, datos) {
  if (!slug || !tipoId) return;
  try {
    localStorage.setItem(clave(slug, tipoId), JSON.stringify({
      ...datos,
      guardado_at: Date.now(),
    }));
  } catch { /* almacenamiento lleno / bloqueado: no pasa nada, sólo no se recuerda */ }
}

export function leerProgreso(slug, tipoId) {
  if (!slug || !tipoId) return null;
  try {
    const crudo = localStorage.getItem(clave(slug, tipoId));
    if (!crudo) return null;
    const d = JSON.parse(crudo);
    if (!d || typeof d !== 'object') return null;
    if (!d.guardado_at || Date.now() - d.guardado_at > VENCE_MS) {
      olvidarProgreso(slug, tipoId); // vencido: se limpia solo, no se ofrece
      return null;
    }
    return d;
  } catch { return null; }
}

export function olvidarProgreso(slug, tipoId) {
  try { localStorage.removeItem(clave(slug, tipoId)); } catch { /* noop */ }
}
