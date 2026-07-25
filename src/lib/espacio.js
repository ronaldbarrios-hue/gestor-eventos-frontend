/* "Espacio del evento" — tipos de sub-evento.

   Una convención (anime, videojuegos, cine) no tiene solo charlas: tiene
   stands, torneos, shows, proyecciones, meet & greets… El "espacio" es el
   calendario de TODO lo que pasa dentro del evento. Cada sub-evento vive en
   agenda_sessions con un `tipo` (color + icono) y, si es competitivo, un
   `torneo_id` para saltar a sus llaves.

   Única fuente de verdad de los tipos: la usan el editor, la página pública
   y el embed, para que un "stand" se vea igual en los tres sitios. */

export const TIPOS_ESPACIO = [
  { id: 'charla',      label: 'Charla',        icon: '🎤', color: '#3B82F6' },
  { id: 'taller',      label: 'Taller',        icon: '🛠️', color: '#8B5CF6' },
  { id: 'panel',       label: 'Panel',         icon: '💬', color: '#0EA5E9' },
  { id: 'competencia', label: 'Competencia',   icon: '🏆', color: '#F59E0B', competitivo: true },
  { id: 'show',        label: 'Show',          icon: '🎭', color: '#EC4899' },
  { id: 'stand',       label: 'Stand',         icon: '🏬', color: '#10B981' },
  { id: 'activacion',  label: 'Activación',    icon: '🎯', color: '#F43F5E' },
  { id: 'proyeccion',  label: 'Proyección',    icon: '🎬', color: '#6366F1' },
  { id: 'meetgreet',   label: 'Meet & Greet',  icon: '⭐', color: '#EAB308' },
  { id: 'ceremonia',   label: 'Ceremonia',     icon: '🎉', color: '#14B8A6' },
  { id: 'otro',        label: 'Otro',          icon: '📌', color: '#64748B' },
];

export const TIPO_DEFECTO = 'charla';

const _map = Object.fromEntries(TIPOS_ESPACIO.map(t => [t.id, t]));

export function tipoEspacio(id) {
  return _map[id] || _map[TIPO_DEFECTO];
}

export function esCompetitivo(id) {
  return !!tipoEspacio(id).competitivo;
}

/* Fondo tenue + texto del color del tipo, para chips y bordes. */
export function tipoEstilo(id) {
  const c = tipoEspacio(id).color;
  return { color: c, background: `${c}1A`, borderColor: `${c}55` };
}
