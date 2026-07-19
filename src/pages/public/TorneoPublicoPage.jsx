import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import GLoader from '../../components/ui/GLoader.jsx';

/* Página pública /explorar/:slug/torneo — vista de SOLO LECTURA del
   bracket/tabla del torneo de un evento, accesible a cualquiera (no
   requiere login ni boleta, a diferencia de la Rueda de Negocios, ya
   que es información pública tipo "marcador deportivo"). */
export default function TorneoPublicoPage() {
  const { slug } = useParams();
  const [data, setData] = useState(undefined); // undefined = cargando
  const [error, setError] = useState('');

  useEffect(() => {
    eventosApi.torneoPublico(slug)
      .then(d => setData(d))
      .catch(e => setError(e.message));
  }, [slug]);

  if (data === undefined && !error) return (
    <section className="px-5 py-20 max-w-2xl mx-auto"><GLoader message="Cargando torneo..." /></section>
  );

  if (error) return (
    <section className="px-5 py-20 max-w-md mx-auto text-center animate-[fadeUp_0.4s_ease_both]">
      <p className="text-sm text-danger mb-4">Evento no encontrado.</p>
      <Link to="/explorar" className="text-sm text-text-2 hover:text-text-1">← Volver a explorar</Link>
    </section>
  );

  if (!data.torneo) {
    return (
      <section className="px-5 py-20 max-w-md mx-auto text-center animate-[fadeUp_0.4s_ease_both]">
        <p className="text-sm text-text-3">Este evento todavía no tiene un torneo configurado.</p>
      </section>
    );
  }

  const { torneo, equipos, partidos } = data;
  const equipoPorId = new Map(equipos.map(e => [e.id, e]));

  return (
    <section className="px-5 py-10 max-w-4xl mx-auto animate-[fadeUp_0.4s_ease_both]">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-1">Torneo</p>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-text-1">{torneo.nombre}</h1>
          <span className="badge badge-blue text-[10px]">{torneo.formato === 'eliminacion' ? 'Eliminación' : 'Liga'}</span>
        </div>
      </div>

      {partidos.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-3">El fixture todavía no se ha generado.</p>
        </div>
      ) : torneo.formato === 'eliminacion' ? (
        <BracketPublico partidos={partidos} equipoPorId={equipoPorId} />
      ) : (
        <LigaPublica partidos={partidos} equipos={equipos} equipoPorId={equipoPorId} />
      )}
    </section>
  );
}

function BracketPublico({ partidos, equipoPorId }) {
  const rondas = [...new Set(partidos.map(p => p.ronda))].sort((a, b) => a - b);
  const nombreRonda = (r, total) => {
    const restantes = total - r + 1;
    if (restantes === 1) return 'Final';
    if (restantes === 2) return 'Semifinal';
    if (restantes === 3) return 'Cuartos de final';
    return `Ronda ${r}`;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-fit">
        {rondas.map(r => (
          <div key={r} className="flex flex-col gap-4 justify-around min-w-[220px]">
            <p className="text-xs uppercase tracking-widest text-text-3 font-semibold text-center">
              {nombreRonda(r, rondas.length)}
            </p>
            {partidos.filter(p => p.ronda === r).sort((a, b) => a.orden - b.orden).map(p => {
              const equipoA = p.equipo_a_id ? equipoPorId.get(p.equipo_a_id) : null;
              const equipoB = p.equipo_b_id ? equipoPorId.get(p.equipo_b_id) : null;
              const ganoA = p.estado === 'jugado' && p.marcador_a > p.marcador_b;
              const ganoB = p.estado === 'jugado' && p.marcador_b > p.marcador_a;
              const fechaTxt = p.fecha_hora
                ? new Date(p.fecha_hora).toLocaleString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : null;
              return (
                <div key={p.id} className="rounded-2xl border border-border-2 overflow-hidden">
                  <EquipoSlotPublico equipo={equipoA} marcador={p.estado === 'jugado' ? p.marcador_a : null} gano={ganoA} />
                  <div className="h-px bg-border" />
                  <EquipoSlotPublico equipo={equipoB} marcador={p.estado === 'jugado' ? p.marcador_b : null} gano={ganoB} />
                  {(fechaTxt || p.cancha) && p.estado === 'pendiente' && (
                    <div className="px-3 py-1.5 bg-surface-2/60 border-t border-border text-[11px] text-text-3 truncate">
                      📅 {fechaTxt}{p.cancha ? ` · ${p.cancha}` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function EquipoSlotPublico({ equipo, marcador, gano }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 ${gano ? 'bg-success/5' : ''}`}>
      <div className="w-6 h-6 rounded-md overflow-hidden bg-surface-2 flex items-center justify-center text-[10px] font-semibold text-text-2 flex-shrink-0">
        {equipo?.foto_url ? <img src={equipo.foto_url} alt="" className="w-full h-full object-cover" /> : (equipo?.nombre?.[0]?.toUpperCase() || '?')}
      </div>
      <span className={`text-sm flex-1 truncate ${gano ? 'font-semibold text-text-1' : 'text-text-2'}`}>
        {equipo?.nombre || 'Por definir'}
      </span>
      {marcador != null && (
        <span className={`text-sm tabular-nums font-bold ${gano ? 'text-success' : 'text-text-3'}`}>{marcador}</span>
      )}
    </div>
  );
}

function LigaPublica({ partidos, equipos, equipoPorId }) {
  const tabla = new Map(equipos.map(e => [e.id, {
    ...e, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, puntos: 0,
  }]));

  for (const p of partidos) {
    if (p.estado !== 'jugado') continue;
    const a = tabla.get(p.equipo_a_id);
    const b = tabla.get(p.equipo_b_id);
    if (!a || !b) continue;
    a.pj++; b.pj++;
    a.gf += p.marcador_a; a.gc += p.marcador_b;
    b.gf += p.marcador_b; b.gc += p.marcador_a;
    if (p.marcador_a > p.marcador_b) { a.pg++; a.puntos += 3; b.pp++; }
    else if (p.marcador_a < p.marcador_b) { b.pg++; b.puntos += 3; a.pp++; }
    else { a.pe++; b.pe++; a.puntos += 1; b.puntos += 1; }
  }
  const posiciones = [...tabla.values()].sort((x, y) => y.puntos - x.puntos || (y.gf - y.gc) - (x.gf - x.gc));

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="th text-left">#</th>
                <th className="th text-left">Equipo</th>
                <th className="th text-center">PJ</th>
                <th className="th text-center">PG</th>
                <th className="th text-center">PE</th>
                <th className="th text-center">PP</th>
                <th className="th text-center">GF</th>
                <th className="th text-center">GC</th>
                <th className="th text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {posiciones.map((eq, i) => (
                <tr key={eq.id} className="tr">
                  <td className="td tabular-nums">{i + 1}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md overflow-hidden bg-surface-2 flex-shrink-0">
                        {eq.foto_url && <img src={eq.foto_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <span className="font-medium text-text-1 truncate">{eq.nombre}</span>
                    </div>
                  </td>
                  <td className="td text-center tabular-nums">{eq.pj}</td>
                  <td className="td text-center tabular-nums">{eq.pg}</td>
                  <td className="td text-center tabular-nums">{eq.pe}</td>
                  <td className="td text-center tabular-nums">{eq.pp}</td>
                  <td className="td text-center tabular-nums">{eq.gf}</td>
                  <td className="td text-center tabular-nums">{eq.gc}</td>
                  <td className="td text-center tabular-nums font-bold text-text-1">{eq.puntos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-3">Partidos</p>
        <div className="rounded-3xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">
          {partidos.map(p => {
            const eqA = equipoPorId.get(p.equipo_a_id);
            const eqB = equipoPorId.get(p.equipo_b_id);
            const fechaTxt = p.fecha_hora
              ? new Date(p.fecha_hora).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
              : null;
            return (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-1 truncate">{eqA?.nombre} <span className="text-text-3">vs</span> {eqB?.nombre}</p>
                  {(fechaTxt || p.cancha) && p.estado === 'pendiente' && (
                    <p className="text-[11px] text-text-3 mt-0.5">📅 {fechaTxt}{p.cancha ? ` · ${p.cancha}` : ''}</p>
                  )}
                </div>
                {p.estado === 'jugado' ? (
                  <span className="text-sm font-bold tabular-nums text-text-1 flex-shrink-0">{p.marcador_a} - {p.marcador_b}</span>
                ) : (
                  <span className="text-xs text-warning flex-shrink-0">Pendiente</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
