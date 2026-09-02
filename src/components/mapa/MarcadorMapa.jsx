import LlamaZona from '../aforo/LlamaZona.jsx';

/* El círculo que se coloca sobre el plano del evento.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * Estaba escrito dos veces, igual, en dos archivos que no se hablan: el editor
 * del mapa (`MapaSection.jsx`, donde se arrastra) y el mapa público
 * (`editor/blocks.jsx`, `MapaEventoPreview`). Las mismas cinco ramas por tipo,
 * las mismas clases de Tailwind, el mismo borde blanco y la misma sombra. Cada
 * corrección había que hacerla dos veces y no había nada que lo recordara: la
 * segunda copia se enteraba cuando alguien notaba que los dos mapas se veían
 * distintos.
 *
 * ── Lo que NO entra aquí, y por qué ───────────────────────────────────────
 *
 * `components/aforo/MapaAforo.jsx` —el tablero en vivo— parecía la tercera
 * copia y **no lo es**. Lo suyo es una píldora ancha con un valor grande, un
 * halo naranja que se ve de lejos y una etiqueta debajo: su trabajo es que
 * alguien de pie en el recinto lea el número desde tres metros. Meterlo aquí
 * habría sido forzar tres comportamientos distintos en un componente con
 * banderas, que es peor que dos copias honestas. Se queda como está.
 *
 * ── El contrato ───────────────────────────────────────────────────────────
 *
 * Recibe cómo PINTARSE, no de dónde salen los datos. Ésa es la costura: cada
 * mapa sabe leer lo suyo —el editor tiene marcadores y mapas de ids, el
 * público recibe el evento ya resuelto— y los dos saben decir «un círculo azul
 * con este logo». Si en vez de eso recibiera `evento` y `marcador`, tendría
 * que conocer las dos formas de los datos y volveríamos a tener dos caminos
 * dentro de un solo archivo.
 */
export default function MarcadorMapa({
  tipo,
  color,
  size = 44,
  ring = 'ring-2 ring-white/70',
  logoUrl = '',
  inicial = '?',
  /* Zona: la gente que hay dentro. `null` = sin dato (o aforo sin publicar),
     y entonces se cae a la inicial — un «0» ahí diría que la zona está vacía,
     que es una afirmación distinta de «no lo sé». */
  valor = null,
  nivel = null,          // null | 'caliente' | 'en_fuego'
  /* Zona: hay algo ocurriendo ahora mismo. Un punto, no un número: el número
     ya está ocupado por el aforo. */
  puntoVivo = false,
  codigo = 'P',
}) {
  const st = { width: size, height: size };
  const base = `rounded-full border-2 border-white shadow-lg flex items-center justify-center ${ring}`;

  if (tipo === 'acceso') {
    return (
      <span className={`${base} text-white`} style={{ ...st, background: color || '#3B82F6' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 17l5-5-5-5M15 12H3" />
        </svg>
      </span>
    );
  }

  /* La zona es el único marcador con un número vivo dentro, así que es el
     único que puede crecer: `min-w` en vez de ancho fijo, para que un «120»
     no se salga del círculo. El color lo manda el nivel de ocupación cuando
     hay dato, y el del organizador cuando no. */
  if (tipo === 'zona') {
    const fondo = nivel === 'en_fuego' ? '#EF4444'
      : nivel === 'caliente' ? '#F97316'
      : (color || '#0EA5E9');
    return (
      <LlamaZona nivel={nivel} size={size}>
        <span
          className={`relative ${base} px-1.5 text-white font-bold font-display tabular-nums text-sm`}
          style={{ minWidth: size, height: size, background: fondo }}
        >
          {valor == null ? String(inicial || 'Z').charAt(0).toUpperCase() : valor}
          {puntoVivo && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-white animate-pulse" />
          )}
        </span>
      </LlamaZona>
    );
  }

  if (tipo === 'expositor') {
    return (
      <span className={`${base} bg-white overflow-hidden`} style={st}>
        {logoUrl
          ? <img src={logoUrl} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
          : <span className="text-xs font-bold text-slate-700">{String(inicial || '?').charAt(0)}</span>}
      </span>
    );
  }

  if (tipo === 'sesion') {
    return (
      <span className={`${base} text-white font-bold`} style={{ ...st, background: '#6366F1' }}>
        {String(inicial || '?').charAt(0).toUpperCase()}
      </span>
    );
  }

  /* Punto de interés: el organizador elige su código corto y su color. */
  return (
    <span className={`${base} text-white font-bold text-sm`} style={{ ...st, background: color || '#64748B' }}>
      {codigo || 'P'}
    </span>
  );
}
