import { useEffect, useState } from 'react';
import { torneosApi } from '../../../api/torneos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';

/* Tab Torneo — categoría Deportes. Un torneo por evento.
   Formatos: eliminación directa (bracket visual) o liga (tabla de posiciones). */

export default function TorneoTab({ evento, soyOwner }) {
  const [torneo, setTorneo] = useState(undefined); // undefined = cargando, null = no existe
  const [equipos, setEquipos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const { error: toastErr } = useToast();

  const cargar = () => {
    torneosApi.get(evento.id)
      .then(d => { setTorneo(d.torneo); setEquipos(d.equipos || []); setPartidos(d.partidos || []); })
      .catch(e => toastErr(e.response?.data?.error || e.message));
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [evento.id]);

  if (torneo === undefined) return <GLoader message="Cargando torneo..." />;

  if (!torneo) {
    return soyOwner
      ? <CrearTorneo eventoId={evento.id} onCreado={cargar} />
      : (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-3">El organizador todavía no configuró el torneo de este evento.</p>
        </div>
      );
  }

  return (
    <TorneoView
      evento={evento}
      torneo={torneo}
      equipos={equipos}
      partidos={partidos}
      soyOwner={soyOwner}
      onReload={cargar}
    />
  );
}

function CrearTorneo({ eventoId, onCreado }) {
  const [nombre, setNombre] = useState('');
  const [formato, setFormato] = useState('eliminacion');
  const [working, setWorking] = useState(false);
  const { error: toastErr } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { toastErr('El nombre del torneo es requerido.'); return; }
    setWorking(true);
    try {
      await torneosApi.crear(eventoId, { nombre: nombre.trim(), formato });
      onCreado();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-3xl border border-border bg-surface/40 p-6">
        <h2 className="text-xl font-bold font-display text-text-1 tracking-tight mb-1">Configura tu torneo</h2>
        <p className="text-sm text-text-3 mb-6 leading-relaxed">
          Elige un formato para organizar los partidos. Una vez elijas, podrás agregar los equipos participantes.
        </p>
        <form onSubmit={submit} className="space-y-5">
          <div className="field">
            <label className="label">Nombre del torneo</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              className="input rounded-2xl py-3" placeholder="Ej. Copa GESTEK 2026" required autoFocus />
          </div>

          <div>
            <label className="label mb-2">Formato</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setFormato('eliminacion')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${formato === 'eliminacion' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
                <p className="text-sm font-semibold text-text-1">Eliminación directa</p>
                <p className="text-xs text-text-3 mt-1 leading-relaxed">Llaves tipo bracket. Quien pierde, queda fuera.</p>
              </button>
              <button type="button" onClick={() => setFormato('liga')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${formato === 'liga' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
                <p className="text-sm font-semibold text-text-1">Liga / todos contra todos</p>
                <p className="text-xs text-text-3 mt-1 leading-relaxed">Tabla de posiciones por puntos.</p>
              </button>
            </div>
          </div>

          <button type="submit" disabled={working}
            className="w-full py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
            {working ? <><Spinner size="sm" /> Creando...</> : 'Crear torneo'}
          </button>
        </form>
      </div>
    </div>
  );
}

function TorneoView({ evento, torneo, equipos, partidos, soyOwner, onReload }) {
  const [sub, setSub] = useState('equipos'); // equipos | bracket/liga
  const vistaResultados = torneo.formato === 'eliminacion' ? 'bracket' : 'liga';

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">{torneo.nombre}</h2>
            <span className="badge badge-blue text-[10px]">{torneo.formato === 'eliminacion' ? 'Eliminación' : 'Liga'}</span>
          </div>
          <p className="text-sm text-text-2 mt-1">
            {torneo.estado === 'armando' ? 'Agregando equipos — todavía no inició' : 'Torneo en curso'}
          </p>
        </div>
        {soyOwner && torneo.estado === 'armando' && (
          <BorrarTorneoBtn evento={evento} torneo={torneo} onDone={onReload} />
        )}
      </div>

      <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 w-fit">
        <button onClick={() => setSub('equipos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'equipos' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
          Equipos
        </button>
        <button onClick={() => setSub(vistaResultados)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === vistaResultados ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
          {torneo.formato === 'eliminacion' ? 'Bracket' : 'Tabla de posiciones'}
        </button>
      </div>

      {sub === 'equipos' && (
        <EquiposView evento={evento} torneo={torneo} equipos={equipos} soyOwner={soyOwner} onReload={onReload} />
      )}
      {sub === 'bracket' && (
        <BracketView evento={evento} torneo={torneo} partidos={partidos} equipos={equipos} soyOwner={soyOwner} onReload={onReload} />
      )}
      {sub === 'liga' && (
        <LigaView evento={evento} torneo={torneo} partidos={partidos} equipos={equipos} soyOwner={soyOwner} onReload={onReload} />
      )}
    </div>
  );
}

function BorrarTorneoBtn({ evento, torneo, onDone }) {
  const { success, error: toastErr } = useToast();
  const borrar = async () => {
    if (!(await confirmDialog({ message: `¿Borrar el torneo "${torneo.nombre}" completo? Se pierden equipos y partidos.`, danger: true }))) return;
    try {
      await torneosApi.borrar(evento.id, torneo.id);
      success('Torneo borrado.');
      onDone();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };
  return <button onClick={borrar} className="btn-ghost btn-sm text-danger/80 hover:text-danger">Borrar torneo</button>;
}

/* ─────────── Vista Equipos ─────────── */
function EquiposView({ evento, torneo, equipos, soyOwner, onReload }) {
  const [formOpen, setFormOpen] = useState(false);
  const { success, error: toastErr } = useToast();

  const puedeEditar = soyOwner && torneo.estado === 'armando';

  const borrarEquipo = async (eq) => {
    if (!(await confirmDialog({ message: `¿Quitar a "${eq.nombre}" del torneo?`, danger: true }))) return;
    try {
      await torneosApi.borrarEquipo(evento.id, torneo.id, eq.id);
      success('Equipo eliminado.');
      onReload();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const generar = async () => {
    if (equipos.length < 2) { toastErr('Se necesitan al menos 2 equipos.'); return; }
    if (!(await confirmDialog({ message: '¿Generar el fixture? Después de esto no podrás agregar ni quitar equipos.' }))) return;
    try {
      await torneosApi.generarFixture(evento.id, torneo.id);
      success('¡Fixture generado!');
      onReload();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  return (
    <div className="space-y-4">
      {puedeEditar && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button onClick={() => setFormOpen(true)} className="btn-gradient btn-sm">+ Agregar equipo</button>
          {equipos.length >= 2 && (
            <button onClick={generar} className="btn-primary btn-sm">
              🏆 Generar fixture ({equipos.length} equipos)
            </button>
          )}
        </div>
      )}

      {equipos.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-3">Aún no hay equipos registrados.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {equipos.map(eq => (
            <div key={eq.id} className="rounded-2xl border border-border bg-surface/40 p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold flex-shrink-0">
                {eq.foto_url ? <img src={eq.foto_url} alt="" className="w-full h-full object-cover" /> : eq.nombre?.[0]?.toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-text-1 flex-1 truncate">{eq.nombre}</p>
              {puedeEditar && (
                <button onClick={() => borrarEquipo(eq)} aria-label="Quitar"
                  className="w-8 h-8 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <NuevoEquipoModal
          evento={evento} torneo={torneo}
          onClose={() => setFormOpen(false)}
          onDone={() => { setFormOpen(false); onReload(); }}
        />
      )}
    </div>
  );
}

function NuevoEquipoModal({ evento, torneo, onClose, onDone }) {
  const [nombre, setNombre] = useState('');
  const [foto, setFoto] = useState('');
  const [working, setWorking] = useState(false);
  const { error: toastErr } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { toastErr('El nombre es requerido.'); return; }
    setWorking(true);
    try {
      await torneosApi.crearEquipo(evento.id, torneo.id, { nombre: nombre.trim(), foto_url: foto || null });
      onDone();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[88vh] overflow-y-auto animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-surface px-6 py-5 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold font-display tracking-tight text-text-1">Nuevo equipo</h2>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="field">
            <label className="label">Nombre del equipo</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} className="input rounded-2xl py-3" placeholder="Ej. Los Tigres" required autoFocus />
          </div>
          <div className="field">
            <label className="label">Foto / logo <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
            <FotoEquipoLazy value={foto} onChange={setFoto} eventoId={evento.id} torneoId={torneo.id} />
            <p className="text-xs text-text-3 mt-1.5">
              Tip: si tu formulario de compra pide "Foto" al comprador, puedes descargarla del detalle del asistente y subirla aquí.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-medium text-text-1 border border-border-2 hover:bg-surface-2">Cancelar</button>
            <button type="submit" disabled={working} className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
              {working ? <><Spinner size="sm" /> Creando...</> : 'Crear equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Reutiliza el mismo uploader que ya usamos para fotos del formulario de
   compra (bucket "form-uploads") — no requiere sesión, mismo mecanismo. */
function FotoEquipoLazy({ value, onChange, eventoId, torneoId }) {
  const [Comp, setComp] = useState(null);
  useEffect(() => {
    import('../../../components/ui/FormPhotoUploader.jsx').then(m => setComp(() => m.default));
  }, []);
  if (!Comp) return <div className="h-40 rounded-2xl bg-surface-2/40 animate-pulse" />;
  return <Comp value={value} onChange={onChange} eventoId={eventoId} campoId={`torneo-${torneoId}`} />;
}

/* ─────────── Vista Bracket (eliminación) ─────────── */
function BracketView({ evento, torneo, partidos, equipos, soyOwner, onReload }) {
  const [editando, setEditando] = useState(null); // partido siendo editado

  if (partidos.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
        <p className="text-sm text-text-3">Todavía no se generó el fixture. Ve a "Equipos" y genera el torneo.</p>
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
    </div>
  );
}

function PartidoCard({ partido, equipoA, equipoB, puedeEditar, onEditar }) {
  const puedeJugarse = equipoA && equipoB;
  const ganoA = partido.estado === 'jugado' && partido.marcador_a > partido.marcador_b;
  const ganoB = partido.estado === 'jugado' && partido.marcador_b > partido.marcador_a;

  return (
    <button
      onClick={() => puedeEditar && puedeJugarse && onEditar()}
      disabled={!puedeEditar || !puedeJugarse}
      className={`rounded-2xl border overflow-hidden text-left transition-all
        ${puedeJugarse && puedeEditar ? 'border-border-2 hover:border-primary/40 cursor-pointer' : 'border-border cursor-default'}`}
    >
      <EquipoSlot equipo={equipoA} marcador={partido.estado === 'jugado' ? partido.marcador_a : null} gano={ganoA} />
      <div className="h-px bg-border" />
      <EquipoSlot equipo={equipoB} marcador={partido.estado === 'jugado' ? partido.marcador_b : null} gano={ganoB} />
    </button>
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

function ResultadoModal({ evento, torneo, partido, equipoA, equipoB, onClose, onDone }) {
  const [marcadorA, setMarcadorA] = useState(partido.marcador_a ?? '');
  const [marcadorB, setMarcadorB] = useState(partido.marcador_b ?? '');
  const [cancha, setCancha] = useState(partido.cancha || '');
  const [working, setWorking] = useState(false);
  const { success, error: toastErr } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (marcadorA === '' || marcadorB === '') { toastErr('Completa ambos marcadores.'); return; }
    setWorking(true);
    try {
      await torneosApi.registrarResultado(evento.id, torneo.id, partido.id, {
        marcador_a: Number(marcadorA), marcador_b: Number(marcadorB), cancha: cancha.trim() || null,
      });
      success('Resultado guardado.');
      onDone();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[88vh] overflow-y-auto animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-surface px-6 py-5 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold font-display tracking-tight text-text-1">Registrar resultado</h2>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-text-1 truncate mb-2">{equipoA?.nombre}</p>
              <input type="number" min="0" value={marcadorA} onChange={e => setMarcadorA(e.target.value)}
                className="input rounded-2xl py-3 text-center text-xl font-bold" required autoFocus />
            </div>
            <span className="text-text-3 font-bold pt-6">–</span>
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-text-1 truncate mb-2">{equipoB?.nombre}</p>
              <input type="number" min="0" value={marcadorB} onChange={e => setMarcadorB(e.target.value)}
                className="input rounded-2xl py-3 text-center text-xl font-bold" required />
            </div>
          </div>
          <div className="field">
            <label className="label">Cancha / sede <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
            <input value={cancha} onChange={e => setCancha(e.target.value)} className="input rounded-2xl py-3" placeholder="Ej. Cancha 2" />
          </div>
          <button type="submit" disabled={working}
            className="w-full py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
            {working ? <><Spinner size="sm" /> Guardando...</> : 'Guardar resultado'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─────────── Vista Liga (tabla de posiciones) ─────────── */
function LigaView({ evento, torneo, partidos, equipos, soyOwner, onReload }) {
  const [posiciones, setPosiciones] = useState(null);
  const [editando, setEditando] = useState(null);
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
      {/* Tabla de posiciones */}
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
              {(posiciones || []).map((eq, i) => (
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

      {/* Lista de partidos */}
      <div>
        <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-3">Partidos</p>
        <div className="rounded-3xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">
          {partidos.map(p => {
            const eqA = equipoPorId.get(p.equipo_a_id);
            const eqB = equipoPorId.get(p.equipo_b_id);
            return (
              <button
                key={p.id}
                onClick={() => soyOwner && setEditando(p)}
                disabled={!soyOwner}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/30 transition-colors text-left disabled:cursor-default"
              >
                <span className="text-sm text-text-1 flex-1 truncate">{eqA?.nombre} <span className="text-text-3">vs</span> {eqB?.nombre}</span>
                {p.estado === 'jugado' ? (
                  <span className="text-sm font-bold tabular-nums text-text-1">{p.marcador_a} - {p.marcador_b}</span>
                ) : (
                  <span className="text-xs text-warning">Pendiente</span>
                )}
              </button>
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
    </div>
  );
}
