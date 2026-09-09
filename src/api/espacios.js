import client from './client.js';

/* El plano del evento: la silla, la mesa, el palco.
 *
 * Dos mitades y no una por una razón que no es de organización: **quien compra
 * no tiene cuenta**. Las rutas del panel van con sesión; las de la compra, no.
 * Pedirle a alguien que se registre para elegir silla es perder la venta.
 */

export const espaciosApi = {
  /* ── El organizador ─────────────────────────────────────────────────── */
  list        : (eventoId)            => client.get(`/eventos/${eventoId}/espacios`).then(r => r.data),
  crear       : (eventoId, body)      => client.post(`/eventos/${eventoId}/espacios`, body).then(r => r.data),
  /* «12 filas de 20» y salen 240 sillas con su nombre. A mano son 240
     formularios, así que esto no es una comodidad: es el único camino. */
  generar     : (eventoId, body)      => client.post(`/eventos/${eventoId}/espacios/generar`, body).then(r => r.data),
  editar      : (eventoId, id, body)  => client.patch(`/eventos/${eventoId}/espacios/${id}`, body).then(r => r.data),
  borrar      : (eventoId, id)        => client.delete(`/eventos/${eventoId}/espacios/${id}`).then(r => r.data),
  /* Qué tipo de boleta abre este espacio, o sea cuánto cuesta. En cascada
     porque poner precio a una sección de 240 sillas de una en una no es una
     interfaz, es un castigo. */
  localidad   : (eventoId, id, ticket_type_id) =>
    client.put(`/eventos/${eventoId}/espacios/${id}/localidad`, { ticket_type_id }).then(r => r.data),
  localidadEnCascada: (eventoId, id, ticket_type_id) =>
    client.put(`/eventos/${eventoId}/espacios/${id}/localidad-en-cascada`, { ticket_type_id }).then(r => r.data),
  /* La salida de emergencia: soltar una silla. Las retenciones caducan solas;
     una VENTA no, y una anulación o una prueba dejarían la silla ocupada para
     siempre. Queda anotado en la auditoría. */
  liberar     : (eventoId, id)        => client.post(`/eventos/${eventoId}/espacios/${id}/liberar`).then(r => r.data),
  /* Llenar una tribuna ya trazada con sus butacas. Es el orden natural desde
     que el bloque se dibuja sobre el plano real: primero la forma, luego las
     sillas dentro. */
  llenarBloque: (eventoId, id, body) =>
    client.post(`/eventos/${eventoId}/espacios/${id}/butacas`, body).then(r => r.data),
  /* Mover muchos de una vez. Arrastrar una sección son doscientas sillas que
     cambian de sitio: con una petición por silla el editor iría a tirones.
     Sólo toca la geometría — no puede cambiar precios, modos ni nombres. */
  moverGeometria: (eventoId, cambios) =>
    client.put(`/eventos/${eventoId}/espacios/geometria`, { cambios }).then(r => r.data),
  /* El color de una localidad. Es una decisión del plano y no del catálogo:
     en el mapa de un concierto el color ES el precio. `null` vuelve al color
     de la paleta, para que elegir uno no sea irreversible. */
  /* El recinto de concierto de partida: tarima, general, tribunas numeradas y
     palcos ya colocados. No es el recinto —eso se termina calcando el plano de
     verdad encima— pero nadie empieza bien delante de un lienzo vacío. */
  plantillaConcierto: (eventoId, body) =>
    client.post(`/eventos/${eventoId}/espacios/plantilla`, body).then(r => r.data),
  colorLocalidad: (eventoId, tipoId, color) =>
    client.put(`/eventos/${eventoId}/localidades/${tipoId}/color`, { color }).then(r => r.data),
};

/* ── Quien compra ─────────────────────────────────────────────────────── */

export const planoApi = {
  /* El estado del plano, ya agregado: qué hay y qué está libre. Lo que NO
     viene es de quién es cada silla. */
  mapa   : (slug)                     => client.get(`/eventos/publicos/slug/${slug}/mapa`).then(r => r.data),
  retener: (slug, espacio_id, sesion) => client.post(`/eventos/publicos/slug/${slug}/retener`, { espacio_id, sesion }).then(r => r.data),
  soltar : (slug, espacio_id, sesion) => client.post(`/eventos/publicos/slug/${slug}/soltar`,  { espacio_id, sesion }).then(r => r.data),
};

/* ── El carrito ───────────────────────────────────────────────────────────
 *
 * Quién tiene retenida una silla. No es el usuario: alguien sin cuenta también
 * compra, y la misma persona puede tener dos pestañas con dos carritos que no
 * deben pisarse.
 *
 * En `sessionStorage` y no en `localStorage` a propósito: cada pestaña lleva el
 * suyo. Con `localStorage`, abrir el plano en dos pestañas haría que la segunda
 * creyera que las sillas de la primera son suyas — y soltara las que la primera
 * está a punto de pagar.
 */
const CLAVE = 'gestek.carrito-plano';

export function sesionDelCarrito() {
  try {
    let s = sessionStorage.getItem(CLAVE);
    if (!s) {
      s = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(CLAVE, s);
    }
    return s;
  } catch {
    /* Navegación privada, o almacenamiento bloqueado. Se genera uno de usar y
       tirar: la compra funciona igual dentro de esta carga de página, que es
       todo lo que dura una retención. */
    return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/* ── Los recintos guardados ───────────────────────────────────────────────
 *
 * Dibujar el Movistar Arena son horas, y sin esto ese trabajo muere con el
 * evento: el siguiente concierto en el mismo sitio empieza de cero.
 *
 * Cada evento parte de una COPIA y no de una referencia viva. Es deliberado:
 * con referencia, corregir la plantilla cambiaría el plano de eventos que ya
 * vendieron boletas —alguien compró «Tribuna 104, fila F» y la 104 se mueve—.
 * Lo que se pierde, propagar una corrección a todos, es justo lo que no se debe
 * poder hacer.
 */
export const recintosApi = {
  list  : ()      => client.get('/recintos').then(r => r.data),
  get   : (id)    => client.get(`/recintos/${id}`).then(r => r.data),
  /* Se guarda el plano que de verdad hay en el evento: el servidor lo lee de la
     base, no del navegador. */
  guardar: (body) => client.post('/recintos', body).then(r => r.data),
  borrar : (id)   => client.delete(`/recintos/${id}`).then(r => r.data),
  /* Montar el plano de un evento desde un recinto. */
  montarEn: (eventoId, recinto_id) =>
    client.post(`/eventos/${eventoId}/espacios/desde-recinto`, { recinto_id }).then(r => r.data),
};
