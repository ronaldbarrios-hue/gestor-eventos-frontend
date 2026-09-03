/* El equipo del evento, leído igual en todas partes.
 *
 * `GET /:eventoId/equipo` devuelve `{ owner, miembros }`, y cada miembro trae
 * el nombre en tres sitios posibles —`profile.nombre`, `nombre_invitado`,
 * `email`— según haya aceptado la invitación o no. Siete pantallas piden esa
 * respuesta y **cada una desenreda eso por su cuenta**: `AccesosSection`,
 * `TareasTab`, `ChatTab`, `EquipoTab`, `ResumenSection`, `MiEventoWidget` y
 * `AjustesPage`.
 *
 * De ahí venía que unas supieran el rol de cada persona y otras no. La puerta
 * de ingreso pintaba una ficha por miembro con el nombre y nada más: en un
 * evento con cuarenta personas, cuarenta fichas seguidas y ninguna forma de
 * saber cuál de los cuatro «Juan» es el de puerta. El dato del rol venía en la
 * respuesta (`rol_detail`) desde siempre; sólo que esa pantalla no lo leía.
 *
 * Mismo criterio que `lib/zonas.js`: un concepto que sale en varias pantallas
 * se lee en un sitio. */

/* El dueño va primero y con su rol escrito a mano.
 *
 * No es un `event_member`: no tiene fila ni `rol_id`, porque sus permisos no
 * vienen de un rol sino de ser el dueño. Ponerlo con el rol vacío lo dejaría al
 * final de la lista agrupada, en un grupo «sin rol» junto a los invitados a
 * medio aceptar, que es justo donde nadie lo busca. */
export const ROL_DUENO = '__dueno__';

export function miembrosDelEvento(respuesta) {
  const out = [];
  const owner = respuesta?.owner;
  if (owner?.id) {
    out.push({
      id: owner.id,
      nombre: owner.nombre || owner.email || 'Organizador',
      email: owner.email || '',
      avatarUrl: owner.avatar_url || '',
      rolId: ROL_DUENO,
      rolNombre: 'Organizador',
      pendiente: false,
    });
  }
  for (const m of (respuesta?.miembros || [])) {
    /* `profile.id` y no `m.id`: lo que se guarda al asignar a alguien es su
       id de usuario, no el id de la fila de membresía. Confundirlos guarda un
       id que después no casa con nadie. Quien todavía no aceptó la invitación
       no tiene `profile`, y por eso no se puede asignar: se enseña igual, en
       gris, porque no verlo hace pensar que la invitación no se mandó. */
    const id = m.profile?.id || null;
    const nombre = m.profile?.nombre || m.nombre_invitado || m.email || 'Sin nombre';
    if (owner?.id && id === owner.id) continue;   // el dueño ya está arriba
    out.push({
      id,
      nombre,
      email: m.profile?.email || m.email || '',
      avatarUrl: m.profile?.avatar_url || '',
      rolId: m.rol_detail?.id || m.rol_id || '',
      rolNombre: m.rol_detail?.nombre || m.rol || '',
      pendiente: !id,
    });
  }
  return out;
}

/* Los que se pueden asignar: los que ya tienen cuenta. */
export function asignables(miembros) {
  return (miembros || []).filter(m => m.id && !m.pendiente);
}

/* Agrupados por rol, en el orden en que llegan los roles del evento.
 *
 * Los que no tienen rol van al final y en su propio grupo, no repartidos: si
 * se mezclan con los demás, el grupo deja de significar nada. */
export function porRol(miembros) {
  const grupos = new Map();
  for (const m of miembros || []) {
    const clave = m.rolNombre || 'Sin rol';
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(m);
  }
  const entradas = Array.from(grupos.entries());
  entradas.sort(([a], [b]) => {
    if (a === 'Organizador') return -1;
    if (b === 'Organizador') return 1;
    if (a === 'Sin rol') return 1;
    if (b === 'Sin rol') return -1;
    return a.localeCompare(b, 'es');
  });
  return entradas;
}
