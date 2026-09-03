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

/* ── Tipos propios del organizador ────────────────────────────────────────

   Los once de arriba son los que trae GESTEK. Añadir uno más era **publicar
   código**, y por eso existía el «¿Falta tu tipo de sub-evento? Pídenoslo» del
   Calendario: servía para DECIRLO, no para ponerlo.

   Ahora el evento puede traer los suyos en `page_json.tipos_extra`. Se guardan
   ahí y no en una tabla porque es configuración de la landing, viaja ya con el
   evento a la página pública y al embed, y no hace falta migración.

   **La firma de `tipoEspacio(id)` no cambia**, y eso es a propósito: se llama
   desde seis sitios, dos de ellos en la página pública, y varios no tienen el
   evento a mano. El segundo argumento es opcional — quien lo tiene, pasa el
   evento y ve los tipos propios; quien no, sigue viendo los once de siempre en
   vez de romperse.

   Lo que un tipo propio NO puede inventar:
   · El icono sale de `Iconos.jsx` (lista cerrada). Los tipos se pintan en el
     panel, en la página pública y en el embed, y un nombre de trazo inventado
     dejaría un hueco en los tres.
   · `competitivo` no se ofrece: es lo que engancha un tipo con las llaves de un
     torneo, y eso es una relación del modelo, no un adorno. */

export const ICONOS_TIPO = [
  'micro', 'taller', 'panel', 'trofeo', 'show', 'stand', 'diana',
  'proyeccion', 'estrella', 'ceremonia', 'megafono', 'camara', 'paleta',
  'manos', 'robot', 'entrada', 'meta', 'empresa', 'pin',
];

/* `x_` delante para que un tipo propio no pueda pisar nunca a uno de los once
   ni al de otro evento si algo se copia entre eventos. */
export const PREFIJO_TIPO_PROPIO = 'x_';

export function tiposPropios(evento) {
  const extra = evento?.page_json?.tipos_extra;
  if (!Array.isArray(extra)) return [];
  return extra
    .filter(t => t && t.id && String(t.label || '').trim())
    .map(t => ({
      id: String(t.id),
      label: String(t.label).trim(),
      icono: ICONOS_TIPO.includes(t.icono) ? t.icono : 'pin',
      color: /^#[0-9a-f]{6}$/i.test(String(t.color || '')) ? t.color : '#64748B',
    }));
}

/* Los once más los del evento. Es lo que hay que ofrecer al elegir un tipo. */
export function tiposDelEvento(evento) {
  return [...TIPOS_ESPACIO, ...tiposPropios(evento)];
}

export function tipoEspacio(id, evento = null) {
  if (evento) {
    const propio = tiposPropios(evento).find(t => t.id === id);
    if (propio) return propio;
  }
  return _map[id] || _map[TIPO_DEFECTO];
}

export function esCompetitivo(id) {
  /* Sin el evento a propósito: `competitivo` sólo lo llevan los tipos de
     GESTEK, y es lo que decide si el formulario pide un torneo. */
  return !!(_map[id] || {}).competitivo;
}

/* Fondo tenue + texto del color del tipo, para chips y bordes. */
export function tipoEstilo(id, evento = null) {
  const c = tipoEspacio(id, evento).color;
  return { color: c, background: `${c}1A`, borderColor: `${c}55` };
}
