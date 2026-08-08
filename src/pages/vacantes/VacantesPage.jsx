import { useEffect, useState, useCallback } from 'react';
import { useI18n, tEstatico } from '../../context/I18nContext.jsx';
import { vacantesApi, formatoPago, ETAPAS_VACANTE } from '../../api/vacantes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { confirmDialog } from '../../components/ui/Confirm.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import GLoader from '../../components/ui/GLoader.jsx';
import PerfilTalentoEditor from './PerfilTalentoEditor.jsx';

/* ──────────────────────────────────────────────────────────────────
   Explorar vacantes disponibles — lado CANDIDATO (vive en Mi Espacio).
   Tres pestañas: Explorar · Mi perfil de talento · Mis postulaciones.
   GESTEK conecta; el sueldo se arregla por fuera.
   ────────────────────────────────────────────────────────────────── */

const MODALIDADES = [['', 'Cualquier modalidad'], ['presencial', 'Presencial'], ['remoto', 'Remoto'], ['hibrido', 'Híbrido']];

export default function VacantesPage() {
  const { t } = useI18n();
  const [vista, setVista] = useState('explorar');
  return (
    <div className="space-y-6 animate-[fadeUp_0.4s_ease_both]">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-1 tracking-tight">{t('Vacantes de eventos')}</h1>
        <p className="text-sm text-text-2 mt-1">{t('Encuentra trabajo en eventos, arma tu perfil y postúlate. Los eventos publican qué personal necesitan.')}</p>
      </header>

      <div className="flex items-center gap-1 border-b border-border -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
        {[['explorar', t('Explorar')], ['perfil', t('Mi perfil')], ['postulaciones', t('Mis postulaciones')]].map(([v, label]) => (
          <button key={v} onClick={() => setVista(v)}
            className={`relative px-4 py-2.5 text-[14px] font-medium whitespace-nowrap transition-colors ${vista === v ? 'text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            {label}
            {vista === v && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>

      {vista === 'explorar' && <Explorar />}
      {vista === 'perfil' && <PerfilTalentoEditor />}
      {vista === 'postulaciones' && <MisPostulaciones />}
    </div>
  );
}

/* ─────────── Explorar ─────────── */
function Explorar() {
  const { t } = useI18n();
  const { error: toastErr } = useToast();
  const [roles, setRoles] = useState([]);
  const [filtros, setFiltros] = useState({ q: '', ciudad: '', rol_id: '', modalidad: '', pago_min: '' });
  const [vacantes, setVacantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);

  useEffect(() => { vacantesApi.roles().then(d => setRoles(d.roles || [])).catch(() => {}); }, []);

  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      for (const [k, v] of Object.entries(filtros)) if (v) params[k] = v;
      const d = await vacantesApi.explorar(params);
      setVacantes(d.vacantes || []);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, [filtros, toastErr]);

  useEffect(() => { const t = setTimeout(buscar, 250); return () => clearTimeout(t); }, [buscar]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <input value={filtros.q} onChange={e => setFiltros(f => ({ ...f, q: e.target.value }))} placeholder={t('Buscar…')} className="input rounded-xl py-2.5 text-sm lg:col-span-2" />
        <input value={filtros.ciudad} onChange={e => setFiltros(f => ({ ...f, ciudad: e.target.value }))} placeholder={t('Ciudad')} className="input rounded-xl py-2.5 text-sm" />
        <select value={filtros.rol_id} onChange={e => setFiltros(f => ({ ...f, rol_id: e.target.value }))} className="input bg-surface-2 rounded-xl py-2.5 text-sm">
          <option value="">{t('Cualquier rol')}</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <select value={filtros.modalidad} onChange={e => setFiltros(f => ({ ...f, modalidad: e.target.value }))} className="input bg-surface-2 rounded-xl py-2.5 text-sm">
          {MODALIDADES.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
        </select>
      </div>

      {loading ? <GLoader message={t('Buscando vacantes…')} /> : vacantes.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-2">{t('No hay vacantes que coincidan. Prueba con otros filtros.')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {vacantes.map(v => <VacanteCard key={v.id} v={v} onOpen={() => setSel(v.id)} />)}
        </div>
      )}

      {sel && <DetalleModal id={sel} onClose={() => setSel(null)} onPostulado={buscar} />}
    </div>
  );
}

function VacanteCard({ v, onOpen }) {
  return (
    <button onClick={onOpen} className="text-left rounded-2xl border border-border bg-surface/40 hover:border-accent/40 hover:bg-surface/60 transition-colors p-4 flex flex-col gap-2">
      <div className="flex items-start gap-3">
        {v.evento?.cover_url
          ? <img src={v.evento.cover_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          : <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center text-text-3 flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
            </div>}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-1 truncate">{v.titulo}</p>
          <p className="text-xs text-text-3 truncate">{v.evento?.titulo}</p>
        </div>
        {v.destacada && <span className="text-[10px] font-mono bg-accent/15 text-accent-light px-1.5 py-0.5 rounded flex-shrink-0">{tEstatico('Destacada')}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {v.rol?.nombre && <span className="text-[10px] bg-surface-2 text-text-2 px-2 py-0.5 rounded-full">{v.rol.nombre}</span>}
        {v.ciudad && <span className="text-[10px] bg-surface-2 text-text-2 px-2 py-0.5 rounded-full">{v.ciudad}</span>}
        <span className="text-[10px] bg-surface-2 text-text-2 px-2 py-0.5 rounded-full capitalize">{v.modalidad}</span>
      </div>
      <p className="text-sm font-semibold text-success tabular-nums mt-auto">{formatoPago(v.pago_monto, v.pago_moneda, v.pago_periodo)}</p>
    </button>
  );
}

function DetalleModal({ id, onClose, onPostulado }) {
  const { t } = useI18n();
  const { success, error: toastErr } = useToast();
  const [data, setData] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    vacantesApi.detalle(id).then(setData).catch(e => { toastErr(e.response?.data?.error || e.message); onClose(); });
  }, [id, onClose, toastErr]);

  const v = data?.vacante;
  const yaPostule = data?.mi_postulacion;
  const preguntas = Array.isArray(v?.preguntas) ? v.preguntas : [];

  const postular = async () => {
    for (const p of preguntas) if (p.requerido && !respuestas[p.id]?.trim()) { toastErr(`Responde: ${p.label}`); return; }
    setEnviando(true);
    try {
      await vacantesApi.postular(id, { respuestas, mensaje: mensaje.trim() || null });
      success('¡Postulación enviada!');
      onPostulado?.();
      onClose();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setEnviando(false); }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl border border-border bg-bg shadow-2xl p-6">
        {!v ? <GLoader message="Cargando…" /> : (<>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-bold font-display text-text-1">{v.titulo}</h2>
              <p className="text-xs text-text-3">{v.evento?.titulo}</p>
            </div>
            <button onClick={onClose} className="text-text-3 hover:text-text-1">✕</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {v.rol?.nombre && <span className="text-[11px] bg-surface-2 text-text-2 px-2 py-0.5 rounded-full">{v.rol.nombre}</span>}
            {v.ciudad && <span className="text-[11px] bg-surface-2 text-text-2 px-2 py-0.5 rounded-full">{v.ciudad}</span>}
            <span className="text-[11px] bg-surface-2 text-text-2 px-2 py-0.5 rounded-full capitalize">{v.modalidad}</span>
          </div>
          <p className="text-sm font-semibold text-success mb-3">{formatoPago(v.pago_monto, v.pago_moneda, v.pago_periodo)}</p>
          {v.descripcion && <p className="text-sm text-text-2 whitespace-pre-line mb-4">{v.descripcion}</p>}

          {yaPostule ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-text-1">
              {t('Ya te postulaste — estado:')} <b>{t(ETAPAS_VACANTE.find(e => e.id === yaPostule.etapa)?.label || yaPostule.etapa)}</b>.
            </div>
          ) : (<>
            {preguntas.length > 0 && (
              <div className="space-y-3 mb-4">
                <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{t('Preguntas de la vacante')}</p>
                {preguntas.map(p => (
                  <div key={p.id} className="field">
                    <label className="label text-xs">{p.label}{p.requerido && <span className="text-danger"> *</span>}</label>
                    <input value={respuestas[p.id] || ''} onChange={e => setRespuestas(r => ({ ...r, [p.id]: e.target.value }))}
                      className="input rounded-xl py-2.5 text-sm" />
                  </div>
                ))}
              </div>
            )}
            <div className="field mb-4">
              <label className="label text-xs">{t('Mensaje (opcional)')}</label>
              <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={2}
                className="input rounded-xl py-2.5 text-sm resize-none" placeholder={t('Cuéntale al organizador por qué eres buen fit.')} />
            </div>
            <button onClick={postular} disabled={enviando} className="btn-primary w-full justify-center">
              {enviando ? <><Spinner size="sm" /> {t('Enviando…')}</> : t('Postularme')}
            </button>
            <p className="text-[11px] text-text-3 mt-2 text-center">{t('Necesitas un perfil de talento. Si no lo tienes, créalo en «Mi perfil».')}</p>
            <p className="text-[11px] text-text-3 mt-1.5 text-center leading-relaxed">
              {t('Al postularte compartes tu perfil con el organizador y aceptas los')}{' '}
              <a href="/terminos" target="_blank" rel="noreferrer" className="underline hover:text-text-2">{t('términos')}</a> {t('y la')}{' '}
              <a href="/privacidad" target="_blank" rel="noreferrer" className="underline hover:text-text-2">{t('política de privacidad')}</a>.
            </p>
          </>)}
        </>)}
      </div>
    </div>
  );
}

/* ─────────── Mis postulaciones ─────────── */
function MisPostulaciones() {
  const { t, lang } = useI18n();
  const { success, error: toastErr } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resenando, setResenando] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { const d = await vacantesApi.misPostulaciones(); setItems(d.postulaciones || []); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, [toastErr]);
  useEffect(() => { cargar(); }, [cargar]);

  const retirar = async (it) => {
    if (!(await confirmDialog({ message: `¿Retirar tu postulación a "${it.vacante?.titulo}"?`, danger: true }))) return;
    try { await vacantesApi.retirar(it.id); success(t('Postulación retirada.')); cargar(); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  if (loading) return <GLoader message={t('Cargando tus postulaciones…')} />;
  if (!items.length) return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
      <p className="text-sm text-text-2">{t('Aún no te has postulado a ninguna vacante.')}</p>
    </div>
  );

  const etapaColor = (e) => e === 'aceptado' ? 'bg-success/15 text-success' : e === 'rechazado' ? 'bg-danger/15 text-danger' : 'bg-accent/10 text-accent-light';

  return (
    <div className="space-y-3">
      {items.map(it => (
        <div key={it.id} className="rounded-2xl border border-border bg-surface/40 p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-1 truncate">{it.vacante?.titulo}</p>
            <p className="text-xs text-text-3 truncate">{it.vacante?.evento?.titulo} · {formatoPago(it.vacante?.pago_monto, it.vacante?.pago_moneda)}</p>
            {it.entrevista?.inicio && <p className="text-xs text-accent-light mt-0.5">{t('Entrevista:')} {new Date(it.entrevista.inicio).toLocaleString(lang === 'en' ? 'en-US' : 'es-CO')}{it.entrevista.enlace && <> · <a href={it.entrevista.enlace} target="_blank" rel="noreferrer" className="underline">{t('enlace')}</a></>}</p>}
          </div>
          <span className={`text-[11px] font-mono px-2 py-1 rounded ${etapaColor(it.etapa)}`}>{t(ETAPAS_VACANTE.find(e => e.id === it.etapa)?.label || it.etapa)}</span>
          {it.etapa === 'aceptado'
            ? <button onClick={() => setResenando(it)} className="btn-secondary btn-sm">{t('Reseñar')}</button>
            : it.etapa !== 'rechazado' && <button onClick={() => retirar(it)} className="btn-ghost btn-sm text-text-3">{t('Retirar')}</button>}
        </div>
      ))}
      {resenando && <ResenaModal postulacion={resenando} onClose={() => setResenando(null)} onListo={cargar} />}
    </div>
  );
}

function ResenaModal({ postulacion, onClose, onListo }) {
  const { t } = useI18n();
  const { success, error: toastErr } = useToast();
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);

  const enviar = async () => {
    setSaving(true);
    try {
      await vacantesApi.resenarOrganizador(postulacion.id, { estrellas, comentario: comentario.trim() || null });
      success(t('¡Gracias por tu reseña!'));
      onListo?.(); onClose();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-bg shadow-2xl p-6">
        <h3 className="text-base font-bold text-text-1 mb-1">{t('Reseña al organizador')}</h3>
        <p className="text-xs text-text-3 mb-4">{postulacion.vacante?.evento?.titulo}</p>
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setEstrellas(n)} className={`text-2xl ${n <= estrellas ? 'text-warning' : 'text-text-3'}`}>★</button>
          ))}
        </div>
        <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3} className="input rounded-xl py-2.5 text-sm resize-none w-full mb-4" placeholder={t('¿Cómo fue trabajar en este evento?')} />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost btn-sm">{t('Cancelar')}</button>
          <button onClick={enviar} disabled={saving} className="btn-primary btn-sm">{saving ? <Spinner size="sm" /> : t('Enviar reseña')}</button>
        </div>
      </div>
    </div>
  );
}
