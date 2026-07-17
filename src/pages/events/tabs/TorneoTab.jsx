import { useEffect, useState } from 'react';
import { torneosApi } from '../../../api/torneos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';

/* Tab Torneo — categoría Deportes. Un torneo por evento.
   Formatos: eliminación directa (bracket), liga (tabla de posiciones), o
   grupos + eliminación (fase de grupos, luego bracket con clasificados).
   Cada partido se puede PROGRAMAR (fecha/hora/cancha) de forma independiente
   a registrar su resultado. Al programar, se avisa por push/email al
   contacto de cada equipo. */

export default function TorneoTab({ evento, soyOwner }) {
  const [torneo, setTorneo] = useState(undefined);
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
  const [numGrupos, setNumGrupos] = useState(2);
  const [avanzanPorGrupo, setAvanzanPorGrupo] = useState(2);
  const [working, setWorking] = useState(false);
  const { error: toastErr } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { toastErr('El nombre del torneo es requerido.'); return; }
    setWorking(true);
    try {
      const body = { nombre: nombre.trim(), formato };
      if (formato === 'grupos_eliminacion') {
        body.num_grupos = Number(numGrupos);
        body.avanzan_por_grupo = Number(avanzanPorGrupo);
      }
      await torneosApi.crear(eventoId, body);
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
            <div className="space-y-2">
              <button type="button" onClick={() => setFormato('eliminacion')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${formato === 'eliminacion' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
                <p className="text-sm font-semibold text-text-1">Eliminación directa</p>
                <p className="text-xs text-text-3 mt-1 leading-relaxed">Llaves tipo bracket. Quien pierde, queda fuera.</p>
              </button>
              <button type="button" onClick={() => setFormato('liga')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${formato === 'liga' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
                <p className="text-sm font-semibold text-text-1">Liga / todos contra todos</p>
                <p className="text-xs text-text-3 mt-1 leading-relaxed">Tabla de posiciones por puntos.</p>
              </button>
              <button type="button" onClick={() => setFormato('grupos_eliminacion')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${formato === 'grupos_eliminacion' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
                <p className="text-sm font-semibold text-text-1">Grupos + Eliminación</p>
                <p className="text-xs text-text-3 mt-1 leading-relaxed">Fase de grupos (todos contra todos) y luego los mejores pasan a eliminación directa — como un mundial.</p>
              </button>
            </div>
          </div>

          {formato === 'grupos_eliminacion' && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-2/40 border border-border p-4">
              <div className="field">
                <label className="label text-xs">Número de grupos</label>
                <input type="number" min="2" value={numGrupos} onChange={e => setNumGrupos(e.target.value)}
                  className="input rounded-xl py-2.5" required />
              </div>
              <div className="field">
                <label className="label text-xs">Avanzan por grupo</label>
                <input type="number" min="1" value={avanzanPorGrupo} onChange={e => setAvanzanPorGrupo(e.target.value)}
                  className="input rounded-xl py-2.5" required />
              </div>
              <p className="col-span-2 text-[11px] text-text-3 leading-relaxed">
                Ej. 4 grupos, avanzan 2 por grupo → 8 equipos clasifican a cuartos de final.
              </p>
            </div>
          )}

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
  const esGrupos = torneo.formato === 'grupos_eliminacion';
  const defaultSub = esGrupos
    ? (torneo.fase_actual === 'eliminacion' ? 'bracket' : (torneo.fase_actual === 'grupos' ? 'grupos' : 'equipos'))
    : (torneo.formato === 'eliminacion' ? 'bracket' : 'liga');
  const [sub, setSub] = useState('equipos');

  useEffect(() => { setSub(defaultSub); /* eslint-disable-next-line */ }, [torneo.id, torneo.fase_actual]);

  const nombreFormato = torneo.formato === 'eliminacion' ? 'Eliminación'
    : torneo.formato === 'liga' ? 'Liga' : 'Grupos + Eliminación';

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">{torneo.nombre}</h2>
            <span className="badge badge-blue text-[10px]">{nombreFormato}</span>
            {esGrupos && (
              <span className="badge badge-gray text-[10px]">
                {torneo.fase_actual === 'grupos' ? 'Fase de grupos' : torneo.fase_actual === 'eliminacion' ? 'Fase eliminatoria' : 'Sin iniciar'}
              </span>
            )}
          </div>
          <p className="text-sm text-text-2 mt-1">
            {torneo.estado === 'armando' ? 'Agregando equipos — todavía no inició' : 'Torneo en curso'}
          </p>
        </div>
        {soyOwner && torneo.estado === 'armando' && (
          <BorrarTorneoBtn evento={evento} torneo={torneo} onDone={onReload} />
        )}
      </div>

      <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 w-fit flex-wrap">
        <button onClick={() => setSub('equipos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'equipos' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
          Equipos
        </button>
        {torneo.formato === 'liga' && (
          <button onClick={() => setSub('liga')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'liga' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            Tabla de posiciones
          </button>
        )}
        {torneo.formato === 'eliminacion' && (
          <button onClick={() => setSub('bracket')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'bracket' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            Bracket
          </button>
        )}
        {esGrupos && torneo.fase_actual !== 'unica' && (
          <button onClick={() => setSub('grupos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'grupos' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            Grupos
          </button>
        )}
        {esGrupos && torneo.fase_actual === 'eliminacion' && (
          <button onClick={() => setSub('bracket')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'bracket' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            Bracket
          </button>
        )}
      </div>

      {sub === 'equipos' && (
        <EquiposView evento={evento} torneo={torneo} equipos={equipos} soyOwner={soyOwner} onReload={onReload} />
      )}
      {sub === 'bracket' && (
        <BracketView evento={evento} torneo={torneo} partidos={partidos.filter(p => p.fase === 'eliminacion' || p.fase === 'unica')} equipos={equipos} soyOwner={soyOwner} onReload={onReload} />
      )}
      {sub === 'liga' && (
        <LigaView evento={evento} torneo={torneo} partidos={partidos} equipos={equipos} soyOwner={soyOwner} onReload={onReload} />
      )}
      {sub === 'grupos' && (
        <GruposView evento={evento} torneo={torneo} partidos={partidos.filter(p => p.fase === 'grupos')} equipos={equipos} soyOwner={soyOwner} onReload={onReload} />
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
  const [importarOpen, setImportarOpen] = useState(false);
  const { success, error: toastErr } = useToast();

  const puedeEditar = soyOwner && torneo.estado === 'armando';
  const minRequerido = torneo.formato === 'grupos_eliminacion' ? (torneo.num_grupos || 2) * 2 : 2;

  const borrarEquipo = async (eq) => {
    if (!(await confirmDialog({ message: `¿Quitar a "${eq.nombre}" del torneo?`, danger: true }))) return;
    try {
      await torneosApi.borrarEquipo(evento.id, torneo.id, eq.id);
      success('Equipo eliminado.');
      onReload();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const generar = async () => {
    if (equipos.length < minRequerido) { toastErr(`Se necesitan al menos ${minRequerido} equipos.`); return; }
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
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFormOpen(true)} className="btn-gradient btn-sm">+ Agregar equipo</button>
            <button onClick={() => setImportarOpen(true)} className="btn-secondary btn-sm">
              📥 Importar desde boletas
            </button>
          </div>
          {equipos.length >= minRequerido && (
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-1 truncate">{eq.nombre}</p>
                {eq.grupo && <p className="text-[11px] text-text-3">Grupo {eq.grupo}</p>}
              </div>
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

      {importarOpen && (
        <ImportarEquiposModal
          evento={evento} torneo={torneo}
          onClose={() => setImportarOpen(false)}
          onDone={() => { setImportarOpen(false); onReload(); }}
        />
      )}
    </div>
  );
}

function NuevoEquipoModal({ evento, torneo, onClose, onDone }) {
  const [nombre, setNombre] = useState('');
  const [foto, setFoto] = useState('');
  const [contactoEmail, setContactoEmail] = useState('');
  const [working, setWorking] = useState(false);
  const { error: toastErr } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { toastErr('El nombre es requerido.'); return; }
    setWorking(true);
    try {
      await torneosApi.crearEquipo(evento.id, torneo.id, {
        nombre: nombre.trim(), foto_url: foto || null, contacto_email: contactoEmail.trim() || null,
      });
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
          </div>
          <div className="field">
            <label className="label">Email de contacto (capitán) <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
            <input type="email" value={contactoEmail} onChange={e => setContactoEmail(e.target.value)}
              className="input rounded-2xl py-3" placeholder="capitan@correo.com" />
            <p className="text-xs text-text-3 mt-1.5">Se usa para avisarle automáticamente cuándo juega el equipo.</p>
          </div>
          <p className="text-xs text-text-3 -mt-1">
            Tip: usa "Importar desde boletas" para traer equipos, foto y contacto automáticamente.
          </p>
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

/* ─────────── Importar equipos desde boletas ─────────── */
function ImportarEquiposModal({ evento, torneo, onClose, onDone }) {
  const [campos, setCampos] = useState(null);
  const [campoNombre, setCampoNombre] = useState('');
  const [campoFoto, setCampoFoto] = useState('');
  const [working, setWorking] = useState(false);
  const [resultado, setResultado] = useState(null);
  const { error: toastErr } = useToast();

  useEffect(() => {
    torneosApi.camposDisponibles(evento.id, torneo.id)
      .then(d => setCampos(d.campos || []))
      .catch(e => toastErr(e.response?.data?.error || e.message));
    /* eslint-disable-next-line */
  }, []);

  const camposTexto = (campos || []).filter(c => c.tipo === 'texto');
  const camposFoto  = (campos || []).filter(c => c.tipo === 'foto');

  const submit = async (e) => {
    e.preventDefault();
    if (!campoNombre) { toastErr('Selecciona qué campo usar como nombre del equipo.'); return; }
    setWorking(true);
    try {
      const r = await torneosApi.importarEquipos(evento.id, torneo.id, {
        campo_nombre_id: campoNombre,
        campo_foto_id: campoFoto || null,
      });
      setResultado(r);
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
          <h2 className="text-xl font-bold font-display tracking-tight text-text-1">Importar desde boletas</h2>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6">
          {campos === null ? (
            <GLoader message="Buscando campos del formulario..." />
          ) : resultado ? (
            <div className="text-center py-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-success/15 border border-success/30 mb-4">
                <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-lg font-bold font-display text-text-1 mb-1">{resultado.importados} equipos importados</p>
              <p className="text-sm text-text-2 mb-6 leading-relaxed">
                Se revisaron {resultado.total_boletas_revisadas} boletas.
                {resultado.omitidos > 0 && ` ${resultado.omitidos} se omitieron (sin ese campo respondido, o nombre repetido).`}
              </p>
              <button onClick={onDone} className="px-6 py-3 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
                Listo
              </button>
            </div>
          ) : camposTexto.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-text-2 leading-relaxed mb-4">
                Tu formulario de compra no tiene ningún campo de tipo "Texto" que pueda usarse como nombre de equipo.
              </p>
              <p className="text-xs text-text-3 leading-relaxed">
                Ve a la pestaña <strong className="text-text-1">Formulario</strong>, agrega un campo tipo texto (ej. "Nombre del equipo") y opcionalmente uno tipo foto, guarda, y vuelve a intentar aquí.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-text-2 leading-relaxed">
                Elige qué campos de tu formulario de compra corresponden al nombre y la foto del equipo. Se creará un equipo por cada boleta que tenga esos datos, con el email del comprador como contacto del equipo.
              </p>
              <div className="field">
                <label className="label">Campo para el nombre del equipo</label>
                <select value={campoNombre} onChange={e => setCampoNombre(e.target.value)} className="input bg-surface-2 rounded-2xl py-3" required>
                  <option value="">— Selecciona —</option>
                  {camposTexto.map(c => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Campo para la foto <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
                <select value={campoFoto} onChange={e => setCampoFoto(e.target.value)} className="input bg-surface-2 rounded-2xl py-3">
                  <option value="">— Sin foto —</option>
                  {camposFoto.map(c => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
                </select>
              </div>
              <button type="submit" disabled={working}
                className="w-full py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
                {working ? <><Spinner size="sm" /> Importando...</> : 'Importar equipos'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

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
function ProgramarModal({ evento, torneo, partido, equipoA, equipoB, onClose, onDone }) {
  const fechaActual = partido.fecha_hora ? new Date(partido.fecha_hora) : null;
  const [fecha, setFecha] = useState(fechaActual ? fechaActual.toISOString().slice(0, 10) : '');
  const [hora, setHora] = useState(fechaActual ? fechaActual.toTimeString().slice(0, 5) : '');
  const [cancha, setCancha] = useState(partido.cancha || '');
  const [working, setWorking] = useState(false);
  const { success, error: toastErr } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!fecha || !hora) { toastErr('Completa fecha y hora.'); return; }
    setWorking(true);
    try {
      await torneosApi.registrarResultado(evento.id, torneo.id, partido.id, {
        fecha_hora: new Date(`${fecha}T${hora}:00`).toISOString(),
        cancha: cancha.trim() || null,
      });
      success('Horario programado. Se avisó a ambos equipos.');
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
          <h2 className="text-lg font-bold font-display tracking-tight text-text-1">Programar partido</h2>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <p className="text-sm text-text-2">
            <strong className="text-text-1">{equipoA?.nombre}</strong> vs <strong className="text-text-1">{equipoB?.nombre}</strong>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="input rounded-2xl py-3" required autoFocus />
            </div>
            <div className="field">
              <label className="label">Hora</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)} className="input rounded-2xl py-3" required />
            </div>
          </div>
          <div className="field">
            <label className="label">Cancha / sede <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
            <input value={cancha} onChange={e => setCancha(e.target.value)} className="input rounded-2xl py-3" placeholder="Ej. Cancha 2" />
          </div>
          <p className="text-xs text-text-3">📣 Se le avisará por correo (y push si tiene cuenta) al capitán de ambos equipos.</p>
          <button type="submit" disabled={working}
            className="w-full py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
            {working ? <><Spinner size="sm" /> Guardando...</> : 'Guardar horario'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ResultadoModal({ evento, torneo, partido, equipoA, equipoB, onClose, onDone }) {
  const [marcadorA, setMarcadorA] = useState(partido.marcador_a ?? '');
  const [marcadorB, setMarcadorB] = useState(partido.marcador_b ?? '');
  const [cancha, setCancha] = useState(partido.cancha || '');
  const [working, setWorking] = useState(false);
  const { success, error: toastErr } = useToast();

  const fechaTxt = partido.fecha_hora
    ? new Date(partido.fecha_hora).toLocaleString('es-CO', { weekday: 'long', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

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
          {fechaTxt && (
            <p className="text-xs text-text-3 -mt-1 capitalize">📅 {fechaTxt}{partido.cancha ? ` · ${partido.cancha}` : ''}</p>
          )}
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

/* ─────────── Vista Liga (tabla de posiciones, formato "liga") ─────────── */
function LigaView({ evento, torneo, partidos, equipos, soyOwner, onReload }) {
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
                    <p className="text-[11px] text-text-3 mt-0.5">📅 {fechaTxt}{p.cancha ? ` · ${p.cancha}` : ''}</p>
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

function TablaPosiciones({ posiciones }) {
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
function GruposView({ evento, torneo, partidos, equipos, soyOwner, onReload }) {
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
          ✅ La fase de grupos ya se cerró. Los clasificados están jugando la eliminatoria — revisa la pestaña "Bracket".
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
            {cerrando ? <><Spinner size="sm" /> Cerrando...</> : '🏁 Cerrar fase de grupos'}
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
                        <p className="text-[11px] text-text-3 mt-0.5">📅 {fechaTxt}{p.cancha ? ` · ${p.cancha}` : ''}</p>
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
