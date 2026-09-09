/* Qué es cada boleta en la lista de compra.
 *
 * ── El problema ──────────────────────────────────────────────────────────
 *
 * Un evento con cuatro boletas las enseñaba en una lista plana, y nada decía
 * cuál es la entrada al evento y cuáles son actividades de dentro. Quien llega
 * ve cuatro cosas iguales: se inscribe a un taller sin entrada, o pide las
 * cuatro «por si acaso». Queda a interpretación, y la interpretación
 * equivocada se descubre en la puerta.
 *
 * ── Por qué esto está aquí y también en el servidor ──────────────────────
 *
 * Son dos trabajos distintos: el servidor VALIDA lo que se guarda y aquí se
 * PINTA. Los textos —«Actividades dentro del evento», «Necesitas además tu
 * entrada»— son de pantalla y no tienen sitio en una ruta.
 *
 * Lo que sí es la misma lista en los dos lados son las tres claves, y por eso
 * hay una prueba que las compara: si se separan, el panel guardaría un valor
 * que el servidor rechaza.
 */

export const ROLES = {
  entrada: {
    titulo: 'Entrada al evento',
    corto: 'Entrada',
    ayuda: null,
    /* Lo que se lee en el panel al elegirlo. Dice la consecuencia, no la
       definición: quien configura esto no está leyendo un diccionario. */
    panel: 'Da acceso al evento. Es lo que casi todo el mundo va a comprar.',
  },
  actividad: {
    titulo: 'Actividades dentro del evento',
    corto: 'Actividad',
    /* La frase que evita el error caro: alguien que se inscribe a un taller y
       se presenta el día del evento sin entrada. */
    ayuda: 'Necesitas además tu entrada al evento.',
    panel: 'Un taller, una charla, una convocatoria. Quien se inscriba necesita además la entrada.',
  },
  extra: {
    titulo: 'Complementos',
    corto: 'Complemento',
    ayuda: 'Se suma a tu entrada.',
    panel: 'Parqueadero, cena, camiseta. Se suma a la entrada.',
  },
};

export const ORDEN_ROLES = ['entrada', 'actividad', 'extra'];

export const rolValido = (r) => (ROLES[r] ? r : 'entrada');

/* La lista agrupada, o `null` si no hay que agrupar.
 *
 * `null` es el caso normal: un evento con una sola boleta, o con varias que son
 * todas entradas, no gana nada con encabezados. Poner «Entrada al evento»
 * encima de una única boleta es ruido que hay que leer. */
export function agruparBoletas(tipos = []) {
  const conRol = tipos.map(t => ({ ...t, rol: rolValido(t.rol) }));
  const presentes = ORDEN_ROLES.filter(r => conRol.some(t => t.rol === r));
  if (presentes.length < 2) return null;
  return presentes.map(rol => ({
    rol,
    titulo: ROLES[rol].titulo,
    ayuda: ROLES[rol].ayuda,
    tipos: conRol.filter(t => t.rol === rol),
  }));
}
