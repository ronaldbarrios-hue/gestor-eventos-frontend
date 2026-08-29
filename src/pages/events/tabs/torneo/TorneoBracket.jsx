import { useState } from 'react';
import { ProgramarModal, ResultadoModal } from './TorneoPartidoModales.jsx';

/* Eliminación directa: el cuadro por rondas, la tarjeta de cada partido y el
   hueco de cada equipo dentro de ella. PartidoCard y EquipoSlot sólo se usan
   aquí, así que se quedan al lado de quien los pinta. */

export default function BracketView({ evento, torneo, partidos, equipos, soyOwner, onReload }) {
  const [editando, setEditando] = useState(null);
  const [programando, setProgramando] = useState(null);

  if (partidos.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
        <p className="text-sm text-text-3">
          {torneo.formato === 'grupos_eliminacion'
            ? 'El bracket se genera automáticamente al cerrar la fase de grupos.'
            : 'Todavía no se generó el fixture. Ve a "Equipos" y genera el torneo.'}
        </p>
      </div>
    );
  }

  const equipoPorId = new Map(equipos.map(e => [e.id, e]));
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
            {partidos.filter(p => p.ronda === r).sort((a, b) => a.orden - b.orden).map(p => (
              <PartidoCard
                key={p.id}
                partido={p}
                equipoA={p.equipo_a_id ? equipoPorId.get(p.equipo_a_id) : null}
                equipoB={p.equipo_b_id ? equipoPorId.get(p.equipo_b_id) : null}
                puedeEditar={soyOwner}
                onEditar={() => setEditando(p)}
                onProgramar={() => setProgramando(p)}
              />
            ))}
          </div>
        ))}
      </div>

      {editando && (
        <ResultadoModal
          evento={evento} torneo={torneo} partido={editando}
          equipoA={editando.equipo_a_id ? equipoPorId.get(editando.equipo_a_id) : null}
          equipoB={editando.equipo_b_id ? equipoPorId.get(editando.equipo_b_id) : null}
          onClose={() => setEditando(null)}
          onDone={() => { setEditando(null); onReload(); }}
        />
      )}
      {programando && (
        <ProgramarModal
          evento={evento} torneo={torneo} partido={programando}
          equipoA={programando.equipo_a_id ? equipoPorId.get(programando.equipo_a_id) : null}
          equipoB={programando.equipo_b_id ? equipoPorId.get(programando.equipo_b_id) : null}
          onClose={() => setProgramando(null)}
          onDone={() => { setProgramando(null); onReload(); }}
        />
      )}
    </div>
  );
}

function PartidoCard({ partido, equipoA, equipoB, puedeEditar, onEditar, onProgramar }) {
  const puedeJugarse = equipoA && equipoB;
  const ganoA = partido.estado === 'jugado' && partido.marcador_a > partido.marcador_b;
  const ganoB = partido.estado === 'jugado' && partido.marcador_b > partido.marcador_a;
  const programado = partido.fecha_hora && partido.estado === 'pendiente';

  const fechaTxt = partido.fecha_hora
    ? new Date(partido.fecha_hora).toLocaleString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="relative rounded-2xl border border-border-2 overflow-hidden">
      <div
        onClick={() => puedeEditar && puedeJugarse && onEditar()}
        className={`${puedeJugarse && puedeEditar ? 'hover:border-primary/40 cursor-pointer' : 'cursor-default'}`}
      >
        <EquipoSlot equipo={equipoA} marcador={partido.estado === 'jugado' ? partido.marcador_a : null} gano={ganoA} />
        <div className="h-px bg-border" />
        <EquipoSlot equipo={equipoB} marcador={partido.estado === 'jugado' ? partido.marcador_b : null} gano={ganoB} />
      </div>

      {(programado || partido.cancha) && (
        <div className="px-3 py-1.5 bg-surface-2/60 border-t border-border flex items-center gap-1.5 text-[11px] text-text-3">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="truncate">{fechaTxt}{partido.cancha ? ` · ${partido.cancha}` : ''}</span>
        </div>
      )}

      {puedeEditar && puedeJugarse && partido.estado === 'pendiente' && (
        <button
          onClick={(e) => { e.stopPropagation(); onProgramar(); }}
          title="Programar horario / cancha"
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-surface/90 border border-border text-text-3 hover:text-primary-light hover:border-primary/40 flex items-center justify-center"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </button>
      )}
    </div>
  );
}

function EquipoSlot({ equipo, marcador, gano }) {
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

/* ─────────── Modal: Programar horario / cancha ─────────── */
