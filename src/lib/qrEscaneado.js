/* Qué acaba de leer la cámara.

   ── El problema que resuelve ──

   Todos los escáneres mandaban lo leído como `qr_token`, que el servidor
   verifica como token FIRMADO. Con la boleta digital eso funciona, porque
   ahí el QR es exactamente el token.

   Pero el diseñador de credenciales imprimía otra cosa: la URL
   `https://…/mi-ticket/ABCD1234`. Así que la escarapela impresa no pasaba el
   control de ingreso —el servidor recibía una URL donde esperaba una firma y
   contestaba "QR inválido"— ni servía para dar puntos en un stand ni para
   canjear. Un papel con un QR que no abre ninguna puerta.

   Ya está corregido de origen: la escarapela imprime el mismo token que la
   boleta digital. Pero las impresas antes siguen existiendo, y no se le puede
   pedir a nadie que reimprima cien escarapelas la mañana del evento.

   ── Cómo distingue ──

   Un token firmado no lleva barras; una URL sí. No hay ambigüedad. Y el
   código corto que se extrae de la URL el servidor lo acepta igual de bien
   que el token: `resolverTicket` admite las dos formas desde siempre.

   Lo usan los cinco escáneres: control de ingreso, reingreso, puntos por
   stand, canje del panel y el portal del expositor. Vive aquí y no dentro de
   una pantalla porque cinco copias de esto acabarían separándose. */

export function leerQr(texto) {
  const s = String(texto || '').trim();
  /* Escarapelas impresas con el formato viejo. */
  const m = s.match(/\/mi-ticket\/([A-Za-z0-9]+)/);
  if (m) return { codigo: m[1].toUpperCase() };
  return { qr_token: s };
}
