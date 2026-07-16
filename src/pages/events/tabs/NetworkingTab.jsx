import { useEffect, useState } from 'react';
import { networkingApi } from '../../../api/networking.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';

/* Tab Rueda de Negocios — gestionado + autogestionado:
   el organizador crea expositores y sus horarios disponibles; los
   asistentes reservan citas libremente, confirmación automática. */

export default function NetworkingTab({ evento, soyOwner }) {
  const [sub, setSub] = useState(soyOwner ? 'admin' : 'explorar'); // admin | explorar | mis-citas

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Rueda de Negocios</h2>
          <p className="text-sm text-text-2 mt-1">Agenda citas cortas de networking con expositores del evento.</p>
        </div>
        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1">
          {soyOwner && (
            <button onClick={() => setSub('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sub === 'admin' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
              Gestionar
            </button>
          )}
          <button onClick={() => setSub('explorar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sub === 'explorar' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            Explorar
          </button>
          <button onClick={() => setSub('mis-citas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sub === 'mis-citas' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            Mis citas
          </button>
        </div>
      </div>

      {sub === 'admin'    && soyOwner && <AdminView evento={evento} />}
      {sub === 'explorar' && <ExplorarView evento={evento} />}
      {sub === 'mis-citas' && <MisCitasView evento={evento} />}
    </div>
  );
}

/* ─────────── Vista Explorar (asistente) ─────────── */
function ExplorarView({ evento }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const { success, error: toastErr } = useToast();

  const cargar = () => {
    setLoading(true);
    networkingApi.expositores(evento.id)
      .then(d => setData(d.expositores || []))
      .catch(e => toastErr(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [evento.id]);

  const reservar = async (horarioId) => {
    setBusy(horarioId);
    try {
      await networkingApi.reservar(evento.id, horarioId);
      success('¡Cita confirmada!');
      cargar();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <GLoader message="Cargando expositores..." />;
  if (!data || data.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
        <p className="text-sm text-text-3">Aún no hay expositores disponibles para este evento.</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {data.map(exp => (
        <div key={exp.id} className="rounded-3xl border border-border bg-surface/40 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold flex-shrink-0">
              {exp.logo_url ? <img src={exp.logo_url} alt="" className="w-full h-full object-cover" /> : exp.nombre?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-text-1 truncate">{exp.nombre}</p>
              {exp.stand && <p className="text-xs text-text-3">Stand {exp.stand}</p>}
            </div>
          </div>
          {exp.descripcion && <p className="text-sm text-text-2 leading-relaxed">{exp.descripcion}</p>}

          <div>
            <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">Horarios disponibles</p>
            {exp.horarios.length === 0 ? (
              <p className="text-xs text-text-3">Sin horarios publicados aún.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {exp.horarios.map(h => {
                  const hora = new Date(h.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                  if (h.esMio) {
                    return (
                      <span key={h.id} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/25">
                        {hora} · Reservada
                      </span>
                    );
                  }
                  if (!h.disponible) {
                    return (
                      <span key={h.id} className="px-3 py-1.5 rounded-full text-xs bg-surface-2 text-text-3 border border-border line-through">
                        {hora}
                      </span>
                    );
                  }
                  return (
                    <button key={h.id} onClick={() => reservar(h.id)} disabled={busy === h.id}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border border-primary/30 bg-primary/10 text-primary-light hover:bg-primary/20 disabled:opacity-50 transition-all">
                      {busy === h.id ? <Spinner size="sm" /> : hora}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Vista Mis Citas (asistente) ─────────── */
function MisCitasView({ evento }) {
  const [citas, setCitas] = useState(null);
  const [busy, setBusy] = useState(null);
  const { success, error: toastErr } = useToast();

  const cargar = () => {
    networkingApi.misCitas(evento.id)
      .then(d => setCitas(d.citas || []))
      .catch(e => toastErr(e.response?.data?.error || e.message));
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [evento.id]);

  const cancelar = async (citaId) => {
    if (!(await confirmDialog({ message: '¿Cancelar esta cita? El horario quedará libre para alguien más.', danger: true }))) return;
    setBusy(citaId);
    try {
      await networkingApi.cancelar(evento.id, citaId);
      success('Cita cancelada.');
      cargar();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setBusy(null);
    }
  };

  if (citas === null) return <GLoader message="Cargando tu agenda..." />;
  if (citas.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
        <p className="text-sm text-text-3">Todavía no tienes citas reservadas. Ve a "Explorar" para agendar una.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
      {citas.map((c, i) => {
        const inicio = new Date(c.horario?.inicio);
        const fin = new Date(c.horario?.fin);
        return (
          <div key={c.id} className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}>
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold flex-shrink-0">
              {c.horario?.expositor?.logo_url
                ? <img src={c.horario.expositor.logo_url} alt="" className="w-full h-full object-cover" />
                : c.horario?.expositor?.nombre?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-1 truncate">{c.horario?.expositor?.nombre}</p>
              <p className="text-xs text-text-3">
                {inicio.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} – {fin.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                {c.horario?.expositor?.stand ? ` · Stand ${c.horario.expositor.stand}` : ''}
              </p>
            </div>
            <button onClick={() => cancelar(c.id)} disabled={busy === c.id}
              className="btn-ghost btn-sm text-danger/80 hover:text-danger disabled:opacity-50">
              {busy === c.id ? <Spinner size="sm" /> : 'Cancelar'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────── Vista Admin (organizador) ─────────── */
function AdminView({ evento }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [horariosPara, setHorariosPara] = useState(null); // expositor seleccionado
  const { success, error: toastErr } = useToast();

  const cargar = () => {
    setLoading(true);
    networkingApi.admin(evento.id)
      .then(d => setData(d.expositores || []))
      .catch(e => toastErr(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [evento.id]);

  const borrarExpositor = async (exp) => {
    if (!(await confirmDialog({ message: `¿Borrar al expositor "${exp.nombre}"? Se eliminan también sus horarios.`, danger: true }))) return;
    try {
      await networkingApi.borrarExpositor(evento.id, exp.id);
      success('Expositor eliminado.');
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const borrarHorario = async (horarioId) => {
    try {
      await networkingApi.borrarHorario(evento.id, horarioId);
      success('Horario eliminado.');
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  if (loading) return <GLoader message="Cargando..." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setFormOpen(true)} className="btn-gradient btn-sm">+ Agregar expositor</button>
      </div>

      {(!data || data.length === 0) ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-3">Aún no agregaste expositores. Crea el primero para empezar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(exp => (
            <div key={exp.id} className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {exp.logo_url ? <img src={exp.logo_url} alt="" className="w-full h-full object-cover" /> : exp.nombre?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-1 truncate">{exp.nombre}</p>
                  {exp.stand && <p className="text-xs text-text-3">Stand {exp.stand}</p>}
                </div>
                <button onClick={() => setHorariosPara(exp)} className="btn-secondary btn-sm">+ Horarios</button>
                <button onClick={() => borrarExpositor(exp)} aria-label="Borrar"
                  className="w-8 h-8 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {exp.horarios.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {exp.horarios.map(h => {
                    const hora = new Date(h.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <span key={h.id}
                        className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border
                          ${h.cita ? 'bg-success/10 text-success border-success/25' : 'bg-surface-2 text-text-2 border-border'}`}>
                        {hora}{h.cita ? ` · ${h.cita.usuario?.nombre || 'Reservada'}` : ''}
                        {!h.cita && (
                          <button onClick={() => borrarHorario(h.id)} className="opacity-50 hover:opacity-100">×</button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <NuevoExpositorModal
          eventoId={evento.id}
          onClose={() => setFormOpen(false)}
          onDone={() => { setFormOpen(false); cargar(); }}
        />
      )}

      {horariosPara && (
        <GenerarHorariosModal
          eventoId={evento.id}
          expositor={horariosPara}
          onClose={() => setHorariosPara(null)}
          onDone={() => { setHorariosPara(null); cargar(); }}
        />
      )}
    </div>
  );
}

function NuevoExpositorModal({ eventoId, onClose, onDone }) {
  const [nombre, setNombre] = useState('');
  const [stand, setStand] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [working, setWorking] = useState(false);
  const { error: toastErr } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { toastErr('El nombre es requerido.'); return; }
    setWorking(true);
    try {
      await networkingApi.crearExpositor(eventoId, { nombre: nombre.trim(), stand: stand.trim() || null, descripcion: descripcion.trim() || null });
      onDone();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl p-6 animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold font-display tracking-tight text-text-1 mb-5">Nuevo expositor</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="field">
            <label className="label">Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} className="input rounded-2xl py-3" placeholder="Nombre de la empresa" required autoFocus />
          </div>
          <div className="field">
            <label className="label">Stand <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
            <input value={stand} onChange={e => setStand(e.target.value)} className="input rounded-2xl py-3" placeholder="Ej. A-12" />
          </div>
          <div className="field">
            <label className="label">Descripción <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} className="input rounded-2xl py-3 resize-none" placeholder="A qué se dedican, qué ofrecen..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-medium text-text-1 border border-border-2 hover:bg-surface-2">Cancelar</button>
            <button type="submit" disabled={working} className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
              {working ? <><Spinner size="sm" /> Creando...</> : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GenerarHorariosModal({ eventoId, expositor, onClose, onDone }) {
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('12:00');
  const [duracion, setDuracion] = useState(15);
  const [working, setWorking] = useState(false);
  const { success, error: toastErr } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!fecha) { toastErr('Selecciona una fecha.'); return; }
    setWorking(true);
    try {
      const r = await networkingApi.generarHorarios(eventoId, expositor.id, {
        inicio: new Date(`${fecha}T${horaInicio}:00`).toISOString(),
        fin: new Date(`${fecha}T${horaFin}:00`).toISOString(),
        duracion_min: Number(duracion),
      });
      success(`${r.creados} horarios generados.`);
      onDone();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl p-6 animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold font-display tracking-tight text-text-1 mb-1">Generar horarios</h2>
        <p className="text-sm text-text-2 mb-5">Para <strong className="text-text-1">{expositor.nombre}</strong> — se crean bloques consecutivos automáticamente.</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="field">
            <label className="label">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="input rounded-2xl py-3" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label">Desde</label>
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="input rounded-2xl py-3" required />
            </div>
            <div className="field">
              <label className="label">Hasta</label>
              <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="input rounded-2xl py-3" required />
            </div>
          </div>
          <div className="field">
            <label className="label">Duración de cada cita (minutos)</label>
            <select value={duracion} onChange={e => setDuracion(e.target.value)} className="input bg-surface-2 rounded-2xl py-3">
              <option value={10}>10 minutos</option>
              <option value={15}>15 minutos</option>
              <option value={20}>20 minutos</option>
              <option value={30}>30 minutos</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-medium text-text-1 border border-border-2 hover:bg-surface-2">Cancelar</button>
            <button type="submit" disabled={working} className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
              {working ? <><Spinner size="sm" /> Generando...</> : 'Generar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
