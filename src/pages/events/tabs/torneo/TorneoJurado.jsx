import { useEffect, useState, useCallback } from 'react';
import Icono from '../../../../components/ui/Iconos.jsx';
import { torneoJuradoApi } from '../../../../api/torneoJurado.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../../components/ui/Confirm.jsx';
import GLoader from '../../../../components/ui/GLoader.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';

/* Puntaje por jurado ("show de talento"): todos participan, un jurado
   califica con puntos, nadie se enfrenta a nadie. Tres vistas:

   · Calificar — la hoja de notas del jurado asignado, para la ronda abierta.
   · Tabla     — el ranking de la ronda (o de una ronda pasada, si eres owner).
   · Jurados   — quién califica este torneo (gestión, sólo para quien organiza).

   "Jurados" se muestra sólo a `soyOwner`, igual que el resto de acciones de
   gestión en este módulo (Equipos, Borrar torneo): el backend en realidad
   también deja a cualquiera con `gestionar_torneo`/`editar_evento`, pero
   `TorneoTab` no recibe hoy la lista de permisos del miembro — sólo
   `soyOwner` — así que se sigue la misma convención que ya usa el resto de
   este módulo en vez de inventar una nueva a medias. */

export default function TorneoJurado({ evento, torneo, soyOwner, onReload }) {
  const [sub, setSub] = useState('calificar');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 w-fit flex-wrap">
        <button onClick={() => setSub('calificar')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'calificar' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
          Calificar
        </button>
        <button onClick={() => setSub('tabla')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'tabla' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
          Tabla
        </button>
        {soyOwner && (
          <button onClick={() => setSub('jurados')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'jurados' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            Jurados
          </button>
        )}
      </div>

      {sub === 'calificar' && <CalificarView evento={evento} torneo={torneo} />}
      {sub === 'tabla' && <TablaJuradoView evento={evento} torneo={torneo} soyOwner={soyOwner} onReload={onReload} />}
      {sub === 'jurados' && soyOwner && <JuradosView evento={evento} torneo={torneo} />}
    </div>
  );
}

/* ─────────── Calificar ─────────── */

function CalificarView({ evento, torneo }) {
  const [estado, setEstado] = useState('cargando'); // cargando | no-jurado | listo
  const [data, setData] = useState(null); // { ronda, participantes, criterios, mis_calificaciones }
  const [notas, setNotas] = useState({}); // { [equipoId]: { [criterioId]: { puntaje, comentario } } }
  const [guardando, setGuardando] = useState({}); // { [equipoId]: bool }
  const { success, error: toastErr } = useToast();

  const cargar = useCallback(() => {
    setEstado('cargando');
    torneoJuradoApi.calificar(evento.id, torneo.id)
      .then(d => {
        setData(d);
        const inicial = {};
        for (const c of (d.mis_calificaciones || [])) {
          if (!inicial[c.equipo_id]) inicial[c.equipo_id] = {};
          inicial[c.equipo_id][c.criterio_id] = { puntaje: String(c.puntaje), comentario: c.comentario || '' };
        }
        setNotas(inicial);
        setEstado('listo');
      })
      .catch(e => {
        if (e.status === 403) setEstado('no-jurado');
        else { toastErr(e.response?.data?.error || e.message); setEstado('listo'); setData(null); }
      });
  }, [evento.id, torneo.id]); // eslint-disable-line

  useEffect(() => { cargar(); }, [cargar]);

  if (estado === 'cargando') return <GLoader message="Cargando hoja de calificación..." />;

  if (estado === 'no-jurado') {
    return (
      <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
        <p className="text-sm text-text-3">No eres jurado de este torneo. Pídele a quien organiza que te agregue desde la pestaña "Jurados".</p>
      </div>
    );
  }

  if (!data || !data.ronda) {
    return (
      <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
        <p className="text-sm text-text-3">
          {torneo.estado === 'armando'
            ? 'Todavía no inició el torneo — no hay ninguna ronda abierta para calificar.'
            : 'No hay ninguna ronda abierta ahora mismo. Si el torneo ya terminó, revisa la Tabla.'}
        </p>
      </div>
    );
  }

  const { ronda, participantes, criterios } = data;

  const setNota = (equipoId, criterioId, campo, valor) => setNotas(n => ({
    ...n,
    [equipoId]: { ...n[equipoId], [criterioId]: { ...n[equipoId]?.[criterioId], [campo]: valor } },
  }));

  const completa = (equipoId) => criterios.every(c => {
    const v = notas[equipoId]?.[c.id]?.puntaje;
    return v !== undefined && v !== '';
  });

  const guardar = async (equipoId) => {
    const propias = notas[equipoId] || {};
    const faltaOInvalida = criterios.find(c => {
      const puntaje = Number(propias[c.id]?.puntaje);
      return propias[c.id]?.puntaje === undefined || propias[c.id]?.puntaje === '' || !Number.isFinite(puntaje) || puntaje < 0 || puntaje > Number(c.puntaje_maximo);
    });
    if (faltaOInvalida) { toastErr(`"${faltaOInvalida.nombre}": el puntaje debe estar entre 0 y ${faltaOInvalida.puntaje_maximo}.`); return; }

    setGuardando(g => ({ ...g, [equipoId]: true }));
    try {
      await torneoJuradoApi.guardarNotas(evento.id, torneo.id, {
        ronda_id: ronda.id,
        equipo_id: equipoId,
        notas: criterios.map(c => ({
          criterio_id: c.id,
          puntaje: Number(propias[c.id].puntaje),
          comentario: propias[c.id]?.comentario?.trim() || null,
        })),
      });
      success('Calificación guardada.');
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setGuardando(g => ({ ...g, [equipoId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3 flex items-center gap-2">
        <span className="badge badge-blue text-[10px]">{ronda.nombre}</span>
        <p className="text-xs text-text-3">Califica a cada participante en todos los criterios y guarda.</p>
      </div>

      {participantes.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-3">Esta ronda todavía no tiene participantes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {participantes.map(eq => (
            <div key={eq.id} className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {eq.foto_url ? <img src={eq.foto_url} alt="" className="w-full h-full object-cover" /> : eq.nombre?.[0]?.toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-text-1 flex-1 truncate">{eq.nombre}</p>
                {completa(eq.id) && (
                  <span className="text-success flex items-center gap-1 text-[11px] flex-shrink-0">
                    <Icono nombre="hecho" className="w-3.5 h-3.5" /> Calificado
                  </span>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {criterios.map(c => (
                  <div key={c.id} className="field">
                    <label className="label text-xs">{c.nombre} <span className="lowercase font-normal text-text-3">(0–{c.puntaje_maximo})</span></label>
                    <input type="number" min="0" max={c.puntaje_maximo}
                      value={notas[eq.id]?.[c.id]?.puntaje ?? ''}
                      onChange={e => setNota(eq.id, c.id, 'puntaje', e.target.value)}
                      className="input rounded-xl py-2" />
                  </div>
                ))}
              </div>
              <div className="field">
                <label className="label text-xs">Comentario <span className="lowercase font-normal text-text-3">(opcional)</span></label>
                <input value={criterios[0] ? (notas[eq.id]?.[criterios[0].id]?.comentario ?? '') : ''}
                  onChange={e => criterios.forEach(c => setNota(eq.id, c.id, 'comentario', e.target.value))}
                  className="input rounded-xl py-2" placeholder="Para el equipo organizador, no se hace público." />
              </div>
              <button onClick={() => guardar(eq.id)} disabled={guardando[eq.id]}
                className="btn-primary btn-sm flex items-center justify-center gap-2">
                {guardando[eq.id] ? <><Spinner size="sm" /> Guardando...</> : 'Guardar calificación'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── Tabla ─────────── */

function TablaJuradoView({ evento, torneo, soyOwner, onReload }) {
  const [rondas, setRondas] = useState(null);
  const [rondaId, setRondaId] = useState(null);
  const [data, setData] = useState(undefined); // undefined = cargando
  const [cerrando, setCerrando] = useState(false);
  const { success, error: toastErr } = useToast();

  /* El selector de rondas pasadas exige `gestionar_torneo`/`editar_evento`
     en el backend (GET /rondas), así que sólo se pide para soyOwner —
     misma convención que el resto del módulo. Sin él, la tabla igual se ve:
     el backend, sin `ronda_id`, ya devuelve la ronda abierta o la última. */
  useEffect(() => {
    if (soyOwner && torneo.modo_rondas === 'eliminatoria') {
      torneoJuradoApi.rondas(evento.id, torneo.id)
        .then(d => setRondas(d.rondas || []))
        .catch(() => setRondas([]));
    }
  }, [evento.id, torneo.id, soyOwner, torneo.modo_rondas]);

  const cargar = useCallback(() => {
    setData(undefined);
    torneoJuradoApi.tabla(evento.id, torneo.id, rondaId)
      .then(d => { setData(d); if (!rondaId && d.ronda) setRondaId(d.ronda.id); })
      .catch(e => toastErr(e.response?.data?.error || e.message));
  }, [evento.id, torneo.id, rondaId]); // eslint-disable-line

  useEffect(() => { cargar(); }, [cargar]);

  const cerrarRonda = async () => {
    if (!(await confirmDialog({ message: `¿Cerrar "${data.ronda.nombre}"? Ya no se podrá calificar en esta ronda.` }))) return;
    setCerrando(true);
    try {
      const r = await torneoJuradoApi.cerrarRonda(evento.id, torneo.id);
      success(r.final ? '¡Torneo finalizado! Ya está el ranking definitivo.' : `Ronda cerrada. Avanzan ${r.clasificados} equipos a la siguiente.`);
      setRondaId(null);
      setRondas(null);
      cargar();
      onReload?.();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setCerrando(false);
    }
  };

  if (data === undefined) return <GLoader message="Cargando tabla..." />;

  if (!data.ronda) {
    return (
      <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
        <p className="text-sm text-text-3">Todavía no hay ronda con participantes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {rondas && rondas.length > 1 ? rondas.map(r => (
            <button key={r.id} onClick={() => setRondaId(r.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                ${rondaId === r.id ? 'border-primary bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
              {r.nombre}{r.estado === 'abierta' && <span className="ml-1 text-success">●</span>}
            </button>
          )) : (
            <span className="badge badge-blue text-[10px]">{data.ronda.nombre}</span>
          )}
        </div>
        {soyOwner && data.ronda.estado === 'abierta' && torneo.modo_rondas === 'eliminatoria' && (
          <button onClick={cerrarRonda} disabled={cerrando} className="btn-secondary btn-sm">
            {cerrando ? 'Cerrando...' : `Cerrar "${data.ronda.nombre}"`}
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="th text-left">#</th>
                <th className="th text-left">Participante</th>
                {data.tabla[0]?.por_criterio?.map(c => (
                  <th key={c.criterio_id} className="th text-center">{c.nombre}</th>
                ))}
                <th className="th text-center">Jurados</th>
                <th className="th text-center">Puntaje</th>
              </tr>
            </thead>
            <tbody>
              {data.tabla.map((fila, i) => (
                <tr key={fila.equipo.id} className="tr">
                  <td className="td tabular-nums">{i + 1}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md overflow-hidden bg-surface-2 flex-shrink-0">
                        {fila.equipo.foto_url && <img src={fila.equipo.foto_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <span className="font-medium text-text-1 truncate">{fila.equipo.nombre}</span>
                    </div>
                  </td>
                  {fila.por_criterio.map(c => (
                    <td key={c.criterio_id} className="td text-center tabular-nums">{c.promedio == null ? '—' : c.promedio.toFixed(1)}</td>
                  ))}
                  <td className="td text-center tabular-nums text-text-3">{fila.jurados_calificaron}/{fila.jurados_total}</td>
                  <td className="td text-center tabular-nums font-bold text-text-1">{fila.puntaje.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Jurados ─────────── */

function JuradosView({ evento, torneo }) {
  const [data, setData] = useState(undefined); // undefined = cargando
  const [elegidoId, setElegidoId] = useState('');
  const [agregando, setAgregando] = useState(false);
  const { success, error: toastErr } = useToast();

  const cargar = useCallback(() => {
    torneoJuradoApi.jurados(evento.id, torneo.id)
      .then(setData)
      .catch(e => toastErr(e.response?.data?.error || e.message));
  }, [evento.id, torneo.id]); // eslint-disable-line

  useEffect(() => { cargar(); }, [cargar]);

  const agregar = async () => {
    if (!elegidoId) return;
    setAgregando(true);
    try {
      await torneoJuradoApi.agregarJurado(evento.id, torneo.id, elegidoId);
      success('Jurado agregado.');
      setElegidoId('');
      cargar();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setAgregando(false);
    }
  };

  const quitar = async (userId, nombre) => {
    if (!(await confirmDialog({ message: `¿Quitar a "${nombre}" como jurado de este torneo?`, danger: true }))) return;
    try {
      await torneoJuradoApi.quitarJurado(evento.id, torneo.id, userId);
      success('Jurado quitado.');
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  if (data === undefined) return <GLoader message="Cargando jurados..." />;

  const { jurados, elegibles } = data;

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-3 leading-relaxed">
        Quien esté aquí puede calificar en la pestaña "Calificar", sin necesitar ningún otro permiso sobre el evento.
      </p>

      {jurados.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-3">Este torneo todavía no tiene jurado asignado.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">
          {jurados.map(j => (
            <div key={j.user_id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {j.profile?.avatar_url ? <img src={j.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : j.profile?.nombre?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-1 truncate">{j.profile?.nombre || 'Sin nombre'}</p>
                <p className="text-[11px] text-text-3 truncate">{j.profile?.email}</p>
              </div>
              <button onClick={() => quitar(j.user_id, j.profile?.nombre || 'este jurado')} aria-label="Quitar"
                className="w-8 h-8 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {elegibles.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <select value={elegidoId} onChange={e => setElegidoId(e.target.value)} className="input bg-surface-2 rounded-2xl py-2.5 flex-1 min-w-[12rem]">
            <option value="">— Elegir miembro del equipo —</option>
            {elegibles.map(m => (
              <option key={m.user_id} value={m.user_id}>{m.profile?.nombre || m.profile?.email || m.user_id}</option>
            ))}
          </select>
          <button onClick={agregar} disabled={!elegidoId || agregando} className="btn-primary btn-sm">
            {agregando ? 'Agregando...' : '+ Agregar jurado'}
          </button>
        </div>
      )}
      {elegibles.length === 0 && jurados.length > 0 && (
        <p className="text-[11px] text-text-3">Todos los miembros activos del equipo del evento ya son jurado de este torneo.</p>
      )}
    </div>
  );
}
