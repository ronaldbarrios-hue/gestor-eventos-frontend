/* Qué se le dice a alguien que no tiene cuenta cuando algo falla.
 *
 * ── El problema ──────────────────────────────────────────────────────────
 *
 * Las páginas públicas venían haciendo `e.response?.data?.error || e.message`
 * y pintando el resultado tal cual. Cuando el servidor contesta algo pensado
 * para una persona —«Ese código ya se usó»— está bien. Cuando no, el visitante
 * se encuentra con la conversación entre dos máquinas: la rueda de negocios de
 * un evento publicado decía **«Token requerido.»** a quien entraba sin cuenta,
 * que es exactamente a quien está hecha esa página.
 *
 * Y `e.message` sin respuesta es «Network Error», que además de estar en otro
 * idioma no dice si el problema es de quien mira o nuestro.
 *
 * ── La regla ─────────────────────────────────────────────────────────────
 *
 * El mensaje del servidor se respeta cuando es un 4xx de negocio: eso lo
 * escribió alguien para que lo leyera una persona. Todo lo demás —sin
 * respuesta, un 5xx, un 401— se traduce, porque son estados de la máquina y no
 * cosas que el visitante pueda entender ni arreglar.
 *
 * `reintentable` va aparte del texto a propósito: la pantalla necesita saber
 * si ofrecer un botón de reintentar, y eso no se puede deducir leyendo una
 * frase.
 */

/* Un 401 o un 403 en una página pública casi nunca es «te falta permiso»: es
   que la ruta todavía no existe en el servidor desplegado, o que se pidió algo
   que no era público. En cualquier caso, quien lo lee no tiene nada que hacer
   con esa información. */
const NO_SE_CUENTAN = [401, 403];

export function mensajePublico(e, respaldo) {
  const status = e?.status ?? e?.response?.status;

  /* Sin status no hubo respuesta: la red, un CORS rechazado, el servidor
     dormido. Se arregla reintentando, y por eso se dice así. */
  if (!status) {
    return { texto: 'Tuvimos un problema de comunicación.', reintentable: true };
  }
  if (status >= 500) {
    return { texto: 'Algo falló de nuestro lado. Suele ser cosa de un momento.', reintentable: true };
  }
  if (NO_SE_CUENTAN.includes(status)) {
    return { texto: respaldo || 'Esto no está disponible ahora mismo.', reintentable: true };
  }
  if (status === 404) {
    return { texto: respaldo || 'No encontramos esto.', reintentable: false };
  }

  /* El resto de 4xx sí los escribió alguien para una persona. Se respeta lo
     que diga, con un tope: un mensaje de mil caracteres no lo escribió nadie
     pensando en esta pantalla. */
  const dicho = e?.response?.data?.error;
  return {
    texto: (typeof dicho === 'string' && dicho.trim() && dicho.length <= 200)
      ? dicho
      : (respaldo || 'No se pudo completar.'),
    reintentable: false,
  };
}
