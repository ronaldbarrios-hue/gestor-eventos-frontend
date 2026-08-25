/* De qué dominio salen los enlaces que ve el asistente.
 *
 * Un organizador con marca blanca personaliza el logo, los colores y hasta el
 * nombre de la plataforma… y después el enlace de su boleta decía
 * `gestekeventost.dpdns.org`. La marca se caía justo en lo único que la
 * persona guarda y reenvía.
 *
 * Con `branding.dominio` configurado, los enlaces se arman con el dominio de
 * la empresa. Es un cambio de fachada, no de alojamiento: ese dominio tiene
 * que apuntar a GESTEK (un CNAME y el dominio añadido en el hosting) o el
 * enlace no abrirá nada. Por eso, si está vacío, se usa el dominio desde el
 * que la persona está navegando — que siempre funciona.
 */

export function normalizarDominio(valor) {
  const s = String(valor || '').trim();
  if (!s) return null;
  const con = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(con);
    if (!u.hostname.includes('.')) return null;
    return `${u.protocol}//${u.host}`;
  } catch { return null; }
}

export function baseEnlaces(evento) {
  return normalizarDominio(evento?.page_json?.branding?.dominio)
    || (typeof window !== 'undefined' ? window.location.origin : '');
}

export function enlaceBoleta(evento, codigo) {
  return `${baseEnlaces(evento)}/mi-ticket/${codigo}`;
}

export function enlaceEvento(evento) {
  return `${baseEnlaces(evento)}/explorar/${evento?.slug || ''}`;
}
