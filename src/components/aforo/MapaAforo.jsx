import { useState } from 'react';

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

/* Cuánto "arde" una zona. Sirve para dos cosas a la vez: encender el efecto en
   el plano y ordenar el ranking de lo más lleno.

   No es sólo el aforo. Una zona con el 95% y un torneo empezando ahora está
   más viva que otra al 100% sin nada programado, y quien mira el plano quiere
   ver la primera. Por eso suman las dos cosas.

   Sin aforo declarado no hay porcentaje que calcular; ahí manda la actividad y
   la gente que haya. */
export function calorDeZona(z) {
  if (!z) return 0;
  const pct = z.aforo_max ? (z.dentro / z.aforo_max) : Math.min(1, (z.dentro || 0) / 50);
  const enCurso = (z.ahora || []).length;
  return pct + (enCurso > 0 ? 0.35 : 0) + Math.min(0.15, enCurso * 0.05);
}

/* Arde de verdad cuando se pasó del aforo, o cuando está al tope con algo
   pasando dentro. Es deliberadamente difícil de encender: si se enciende
   media pantalla, deja de querer decir nada. */
export function estaEnLlamas(z) {
  if (!z) return false;
  if (z.excedido > 0) return true;
  return Boolean(z.aforo_max && z.dentro >= z.aforo_max && (z.ahora || []).length > 0);
}

export function IconoLlama({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2c.5 3-1.5 4.2-2.8 5.6C7.6 9.3 7 10.8 7 12.6 7 16.1 9.5 19 12.6 19S18 16.4 18 13.1c0-2.4-1.1-4-2.3-5.3-.4 1-1 1.7-1.8 2.1.4-2.6-.6-5.6-1.9-7.9Z" />
      <path d="M12 21c-1.9 0-3.3-1.3-3.3-3 0-1.9 1.6-2.6 2.3-4 .9 1 3 2 3 4.2 0 1.6-1.1 2.8-2 2.8Z" opacity=".7" />
    </svg>
  );
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
    const enCurso = (z.ahora || []).length;
    return {
      clave: `zona:${z.id}`, tipo, dato: z, color: nivel.color,
      alerta: z.excedido > 0, llamas: estaEnLlamas(z),
      valor: String(z.dentro),
      /* Debajo del círculo va lo que está pasando, no el tope: en el plano, "3
         de 30" dice menos que "Torneo de FIFA". */
      etiqueta: enCurso > 0
        ? `${z.nombre} · ${z.ahora[0].titulo}${enCurso > 1 ? ` +${enCurso - 1}` : ''}`
        : `${z.nombre}${z.aforo_max ? ` · ${z.aforo_max}` : ''}`,
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
  /* Zoom, que en el movil no es un adorno.

     Un plano de recinto metido en 375px de ancho deja los circulos de 46px
     encima unos de otros: se ve que hay marcadores y no cual es cual, y tocar
     el correcto es cuestion de suerte. Ampliando, el contenedor ya rueda solo
     —era `overflow-auto` desde el principio— y cada zona vuelve a ser un sitio
     al que apuntar con el dedo.

     En pantalla grande arranca en 1: ahi el plano ya se lee entero y un zoom
     por defecto seria estorbar. */
  const [zoom, setZoom] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 640) ? 1.8 : 1);
  const marcadores = Array.isArray(mapa?.marcadores) ? mapa.marcadores : [];
  const vivos = marcadores.map(m => ({ m, r: resolver(m, datos) })).filter(x => x.r);
  const referencia = marcadores.filter(m => !resolver(m, datos));

  if (!mapa?.imagen_url) return null;

  return (
    <div className="relative rounded-2xl border border-border bg-surface-2 overflow-auto">
      <div className="sticky top-2 left-2 z-10 w-fit flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-sm p-1 ml-2 mt-2">
        <button onClick={() => setZoom(z => Math.max(1, Number((z - 0.4).toFixed(1))))} disabled={zoom <= 1}
          className="w-7 h-7 rounded-full text-white text-lg leading-none flex items-center justify-center disabled:opacity-30" aria-label="Alejar">−</button>
        <span className="text-white text-[11px] tabular-nums px-1 min-w-[34px] text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(4, Number((z + 0.4).toFixed(1))))} disabled={zoom >= 4}
          className="w-7 h-7 rounded-full text-white text-lg leading-none flex items-center justify-center disabled:opacity-30" aria-label="Acercar">+</button>
      </div>
      <div className="flex justify-center min-w-fit p-2 pt-0">
      <div className="relative" style={{ width: `${zoom * 100}%`, maxWidth: zoom > 1 ? 'none' : '100%' }}>
        <img src={mapa.imagen_url} alt="Plano del evento" className="block w-full"
          style={{ maxHeight: zoom > 1 ? 'none' : alto }} />

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
                className={`relative min-w-[46px] h-[46px] px-1.5 rounded-full border-2 border-white shadow-lg text-white
                  font-bold font-display tabular-nums flex items-center justify-center
                  ${activo ? 'ring-4 ring-accent' : 'ring-2 ring-white/60'}
                  ${r.alerta ? 'animate-pulse' : ''}`}
                style={{
                  background: r.color,
                  /* El halo naranja es lo que se ve de lejos: sin mirar el
                     número, el plano ya dice dónde está pasando algo. */
                  boxShadow: r.llamas ? '0 0 0 3px rgba(249,115,22,.55), 0 0 22px 6px rgba(249,115,22,.45)' : undefined,
                }}>
                {r.valor}
                {r.llamas && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow animate-pulse">
                    <IconoLlama />
                  </span>
                )}
              </span>
              <span className="mt-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] whitespace-nowrap max-w-[140px] truncate">
                {r.etiqueta}
              </span>
            </button>
          );
        })}
      </div>
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
      <Ficha titulo={z.nombre} etiqueta={estaEnLlamas(z) ? 'Zona · en llamas' : 'Zona de aforo'}
        color={estaEnLlamas(z) ? '#F97316' : nivel.color} pie={nivel.label} llamas={estaEnLlamas(z)}>
        <Dato k="Dentro ahora" v={`${z.dentro}${z.aforo_max ? ` / ${z.aforo_max}` : ''}`} destacado />
        {z.excedido > 0 && <Dato k="Por encima" v={`+${z.excedido}`} />}
        <Dato k="Entradas" v={z.entradas} />
        <Dato k="Salidas" v={z.salidas} />
        <ProgramaZona z={z} />
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

/* Qué pasa dentro de la zona: lo que hay ahora, lo siguiente y el resto del
   día. Es la mitad que le faltaba al aforo — "40 personas" no dice nada sin
   "40 personas viendo el torneo de FIFA". */
function ProgramaZona({ z }) {
  const agenda = z.agenda || [];
  if (agenda.length === 0) {
    return (
      <p className="col-span-2 text-[11px] text-text-3 pt-1">
        No hay nada programado en esta zona. Se le asignan sub-eventos desde el Calendario, con el campo «Zona del plano».
      </p>
    );
  }
  const pendientes = agenda.filter(s => s.estado !== 'terminado' && s.estado !== 'ahora');
  return (
    <div className="col-span-2 pt-2 border-t border-border space-y-2">
      {(z.ahora || []).length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1">Ahora mismo</p>
          {z.ahora.map(s => (
            <p key={s.id} className="text-sm text-text-1">
              {s.titulo}
              <span className="text-[11px] text-text-3">
                {' '}· {horaCorta(s.inicio)}{s.fin ? `–${horaCorta(s.fin)}` : ''}
                {s.fin_estimado ? ' (fin sin definir)' : ''}
                {s.requiere_inscripcion && s.cupo != null ? ` · ${s.inscritos}/${s.cupo}` : ''}
              </span>
            </p>
          ))}
        </div>
      )}
      {pendientes.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1">
            {(z.ahora || []).length > 0 ? 'Después' : 'Programación'}
          </p>
          <ul className="space-y-0.5">
            {pendientes.slice(0, 4).map(s => (
              <li key={s.id} className="text-xs text-text-2">
                <span className="font-mono text-text-3">{horaCorta(s.inicio)}</span> · {s.titulo}
                {s.requiere_inscripcion && s.libres != null && (
                  <span className={s.libres === 0 ? 'text-danger' : 'text-text-3'}>
                    {s.libres === 0 ? ' · sin cupo' : ` · ${s.libres} cupos`}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {pendientes.length > 4 && <p className="text-[11px] text-text-3 mt-0.5">y {pendientes.length - 4} más</p>}
        </div>
      )}
    </div>
  );
}

const horaCorta = (iso) => iso ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';

function Ficha({ titulo, etiqueta, color, pie, llamas, children }) {
  return (
    <div className={`rounded-2xl border bg-surface/60 p-4 ${llamas ? 'border-orange-500/50' : 'border-border'}`}>
      <div className="flex items-center gap-2 mb-2">
        {llamas
          ? <span className="text-orange-500 flex-shrink-0"><IconoLlama className="w-4 h-4" /></span>
          : <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />}
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
