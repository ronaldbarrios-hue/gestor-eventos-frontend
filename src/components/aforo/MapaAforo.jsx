/* El plano del evento con lo que está pasando encima.
 *
 * El mapa decía DÓNDE está cada cosa y el resto de pantallas decían CÓMO va.
 * Eran dos mitades del mismo dato y había que juntarlas en la cabeza: la
 * tarima estaba en el plano, su aforo en otra pestaña, la gente que entró por
 * la puerta norte en una tercera y la inscripción del taller en una cuarta.
 *
 * Aquí el plano lleva el número encima y un clic abre el detalle:
 *   · Zona      → cuánta gente hay dentro, sobre su aforo.
 *   · Puerta    → cuántos ingresos se han registrado por ahí.
 *   · Sub-evento→ inscritos y cuántos de ésos ya pasaron su QR.
 *   · Expositor / punto → referencia para ubicarse, sin número que dar.
 *
 * Se usa en el tablero en vivo (con clic) y en el editor del mapa (sólo
 * mirar), con el mismo dibujo en los dos sitios.
 */

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

const COLOR_PUERTA = '#3B82F6';
const COLOR_SESION = '#6366F1';

/* Qué pinta cada marcador: su número, su color y su etiqueta. Devuelve null
   para lo que no está en el plano o ya no existe. */
function resolver(m, datos) {
  const tipo = m.tipo || (m.zona_id ? 'zona' : m.acceso_id ? 'acceso' : m.sesion_id ? 'sesion' : 'punto');

  if (tipo === 'zona') {
    const z = (datos.zonas || []).find(x => x.id === m.zona_id);
    if (!z) return null;
    const nivel = nivelDeZona(z);
    return {
      clave: `zona:${z.id}`, tipo, dato: z, color: nivel.color, alerta: z.excedido > 0,
      valor: String(z.dentro),
      etiqueta: `${z.nombre}${z.aforo_max ? ` · ${z.aforo_max}` : ''}`,
    };
  }
  if (tipo === 'acceso') {
    const a = (datos.accesos || []).find(x => x.id === m.acceso_id);
    if (!a) return null;
    return {
      clave: `acceso:${a.id}`, tipo, dato: a, color: COLOR_PUERTA, alerta: false,
      valor: String(a.ingresos), etiqueta: a.nombre,
    };
  }
  if (tipo === 'sesion') {
    const s = (datos.sesiones || []).find(x => x.id === m.sesion_id);
    if (!s) return null;
    /* El número que se enseña es el de gente que YA entró; los inscritos van
       debajo. En la puerta de un taller lo que se mira es cuánta sala hay
       ocupada, no cuánta gente prometió venir. */
    const lleno = s.cupo != null && s.inscritos >= s.cupo;
    return {
      clave: `sesion:${s.id}`, tipo, dato: s, color: lleno ? '#F59E0B' : COLOR_SESION, alerta: false,
      valor: String(s.asistieron ?? 0),
      etiqueta: `${s.titulo}${s.cupo != null ? ` · ${s.inscritos}/${s.cupo}` : ''}`,
    };
  }
  return null;
}

export default function MapaAforo({ mapa, datos = {}, sel = null, onSelect, alto = '60vh' }) {
  const marcadores = Array.isArray(mapa?.marcadores) ? mapa.marcadores : [];
  if (!mapa?.imagen_url) return null;

  const vivos = marcadores.map(m => ({ m, r: resolver(m, datos) })).filter(x => x.r);
  const referencia = marcadores.filter(m => !resolver(m, datos));

  return (
    <div className="rounded-2xl border border-border bg-surface-2 overflow-auto flex justify-center">
      <div className="relative">
        <img src={mapa.imagen_url} alt="Plano del evento" className="block w-auto max-w-full" style={{ maxHeight: alto }} />

        {/* Lo que no lleva número —expositores, puntos de interés— se deja
            tenue: sirve para ubicarse, pero aquí el protagonista es el dato. */}
        {referencia.map((m, i) => (
          <span key={`ref-${i}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/60 border border-black/20"
            style={{ left: `${m.x}%`, top: `${m.y}%` }} />
        ))}

        {vivos.map(({ m, r }) => {
          const activo = sel === r.clave;
          return (
            <button key={r.clave} onClick={() => onSelect?.(activo ? null : r.clave)}
              title={`${r.etiqueta}: ${r.valor}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform
                ${onSelect ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
              style={{ left: `${m.x}%`, top: `${m.y}%` }}>
              <span
                className={`min-w-[46px] h-[46px] px-1.5 rounded-full border-2 border-white shadow-lg text-white
                  font-bold font-display tabular-nums flex items-center justify-center
                  ${activo ? 'ring-4 ring-accent' : 'ring-2 ring-white/60'}
                  ${r.alerta ? 'animate-pulse' : ''}`}
                style={{ background: r.color }}>
                {r.valor}
              </span>
              <span className="mt-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] whitespace-nowrap max-w-[140px] truncate">
                {r.etiqueta}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* El detalle de lo seleccionado. Vive aquí, junto al dibujo, porque es la otra
   mitad del mismo gesto: se hace clic para saber cómo va eso. */
export function DetalleMarcador({ sel, datos, children }) {
  if (!sel) return null;
  const [tipo, id] = sel.split(':');

  if (tipo === 'zona') {
    const z = (datos.zonas || []).find(x => x.id === id);
    if (!z) return null;
    const nivel = nivelDeZona(z);
    return (
      <Ficha titulo={z.nombre} etiqueta="Zona de aforo" color={nivel.color} pie={nivel.label}>
        <Dato k="Dentro ahora" v={`${z.dentro}${z.aforo_max ? ` / ${z.aforo_max}` : ''}`} destacado />
        {z.excedido > 0 && <Dato k="Por encima" v={`+${z.excedido}`} />}
        <Dato k="Entradas" v={z.entradas} />
        <Dato k="Salidas" v={z.salidas} />
        {children}
      </Ficha>
    );
  }

  if (tipo === 'acceso') {
    const a = (datos.accesos || []).find(x => x.id === id);
    if (!a) return null;
    return (
      <Ficha titulo={a.nombre} etiqueta="Puerta" color={COLOR_PUERTA} pie="Ingresos al evento registrados por aquí">
        <Dato k="Han entrado" v={a.ingresos} destacado />
      </Ficha>
    );
  }

  if (tipo === 'sesion') {
    const s = (datos.sesiones || []).find(x => x.id === id);
    if (!s) return null;
    const hora = s.inicio ? new Date(s.inicio).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
    return (
      <Ficha titulo={s.titulo} etiqueta="Sub-evento" color={COLOR_SESION}
        pie={s.requiere_inscripcion ? 'Pide inscripción aparte' : 'Entra cualquiera con boleta'}>
        <Dato k="Ya entraron" v={s.asistieron} destacado />
        <Dato k="Inscritos" v={s.cupo != null ? `${s.inscritos} / ${s.cupo}` : s.inscritos} />
        {s.libres != null && <Dato k="Cupos libres" v={s.libres} />}
        {hora && <Dato k="Cuándo" v={hora} />}
        {(s.ubicacion || s.track) && <Dato k="Dónde" v={[s.track, s.ubicacion].filter(Boolean).join(' · ')} />}
      </Ficha>
    );
  }
  return null;
}

function Ficha({ titulo, etiqueta, color, pie, children }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{etiqueta}</p>
      </div>
      <p className="text-base font-semibold text-text-1 mb-3">{titulo}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
      {pie && <p className="text-[11px] text-text-3 mt-3">{pie}</p>}
    </div>
  );
}

function Dato({ k, v, destacado }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{k}</p>
      <p className={`tabular-nums text-text-1 ${destacado ? 'text-2xl font-bold font-display' : 'text-sm'}`}>{v}</p>
    </div>
  );
}
