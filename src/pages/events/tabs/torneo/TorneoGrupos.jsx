import { useEffect, useState } from 'react';
import Icono from '../../../../components/ui/Iconos.jsx';
import { torneosApi } from '../../../../api/torneos.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../../components/ui/Confirm.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';
import { ProgramarModal, ResultadoModal } from './TorneoPartidoModales.jsx';
import { TablaPosiciones } from './TorneoLiga.jsx';

/* Grupos + eliminación: cada grupo es una liga pequeña, así que reutiliza la
   tabla de posiciones de la liga en vez de tener su propia copia. */

export default function GruposView({ evento, torneo, partidos, equipos, soyOwner, onReload }) {
  const [porGrupo, setPorGrupo] = useState(null);
  const [editando, setEditando] = useState(null);
  const [programando, setProgramando] = useState(null);
  const [cerrando, setCerrando] = useState(false);
  const { success, error: toastErr } = useToast();

  const cargarPosiciones = () => {
    torneosApi.posiciones(evento.id, torneo.id)
      .then(d => setPorGrupo(d.grupos || []))
      .catch(e => toastErr(e.response?.data?.error || e.message));
  };
  useEffect(() => { cargarPosiciones(); /* eslint-disable-next-line */ }, [partidos]);

  const equipoPorId = new Map(equipos.map(e => [e.id, e]));
  const todosJugados = partidos.length > 0 && partidos.every(p => p.estado === 'jugado');

  const cerrarGrupos = async () => {
    if (!(await confirmDialog({ message: '¿Cerrar la fase de grupos y generar el bracket de eliminación con los clasificados? No se puede deshacer.' }))) return;
    setCerrando(true);
    try {
      const r = await torneosApi.cerrarGrupos(evento.id, torneo.id);
      success(`¡Fase de grupos cerrada! ${r.clasificados} equipos clasificaron a la eliminatoria.`);
      onReload();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setCerrando(false);
    }
  };

  if (torneo.fase_actual === 'eliminacion') {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-success/10 border border-success/25 px-4 py-3 text-sm text-text-2">
          La fase de grupos ya se cerró. Los clasificados están jugando la eliminatoria — revisa la pestaña "Bracket".
        </div>
        {(porGrupo || []).map(g => (
          <div key={g.grupo}>
            <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-2">Grupo {g.grupo} (histórico)</p>
            <TablaPosiciones posiciones={g.posiciones} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {soyOwner && (
        <div className={`rounded-2xl border px-4 py-3.5 flex items-center justify-between gap-3 flex-wrap ${todosJugados ? 'border-primary/30 bg-primary/5' : 'border-border bg-surface/40'}`}>
          <p className="text-sm text-text-2">
            {todosJugados
              ? '¡Todos los partidos de grupo están jugados! Ya puedes cerrar esta fase y generar el bracket.'
              : `Faltan ${partidos.filter(p => p.estado !== 'jugado').length} partido(s) de grupo por jugar.`}
          </p>
          <button onClick={cerrarGrupos} disabled={!todosJugados || cerrando} className="btn-primary btn-sm whitespace-nowrap disabled:opacity-50">
            {cerrando ? <><Spinner size="sm" /> Cerrando...</> : 'Cerrar fase de grupos'}
          </button>
        </div>
      )}

      {(porGrupo || []).map(g => {
        const partidosGrupo = partidos.filter(p => p.grupo === g.grupo);
        return (
          <div key={g.grupo} className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">Grupo {g.grupo}</p>
            <TablaPosiciones posiciones={g.posiciones} />
            <div className="rounded-2xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">
              {partidosGrupo.map(p => {
                const eqA = equipoPorId.get(p.equipo_a_id);
                const eqB = equipoPorId.get(p.equipo_b_id);
                const fechaTxt = p.fecha_hora
                  ? new Date(p.fecha_hora).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : null;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => soyOwner && setEditando(p)} disabled={!soyOwner}
                      className="flex-1 text-left disabled:cursor-default min-w-0">
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
        );
      })}

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
