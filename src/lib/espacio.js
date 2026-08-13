/* "Espacio del evento" — tipos de sub-evento.

   Una convención (anime, videojuegos, cine) no tiene solo charlas: tiene
   stands, torneos, shows, proyecciones, meet & greets… El "espacio" es el
   calendario de TODO lo que pasa dentro del evento. Cada sub-evento vive en
   agenda_sessions con un `tipo` (color + icono) y, si es competitivo, un
   `torneo_id` para saltar a sus llaves.

   Única fuente de verdad de los tipos: la usan el editor, la página pública
   y el embed, para que un "stand" se vea igual en los tres sitios. */

/* `icono` es el nombre de un trazo de components/ui/Iconos.jsx, no un emoji.

   Antes esto eran emoji del sistema (🎤 🛠️ 💬 🏆 …) y salían en cuatro sitios
   a la vez: el selector al crear un sub-evento, el calendario del panel, la
   agenda pública y el embed. Tres problemas, ninguno de gusto: cada sistema
   los dibuja distinto, traen su propio color —así que rompían la paleta justo
   donde había once seguidos— y no se alinean con el texto de al lado.

   Los trazos heredan `currentColor`, de modo que cada tipo se pinta con SU
   color de aquí abajo en vez de con el que traiga el sistema operativo. */
export const TIPOS_ESPACIO = [
  { id: 'charla',      label: 'Charla',        icono: 'micro',      color: '#3B82F6' },
  { id: 'taller',      label: 'Taller',        icono: 'taller',     color: '#8B5CF6' },
  { id: 'panel',       label: 'Panel',         icono: 'panel',      color: '#0EA5E9' },
  { id: 'competencia', label: 'Competencia',   icono: 'trofeo',     color: '#F59E0B', competitivo: true },
  { id: 'show',        label: 'Show',          icono: 'show',       color: '#EC4899' },
  { id: 'stand',       label: 'Stand',         icono: 'stand',      color: '#10B981' },
  { id: 'activacion',  label: 'Activación',    icono: 'diana',      color: '#F43F5E' },
  { id: 'proyeccion',  label: 'Proyección',    icono: 'proyeccion', color: '#6366F1' },
  { id: 'meetgreet',   label: 'Meet & Greet',  icono: 'estrella',   color: '#EAB308' },
  { id: 'ceremonia',   label: 'Ceremonia',     icono: 'ceremonia',  color: '#14B8A6' },
  { id: 'otro',        label: 'Otro',          icono: 'pin',        color: '#64748B' },
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
