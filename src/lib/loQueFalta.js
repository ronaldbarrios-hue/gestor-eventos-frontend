/* Cómo se dice «esto te falta por llenar».
 *
 * ── El muro de texto ─────────────────────────────────────────────────────
 *
 * Se decía nombrándolo TODO: «Te faltan por llenar: Corregimiento, Nombre del
 * Proyecto, Institución / Universidad / Entidad, Departamento…» y así cuarenta
 * etiquetas seguidas, en un párrafo pegado a la barra de progreso, en cada
 * paso del formulario.
 *
 * Con tres preguntas la lista ayuda: se lee de un vistazo y dice exactamente
 * qué buscar. Con cuarenta no es una lista, es un muro — y un muro de texto no
 * se lee, se salta. Peor: ocupaba media pantalla justo encima del formulario
 * que hay que rellenar, así que estorbaba a lo mismo que pretendía ayudar.
 *
 * ── Lo que de verdad hace falta saber ────────────────────────────────────
 *
 * CUÁNTAS quedan. Los campos vacíos ya se ven en la pantalla, con su asterisco:
 * nombrarlos otra vez arriba no añade nada que no esté a la vista. El número,
 * en cambio, no está en ninguna parte y es lo que dice si esto son dos minutos
 * o veinte.
 *
 * Así que se nombran hasta TRES —donde nombrar sigue siendo útil— y a partir de
 * ahí se cuenta.
 */

/* Cuántas quedan de verdad, mirando lo que hay escrito AHORA.
 *
 * Se recalcula con las respuestas del momento y no con las que trajo el
 * prellenado: lo que se escribió mientras se avanzaba deja de contar como
 * pendiente, que es lo que convierte esto en un avance y no en un reproche
 * fijo. */
export function loQueQueda(faltan = [], respuestas = {}) {
  return (faltan || []).filter(f => {
    const v = respuestas?.[f.id];
    return v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
  });
}

/* Cuántas se pueden nombrar antes de que la lista deje de ser una lista. */
const NOMBRAR_HASTA = 3;

export function textoDeLoQueFalta(quedan = []) {
  const n = quedan.length;
  if (!n) return null;

  if (n <= NOMBRAR_HASTA) {
    const etiquetas = quedan.map(f => f.etiqueta);
    const lista = etiquetas.length === 1
      ? etiquetas[0]
      : `${etiquetas.slice(0, -1).join(', ')} y ${etiquetas[etiquetas.length - 1]}`;
    return `Te falta${n === 1 ? '' : 'n'} por llenar: ${lista}.`;
  }

  /* A partir de aquí, el número. Y se dice dónde mirar, porque «te faltan 38»
     sin más deja a alguien buscando por la pantalla. */
  return `Te faltan ${n} respuestas por llenar. Están marcadas abajo.`;
}
