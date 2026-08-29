import { useEffect, useState } from 'react';
import Icono from '../../../../components/ui/Iconos.jsx';
import { torneosApi } from '../../../../api/torneos.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import { ProgramarModal, ResultadoModal } from './TorneoPartidoModales.jsx';

/* Liga: todos contra todos, con su tabla de posiciones. La tabla se exporta
   porque los grupos son varias ligas pequeñas y pintan la misma. */

export default function LigaView({ evento, torneo, partidos, equipos, soyOwner, onReload }) {
  const [posiciones, setPosiciones] = useState(null);
  const [editando, setEditando] = useState(null);
  const [programando, setProgramando] = useState(null);
  const { error: toastErr } = useToast();

  const cargarPosiciones = () => {
    torneosApi.posiciones(evento.id, torneo.id)
      .then(d => setPosiciones(d.posiciones || []))
      .catch(e => toastErr(e.response?.data?.error || e.message));
  };
  useEffect(() => { cargarPosiciones(); /* eslint-disable-next-line */ }, [partidos]);

  if (partidos.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
        <p className="text-sm text-text-3">Todavía no se generó el fixture. Ve a "Equipos" y genera el torneo.</p>
      </div>
    );
  }

  const equipoPorId = new Map(equipos.map(e => [e.id, e]));

  return (
    <div className="space-y-6">
      <TablaPosiciones posiciones={posiciones || []} />

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
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/30 transition-colors">
                <button
                  onClick={() => soyOwner && setEditando(p)}
                  disabled={!soyOwner}
                  className="flex-1 text-left disabled:cursor-default min-w-0"
                >
                  <p className="text-sm text-text-1 truncate">{eqA?.nombre} <span className="text-text-3">vs</span> {eqB?.nombre}</p>
                  {(fechaTxt || p.cancha) && (
                    <p className="text-[11px] text-text-3 mt-0.5"><Icono nombre="calendario" className="w-3 h-3 inline-block align-[-2px]" /> {fechaTxt}{p.cancha ? ` · ${p.cancha}` : ''}</p>
                  )}
                </button>
                {p.estado === 'jugado' ? (
                  <span className="text-sm font-bold tabular-nums text-text-1 flex-shrink-0">{p.marcador_a} - {p.marcador_b}</span>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-warning">Pendiente</span>
                    {soyOwner && (
                      <button onClick={() => setProgramando(p)} title="Programar horario"
                        className="w-7 h-7 rounded-md bg-surface-2 border border-border text-text-3 hover:text-primary-light hover:border-primary/40 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {editando && (
        <ResultadoModal
          evento={evento} torneo={torneo} partido={editando}
          equipoA={equipoPorId.get(editando.equipo_a_id)}
          equipoB={equipoPorId.get(editando.equipo_b_id)}
          onClose={() => setEditando(null)}
          onDone={() => { setEditando(null); onReload(); }}
        />
      )}
      {programando && (
        <ProgramarModal
          evento={evento} torneo={torneo} partido={programando}
          equipoA={equipoPorId.get(programando.equipo_a_id)}
          equipoB={equipoPorId.get(programando.equipo_b_id)}
          onClose={() => setProgramando(null)}
          onDone={() => { setProgramando(null); onReload(); }}
        />
      )}
    </div>
  );
}

export function TablaPosiciones({ posiciones }) {
  return (
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
  );
}

/* ─────────── Vista Grupos (formato grupos_eliminacion, fase 'grupos') ─────────── */
