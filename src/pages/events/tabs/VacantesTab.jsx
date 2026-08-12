import { useEffect, useState, useCallback } from 'react';
import { vacantesApi, formatoPago, ETAPAS_VACANTE } from '../../../api/vacantes.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import { BrandingProvider, BrandHeader, PoweredBy } from '../../../components/public/Branding.jsx';
import BuzonSugerencia from '../../../components/ui/BuzonSugerencia.jsx';

/* ──────────────────────────────────────────────────────────────────
   Vacantes — lado ORGANIZADOR (dentro del evento).
   Publicar vacantes, revisar el pipeline y contratar (→ equipo).
   GESTEK retiene una comisión del contrato; el sueldo se paga por fuera.
   ────────────────────────────────────────────────────────────────── */

const MODALIDADES = [['presencial', 'Presencial'], ['remoto', 'Remoto'], ['hibrido', 'Híbrido']];
const PERIODOS = [['evento', 'por el evento'], ['dia', 'por día'], ['hora', 'por hora']];
const uid = () => Math.random().toString(36).slice(2, 9);

export default function VacantesTab({ evento, soyOwner }) {
  const { success, error: toastErr } = useToast();
  const [vacantes, setVacantes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);   // null | 'nueva' | vacante
  const [pipeline, setPipeline] = useState(null);    // vacante en vista pipeline

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [dv, dr] = await Promise.all([vacantesApi.listar(evento.id), vacantesApi.roles()]);
      setVacantes(dv.vacantes || []);
      setRoles(dr.roles || []);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, [evento.id, toastErr]);
  useEffect(() => { cargar(); }, [cargar]);

  const borrar = async (v) => {
    if (!(await confirmDialog({ message: `¿Eliminar la vacante "${v.titulo}"? Se borran también sus postulaciones.`, danger: true }))) return;
    try { await vacantesApi.borrar(evento.id, v.id); success('Vacante eliminada.'); cargar(); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  if (!soyOwner) return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-14 text-center">
      <p className="text-sm text-text-3">Solo el organizador puede gestionar las vacantes.</p>
    </div>
  );
  if (loading) return <GLoader message="Cargando vacantes…" />;

  if (pipeline) return <Pipeline evento={evento} vacante={pipeline} onVolver={() => { setPipeline(null); cargar(); }} />;

  if (editando) return (
    <FormVacante evento={evento} roles={roles} vacante={editando === 'nueva' ? null : editando}
      onRolesChange={setRoles}
      onListo={() => { setEditando(null); cargar(); }} onCancel={() => setEditando(null)} />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-text-3 max-w-2xl">Publica qué personal necesitas para este evento. La gente se postula desde «Explorar vacantes» y aquí revisas y contratas. GESTEK retiene una comisión del contrato; el pago del sueldo se arregla por fuera.</p>
        <button onClick={() => setEditando('nueva')} className="btn-primary btn-sm flex-shrink-0">+ Nueva vacante</button>
      </div>

      {vacantes.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-2 mb-4">Aún no has publicado vacantes para este evento.</p>
          <button onClick={() => setEditando('nueva')} className="btn-primary btn-sm">Publicar la primera</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {vacantes.map(v => (
            <div key={v.id} className="rounded-2xl border border-border bg-surface/40 p-4 flex flex-col gap-2 group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-1 truncate">{v.titulo}</p>
                  <p className="text-xs text-text-3">{v.rol?.nombre || v.rol_texto || 'Sin rol'} · {v.ciudad || 'sin ciudad'}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${v.estado === 'abierta' ? 'bg-success/15 text-success' : 'bg-surface-2 text-text-3'}`}>{v.estado}</span>
              </div>
              <p className="text-sm font-semibold text-success">{formatoPago(v.pago_monto, v.pago_moneda, v.pago_periodo)}</p>
              <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                <button onClick={() => setPipeline(v)} className="btn-secondary btn-sm">
                  {v.postulaciones?.total || 0} postulante{(v.postulaciones?.total || 0) !== 1 ? 's' : ''}
                </button>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditando(v)} className="w-8 h-8 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center" title="Editar">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button onClick={() => borrar(v)} className="w-8 h-8 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center" title="Eliminar">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── Formulario de vacante ─────────── */
function FormVacante({ evento, roles, vacante, onListo, onCancel, onRolesChange }) {
  const { success, error: toastErr } = useToast();
  const [f, setF] = useState(() => ({
    titulo: vacante?.titulo || '', descripcion: vacante?.descripcion || '',
    rol_id: vacante?.rol_id || '', pago_monto: vacante?.pago_monto ?? '', pago_moneda: vacante?.pago_moneda || 'COP',
    pago_periodo: vacante?.pago_periodo || 'evento', ciudad: vacante?.ciudad || evento.location_nombre || '',
    modalidad: vacante?.modalidad || 'presencial', cupos: vacante?.cupos || 1,
    estado: vacante?.estado || 'abierta',
    preguntas: Array.isArray(vacante?.preguntas) ? vacante.preguntas : [],
  }));
  const [saving, setSaving] = useState(false);
  const [nuevoRol, setNuevoRol] = useState('');
  const set = (patch) => setF(x => ({ ...x, ...patch }));

  const addPregunta = () => set({ preguntas: [...f.preguntas, { id: uid(), label: '', requerido: false }] });
  const setPregunta = (id, patch) => set({ preguntas: f.preguntas.map(p => p.id === id ? { ...p, ...patch } : p) });
  const delPregunta = (id) => set({ preguntas: f.preguntas.filter(p => p.id !== id) });

  const crearRol = async () => {
    if (!nuevoRol.trim()) return;
    try {
      const d = await vacantesApi.crearRol(nuevoRol.trim());
      onRolesChange([...(roles || []), d.rol]);
      set({ rol_id: d.rol.id });
      setNuevoRol('');
      success('Rol creado.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const guardar = async () => {
    if (!f.titulo.trim()) { toastErr('La vacante necesita un título.'); return; }
    if (f.pago_monto === '' || Number(f.pago_monto) < 0) { toastErr('El pago del contrato es obligatorio.'); return; }
    setSaving(true);
    try {
      const body = { ...f, pago_monto: Number(f.pago_monto), cupos: Number(f.cupos) || 1, preguntas: f.preguntas.filter(p => p.label.trim()) };
      if (vacante) await vacantesApi.editar(evento.id, vacante.id, body);
      else await vacantesApi.crear(evento.id, body);
      success(vacante ? 'Vacante actualizada.' : 'Vacante publicada.');
      onListo();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const comision = Math.round((Number(f.pago_monto) || 0) * 0.05);

  /* #47 · El formulario ocupaba media pantalla y dejaba la otra media en
     blanco: `max-w-2xl` y nada al lado. Ahora la mitad libre es la vista
     previa de lo que verá el candidato, con la marca del organizador, y el
     título y la descripción se escriben ahí mismo. Es lo que hace que la
     vista previa sirva para algo y no sea un espejo decorativo. */
  return (
    <div className="space-y-4">
      <button onClick={onCancel} className="text-sm text-text-3 hover:text-text-1">← Volver a vacantes</button>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-5 items-start">
      <div className="rounded-3xl border border-border bg-surface/40 p-5 space-y-4 min-w-0">
        <h3 className="text-base font-semibold text-text-1">{vacante ? 'Editar vacante' : 'Nueva vacante'}</h3>

        <div className="field">
          <label className="label text-xs">Título *</label>
          <input value={f.titulo} onChange={e => set({ titulo: e.target.value })} className="input rounded-xl py-2.5 text-sm" placeholder="Ej. Meseros para la feria" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="field">
            <label className="label text-xs">Rol / categoría</label>
            <select value={f.rol_id} onChange={e => set({ rol_id: e.target.value })} className="input bg-surface-2 rounded-xl py-2.5 text-sm">
              <option value="">Sin rol</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
            <div className="flex gap-1 mt-1.5">
              <input value={nuevoRol} onChange={e => setNuevoRol(e.target.value)} placeholder="Crear rol propio" className="input rounded-lg py-1.5 text-xs flex-1" />
              <button type="button" onClick={crearRol} className="btn-ghost btn-sm text-xs">+ Crear</button>
            </div>
            {/* #49 · Aquí un rol propio se crea sólo para este organizador. Si
                lo que falta es del catálogo común, esto es lo que lo cuenta. */}
            <BuzonSugerencia
              catalogo="vacante"
              etiqueta="¿Debería estar en la lista de todos? Dinos cuál"
              contexto={{ desde: 'vacantes', evento: evento?.titulo || '', vacante: f.titulo || '' }}
            />
          </div>
          <div className="field">
            <label className="label text-xs">Modalidad</label>
            <select value={f.modalidad} onChange={e => set({ modalidad: e.target.value })} className="input bg-surface-2 rounded-xl py-2.5 text-sm">
              {MODALIDADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label text-xs">Descripción</label>
          <textarea value={f.descripcion} onChange={e => set({ descripcion: e.target.value })} rows={3} className="input rounded-xl py-2.5 text-sm resize-none" placeholder="Qué se hará, horarios, requisitos generales." />
        </div>

        {/* Pago + comisión */}
        <div className="rounded-2xl border border-border bg-surface-2/40 p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="field sm:col-span-1">
              <label className="label text-xs">Pago del contrato *</label>
              <input type="number" min="0" value={f.pago_monto} onChange={e => set({ pago_monto: e.target.value })} className="input rounded-xl py-2.5 text-sm" placeholder="200000" />
            </div>
            <div className="field">
              <label className="label text-xs">Moneda</label>
              <select value={f.pago_moneda} onChange={e => set({ pago_moneda: e.target.value })} className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                <option value="COP">COP</option><option value="USD">USD</option>
              </select>
            </div>
            <div className="field">
              <label className="label text-xs">Periodo</label>
              <select value={f.pago_periodo} onChange={e => set({ pago_periodo: e.target.value })} className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                {PERIODOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-text-3">
            El pago es visible para el candidato. GESTEK retiene el <b className="text-text-2">5%</b> del contrato
            {comision > 0 && <> (≈ {formatoPago(comision, f.pago_moneda)})</>} al contratar; el sueldo se paga por fuera de la plataforma.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="field"><label className="label text-xs">Ciudad</label><input value={f.ciudad} onChange={e => set({ ciudad: e.target.value })} className="input rounded-xl py-2.5 text-sm" /></div>
          <div className="field"><label className="label text-xs">Cupos</label><input type="number" min="1" value={f.cupos} onChange={e => set({ cupos: e.target.value })} className="input rounded-xl py-2.5 text-sm" /></div>
          <div className="field">
            <label className="label text-xs">Estado</label>
            <select value={f.estado} onChange={e => set({ estado: e.target.value })} className="input bg-surface-2 rounded-xl py-2.5 text-sm">
              <option value="abierta">Abierta</option><option value="pausada">Pausada</option><option value="cerrada">Cerrada</option>
            </select>
          </div>
        </div>

        {/* Preguntas */}
        <div className="space-y-2">
          <label className="label text-xs">Preguntas para el candidato</label>
          {f.preguntas.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <input value={p.label} onChange={e => setPregunta(p.id, { label: e.target.value })} className="input rounded-lg py-2 text-sm flex-1" placeholder="Ej. ¿Tienes experiencia previa?" />
              <label className="flex items-center gap-1 text-xs text-text-2 cursor-pointer">
                <input type="checkbox" checked={p.requerido} onChange={e => setPregunta(p.id, { requerido: e.target.checked })} className="w-4 h-4 rounded accent-primary" /> Obligatoria
              </label>
              <button onClick={() => delPregunta(p.id)} className="w-7 h-7 rounded-lg text-text-3 hover:text-danger flex items-center justify-center">✕</button>
            </div>
          ))}
          <button type="button" onClick={addPregunta} className="btn-ghost btn-sm text-xs">+ Agregar pregunta</button>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost btn-sm">Cancelar</button>
          <button onClick={guardar} disabled={saving} className="btn-primary btn-sm">{saving ? <><Spinner size="sm" /> Guardando…</> : (vacante ? 'Guardar' : 'Publicar vacante')}</button>
        </div>
      </div>

      <VistaPreviaVacante evento={evento} f={f} set={set} roles={roles} />
      </div>
    </div>
  );
}

/* La vacante como la ve el candidato, con la marca del organizador.

   El título y la descripción son campos de verdad, no texto pintado: se
   escriben aquí igual que en el formulario y los dos lados comparten estado.
   Una vista previa que sólo mira obliga a ir y venir entre las dos mitades
   para ajustar una frase. */
function VistaPreviaVacante({ evento, f, set, roles }) {
  const branding = evento.page_json?.branding || {};
  const organizador = {
    ...(evento.organizador || {}),
    branding: { ...((evento.organizador || {}).branding || {}), ...branding },
    ...(branding.logo_url ? { empresa_logo_url: branding.logo_url } : {}),
  };
  const rol = roles.find(r => String(r.id) === String(f.rol_id));
  const modalidad = MODALIDADES.find(([v]) => v === f.modalidad)?.[1] || f.modalidad;
  const periodo = PERIODOS.find(([v]) => v === f.pago_periodo)?.[1] || '';

  return (
    <div className="xl:sticky xl:top-4 space-y-2">
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">
        Así la ve el candidato
      </p>

      <BrandingProvider organizador={organizador}>
        <article className="rounded-3xl border border-border bg-surface overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <BrandHeader organizador={organizador} size="sm" />
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Editable desde aquí: mismo estado que el formulario. */}
            <input
              value={f.titulo}
              onChange={e => set({ titulo: e.target.value })}
              placeholder="Título de la vacante"
              aria-label="Título de la vacante"
              className="w-full bg-transparent border-0 p-0 text-xl font-bold font-display tracking-tight
                         text-text-1 placeholder:text-text-3/60 focus:outline-none focus:ring-0" />

            <div className="flex flex-wrap gap-1.5">
              {rol && <Chip>{rol.nombre}</Chip>}
              <Chip>{modalidad}</Chip>
              {f.ciudad && <Chip>{f.ciudad}</Chip>}
              {Number(f.cupos) > 1 && <Chip>{f.cupos} cupos</Chip>}
              {f.estado !== 'abierta' && <Chip alerta>{f.estado === 'pausada' ? 'Pausada' : 'Cerrada'}</Chip>}
            </div>

            <div>
              <p className="text-2xl font-bold font-display text-text-1 tabular-nums leading-none">
                {Number(f.pago_monto) > 0
                  ? formatoPago(Number(f.pago_monto), f.pago_moneda)
                  : <span className="text-text-3 text-base font-normal">Sin pago definido</span>}
              </p>
              {Number(f.pago_monto) > 0 && periodo && (
                <p className="text-[11px] text-text-3 mt-0.5">{periodo}</p>
              )}
            </div>

            <textarea
              value={f.descripcion}
              onChange={e => set({ descripcion: e.target.value })}
              rows={4}
              placeholder="Qué se hará, horarios, requisitos generales."
              aria-label="Descripción de la vacante"
              className="w-full bg-transparent border-0 p-0 text-sm leading-relaxed resize-none
                         text-text-2 placeholder:text-text-3/60 focus:outline-none focus:ring-0" />

            {f.preguntas.filter(p => p.label.trim()).length > 0 && (
              <div className="pt-3 border-t border-border">
                <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">
                  Te preguntaremos
                </p>
                <ul className="space-y-1">
                  {f.preguntas.filter(p => p.label.trim()).map(p => (
                    <li key={p.id} className="text-xs text-text-2 flex items-start gap-1.5">
                      <span className="text-text-3 mt-0.5">·</span>
                      {p.label}{p.requerido && <span className="text-danger">*</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button type="button" disabled className="btn-primary btn-sm w-full justify-center opacity-70 cursor-default">
              Postularme
            </button>
          </div>

          <div className="px-5 pb-4">
            <PoweredBy organizador={organizador} />
          </div>
        </article>
      </BrandingProvider>

      <p className="text-[11px] text-text-3 leading-relaxed">
        El título y la descripción se pueden escribir aquí mismo. Los demás datos salen
        del formulario de la izquierda. Se publica con «{f.estado === 'abierta' ? 'Publicar vacante' : 'Guardar'}».
      </p>
    </div>
  );
}

function Chip({ children, alerta }) {
  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border
      ${alerta ? 'border-warning/40 bg-warning/10 text-warning' : 'border-border bg-surface-2 text-text-2'}`}>
      {children}
    </span>
  );
}

/* ─────────── Pipeline de postulaciones ─────────── */
function Pipeline({ evento, vacante, onVolver }) {
  const { success, error: toastErr } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [entrevistando, setEntrevistando] = useState(null);
  const [resenando, setResenando] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { const d = await vacantesApi.postulaciones(evento.id, vacante.id); setPosts(d.postulaciones || []); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, [evento.id, vacante.id, toastErr]);
  useEffect(() => { cargar(); }, [cargar]);

  const mover = async (p, etapa) => {
    if (etapa === p.etapa) return;
    setBusy(p.id);
    try {
      const body = { etapa };
      if (etapa === 'aceptado') body.monto_contrato = vacante.pago_monto;
      await vacantesApi.moverEtapa(evento.id, vacante.id, p.id, body);
      if (etapa === 'aceptado') success('¡Contratado! Se sumó al equipo y se registró la comisión del 5%.');
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setBusy(null); }
  };

  if (loading) return <GLoader message="Cargando postulaciones…" />;

  return (
    <div className="space-y-4">
      <button onClick={onVolver} className="text-sm text-text-3 hover:text-text-1">← Volver a vacantes</button>
      <div>
        <h3 className="text-lg font-bold font-display text-text-1">{vacante.titulo}</h3>
        <p className="text-sm text-text-3">{formatoPago(vacante.pago_monto, vacante.pago_moneda, vacante.pago_periodo)} · {posts.length} postulante{posts.length !== 1 ? 's' : ''}</p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-2">Todavía nadie se ha postulado a esta vacante.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => {
            const snap = p.perfil_snapshot || {};
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-surface/40 p-4">
                <div className="flex items-start gap-3">
                  {snap.foto_url || p.candidato?.avatar_url
                    ? <img src={snap.foto_url || p.candidato.avatar_url} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                    : <div className="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center text-text-3 flex-shrink-0 font-bold">{(p.candidato?.nombre || '?').charAt(0).toUpperCase()}</div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-1 truncate">{p.candidato?.nombre || 'Candidato'}</p>
                    <p className="text-xs text-text-3 truncate">{snap.titular || ''}{snap.ciudad ? ` · ${snap.ciudad}` : ''}</p>
                    {snap.habilidades?.length > 0 && <p className="text-[11px] text-text-3 mt-0.5 truncate">{snap.habilidades.join(' · ')}</p>}
                    {p.mensaje && <p className="text-xs text-text-2 mt-1 italic">“{p.mensaje}”</p>}
                    {p.entrevista?.inicio && <p className="text-[11px] text-accent-light mt-1">Entrevista: {new Date(p.entrevista.inicio).toLocaleString('es-CO')}</p>}
                  </div>
                  <select value={p.etapa} disabled={busy === p.id} onChange={e => mover(p, e.target.value)}
                    className="input bg-surface-2 rounded-lg py-1.5 text-xs flex-shrink-0 w-[120px]">
                    {ETAPAS_VACANTE.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </div>
                {(Object.keys(p.respuestas || {}).length > 0) && (
                  <div className="mt-2 pl-14 space-y-0.5">
                    {Object.values(p.respuestas).map((r, i) => <p key={i} className="text-[11px] text-text-3">· {String(r)}</p>)}
                  </div>
                )}
                <div className="mt-2 pl-14 flex gap-2">
                  <button onClick={() => setEntrevistando(p)} className="btn-ghost btn-sm text-xs">Agendar entrevista</button>
                  {p.etapa === 'aceptado' && <button onClick={() => setResenando(p)} className="btn-ghost btn-sm text-xs">Reseñar</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entrevistando && <EntrevistaModal evento={evento} vacante={vacante} post={entrevistando} onClose={() => setEntrevistando(null)} onListo={cargar} />}
      {resenando && <ResenaTrabajadorModal evento={evento} vacante={vacante} post={resenando} onClose={() => setResenando(null)} />}
    </div>
  );
}

function EntrevistaModal({ evento, vacante, post, onClose, onListo }) {
  const { success, error: toastErr } = useToast();
  const [inicio, setInicio] = useState('');
  const [enlace, setEnlace] = useState('');
  const [saving, setSaving] = useState(false);

  const enviar = async () => {
    if (!inicio) { toastErr('Elige fecha y hora.'); return; }
    setSaving(true);
    try {
      await vacantesApi.agendarEntrevista(evento.id, vacante.id, post.id, { inicio: new Date(inicio).toISOString(), enlace: enlace.trim() || null });
      success('Entrevista agendada. Se le avisó al candidato.');
      onListo?.(); onClose();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-bg shadow-2xl p-6 space-y-3">
        <h3 className="text-base font-bold text-text-1">Agendar entrevista</h3>
        <div className="field"><label className="label text-xs">Fecha y hora</label><input type="datetime-local" value={inicio} onChange={e => setInicio(e.target.value)} className="input rounded-xl py-2.5 text-sm w-full" /></div>
        <div className="field"><label className="label text-xs">Enlace (opcional)</label><input value={enlace} onChange={e => setEnlace(e.target.value)} className="input rounded-xl py-2.5 text-sm w-full" placeholder="Meet / Zoom / lugar" /></div>
        <p className="text-[11px] text-text-3">La sincronización automática con Google Calendar se activará pronto; por ahora se guarda y se le avisa al candidato.</p>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-ghost btn-sm">Cancelar</button><button onClick={enviar} disabled={saving} className="btn-primary btn-sm">{saving ? <Spinner size="sm" /> : 'Agendar'}</button></div>
      </div>
    </div>
  );
}

function ResenaTrabajadorModal({ evento, vacante, post, onClose }) {
  const { success, error: toastErr } = useToast();
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);

  const enviar = async () => {
    setSaving(true);
    try {
      await vacantesApi.resenarTrabajador(evento.id, vacante.id, post.id, { estrellas, comentario: comentario.trim() || null });
      success('Reseña publicada en el perfil del trabajador.');
      onClose();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-bg shadow-2xl p-6">
        <h3 className="text-base font-bold text-text-1 mb-1">Reseñar a {post.candidato?.nombre || 'el trabajador'}</h3>
        <p className="text-xs text-text-3 mb-4">Será pública en su perfil de talento.</p>
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setEstrellas(n)} className={`text-2xl ${n <= estrellas ? 'text-warning' : 'text-text-3'}`}>★</button>)}
        </div>
        <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3} className="input rounded-xl py-2.5 text-sm resize-none w-full mb-4" placeholder="¿Cómo fue su desempeño?" />
        <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-ghost btn-sm">Cancelar</button><button onClick={enviar} disabled={saving} className="btn-primary btn-sm">{saving ? <Spinner size="sm" /> : 'Publicar reseña'}</button></div>
      </div>
    </div>
  );
}
