/* El plano del evento con la ocupación encima.

   El mapa ya existía (Espacio del evento → Mapa) y el aforo por zonas también,
   pero eran dos pantallas que no se hablaban: una decía DÓNDE está la tarima y
   la otra CUÁNTA gente hay en ella, y había que juntarlas en la cabeza. Aquí se
   dibujan las zonas colocadas en el plano con su número en vivo, que es como
   se mira un recinto de verdad: primero el sitio, después el dato.

   Se usa en dos sitios con el mismo componente: el tablero en vivo (con clic
   para operar la zona) y el editor del mapa (sólo mirar). */

export const NIVELES = {
  vacia   : { color: '#64748B', label: 'Sin gente' },
  ok      : { color: '#10B981', label: 'Holgada' },
  media   : { color: '#F59E0B', label: 'Llenándose' },
  llena   : { color: '#EF4444', label: 'Al tope' },
  excedida: { color: '#B91C1C', label: 'Por encima del aforo' },
};

/* El nivel sale del porcentaje, salvo que la zona no tenga tope declarado:
   sin tope no hay "llena" posible, sólo cuánta gente hay. */
export function nivelDeZona(z) {
  if (!z) return NIVELES.vacia;
  if (z.excedido > 0) return NIVELES.excedida;
  if (!z.aforo_max) return z.dentro > 0 ? NIVELES.ok : NIVELES.vacia;
  const pct = z.ocupacion_pct ?? Math.round((z.dentro / z.aforo_max) * 100);
  if (pct >= 100) return NIVELES.llena;
  if (pct >= 75) return NIVELES.media;
  return z.dentro > 0 ? NIVELES.ok : NIVELES.vacia;
}

export default function MapaAforo({ mapa, zonas = [], selId = null, onSelect, alto = '60vh' }) {
  const marcadores = (Array.isArray(mapa?.marcadores) ? mapa.marcadores : [])
    .filter(m => m.zona_id && (m.tipo === 'zona' || !m.tipo));
  const porId = new Map(zonas.map(z => [z.id, z]));
  const colocadas = marcadores.filter(m => porId.has(m.zona_id));

  if (!mapa?.imagen_url) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface-2 overflow-auto flex justify-center">
      <div className="relative">
        <img src={mapa.imagen_url} alt="Plano del evento" className="block w-auto max-w-full" style={{ maxHeight: alto }} />

        {/* Los marcadores que NO son zonas se dejan tenues: sirven de
            referencia para ubicarse, pero aquí el protagonista es el aforo. */}
        {(Array.isArray(mapa.marcadores) ? mapa.marcadores : [])
          .filter(m => !m.zona_id)
          .map((m, i) => (
            <span key={`otro-${i}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/60 border border-black/20"
              style={{ left: `${m.x}%`, top: `${m.y}%` }} />
          ))}

        {colocadas.map(m => {
          const z = porId.get(m.zona_id);
          const nivel = nivelDeZona(z);
          const activa = selId === z.id;
          return (
            <button key={m.zona_id} onClick={() => onSelect?.(z.id)} title={`${z.nombre}: ${z.dentro} dentro`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform
                ${onSelect ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
              style={{ left: `${m.x}%`, top: `${m.y}%` }}>
              <span
                className={`min-w-[46px] h-[46px] px-1.5 rounded-full border-2 border-white shadow-lg text-white
                  font-bold font-display tabular-nums flex items-center justify-center
                  ${activa ? 'ring-4 ring-accent' : 'ring-2 ring-white/60'}
                  ${z.excedido > 0 ? 'animate-pulse' : ''}`}
                style={{ background: nivel.color }}>
                {z.dentro}
              </span>
              <span className="mt-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] whitespace-nowrap max-w-[130px] truncate">
                {z.nombre}{z.aforo_max ? ` · ${z.aforo_max}` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
