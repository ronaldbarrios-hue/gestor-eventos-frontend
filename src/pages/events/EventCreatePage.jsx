import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import DateTimePicker  from '../../components/ui/DateTimePicker.jsx';
import LinksEditor     from '../../components/ui/LinksEditor.jsx';
import CoverUploader   from '../../components/ui/CoverUploader.jsx';
import GalleryUploader from '../../components/ui/GalleryUploader.jsx';

const STEPS = ['Información básica', 'Imágenes', 'Fecha y lugar', 'Revisión'];

export default function EventCreatePage() {
  const navigate           = useNavigate();
  const { usuario }        = useAuth();
  const { success, error } = useToast();
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [cats,    setCats]    = useState([]);

  const [form, setForm] = useState({
    titulo            : '',
    descripcion       : '',
    categoria_id      : '',
    modalidad         : 'fisico',
    fecha_inicio      : '',
    fecha_fin         : '',
    location_nombre   : '',
    location_direccion: '',
    links             : [],
    cover_url         : '',
    gallery           : [],
    aforo_total       : '',
  });

  useEffect(() => {
    eventosApi.categorias()
      .then(d => setCats(d.categorias || []))
      .catch(() => {});
  }, []);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        titulo            : form.titulo,
        descripcion       : form.descripcion || null,
        categoria_id      : form.categoria_id || null,
        modalidad         : form.modalidad,
        fecha_inicio      : form.fecha_inicio ? new Date(form.fecha_inicio).toISOString() : null,
        fecha_fin         : form.fecha_fin    ? new Date(form.fecha_fin).toISOString()    : null,
        location_nombre   : form.location_nombre || null,
        location_direccion: form.location_direccion || null,
        links             : (form.links || []).filter(l => l.url?.trim()),
        cover_url         : form.cover_url || (form.gallery?.[0]) || null,
        gallery           : form.gallery || [],
        aforo_total       : form.aforo_total ? Number(form.aforo_total) : null,
      };
      const data = await eventosApi.create(payload);
      success('Evento creado como borrador.');
      navigate(`/eventos/${data.evento.id}`);
    } catch (e) {
      error(e.message);
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-[fadeUp_0.4s_ease_both]">
      <nav className="flex items-center gap-1.5 text-sm text-text-2">
        <Link to="/eventos" className="hover:text-text-1 transition-colors">Eventos</Link>
        <ChevronIcon className="w-3 h-3 text-text-3" />
        <span className="text-text-1">Crear evento</span>
      </nav>

      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold transition-all flex-shrink-0
                ${i < step  ? 'bg-success text-white cursor-pointer' :
                  i === step ? 'bg-gradient-primary text-white shadow-glow-sm' :
                  'bg-surface-2 text-text-3 cursor-default border border-border'}`}
            >
              {i < step ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg> : i + 1}
            </button>
            <span className={`text-xs font-medium hidden sm:block flex-shrink-0 ${i === step ? 'text-text-1' : 'text-text-3'}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${i < step ? 'bg-success' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-text-1">{STEPS[step]}</h3>
          <span className="text-xs text-text-3">{step + 1} de {STEPS.length}</span>
        </div>
        <div key={step} className="card-body space-y-4 animate-[fadeUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">

          {step === 0 && (
            <>
              <div className="field">
                <label className="label">Título del evento *</label>
                <input type="text" className="input" placeholder="Ej: Tech Summit 2026"
                  value={form.titulo} onChange={e => update('titulo', e.target.value)} required />
              </div>
              <div className="field">
                <label className="label">Descripción</label>
                <textarea rows={3} className="input resize-none" placeholder="Describe brevemente tu evento..."
                  value={form.descripcion} onChange={e => update('descripcion', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label className="label">Categoría</label>
                  <select className="input bg-surface-2" value={form.categoria_id} onChange={e => update('categoria_id', e.target.value)}>
                    <option value="">Sin categoría</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Modalidad *</label>
                  <select className="input bg-surface-2" value={form.modalidad} onChange={e => update('modalidad', e.target.value)}>
                    <option value="fisico">Físico</option>
                    <option value="virtual">Virtual</option>
                    <option value="hibrido">Híbrido</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <CoverUploader
                value={form.cover_url}
                onChange={url => update('cover_url', url)}
                ownerId={usuario?.id}
              />
              <GalleryUploader
                value={form.gallery}
                onChange={urls => update('gallery', urls)}
                ownerId={usuario?.id}
                label="Galería adicional"
              />
              <p className="text-xs text-text-3 leading-relaxed -mt-1">
                La portada se ve grande en la página pública del evento. La galería aparece debajo como carrusel.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="field">
                  <label className="label">Fecha de inicio *</label>
                  <DateTimePicker
                    value={form.fecha_inicio}
                    onChange={v => update('fecha_inicio', v)}
                    minDate={new Date()}
                    placeholder="Selecciona inicio"
                  />
                </div>
                <div className="field">
                  <label className="label">Fecha de fin</label>
                  <DateTimePicker
                    value={form.fecha_fin}
                    onChange={v => update('fecha_fin', v)}
                    minDate={form.fecha_inicio || new Date()}
                    placeholder="Selecciona fin"
                  />
                </div>
              </div>
              {(form.modalidad === 'fisico' || form.modalidad === 'hibrido') && (
                <>
                  <div className="field">
                    <label className="label">Lugar / Venue</label>
                    <input type="text" className="input" placeholder="Centro de Convenciones — Bogotá"
                      value={form.location_nombre} onChange={e => update('location_nombre', e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Dirección</label>
                    <input type="text" className="input" placeholder="Calle 26 # 59-51"
                      value={form.location_direccion} onChange={e => update('location_direccion', e.target.value)} />
                  </div>
                </>
              )}
              <LinksEditor
                value={form.links}
                onChange={links => update('links', links)}
                title={form.modalidad === 'fisico' ? 'Redes sociales del evento' : 'Streaming y redes sociales'}
              />

              <div className="field">
                <label className="label">Aforo total (capacidad estimada)</label>
                <input type="number" min="0" className="input" placeholder="100"
                  value={form.aforo_total} onChange={e => update('aforo_total', e.target.value)} />
                <p className="text-xs text-text-3 mt-1.5">Capacidad estimada total. Los tipos de ticket con cupos detallados se configuran después de crear el evento.</p>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {(form.cover_url || form.gallery?.length > 0) && (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border-2 mb-3">
                  <img src={form.cover_url || form.gallery[0]} alt="Portada" className="w-full h-full object-cover" />
                  {form.gallery?.length > 0 && (
                    <span className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-bg/85 backdrop-blur-sm border border-border-2 text-xs text-text-1 font-medium">
                      +{form.gallery.length} en galería
                    </span>
                  )}
                </div>
              )}
              <ReviewRow label="Título"        value={form.titulo || '—'} />
              <ReviewRow label="Modalidad"     value={form.modalidad} />
              <ReviewRow label="Categoría"     value={cats.find(c => c.id === form.categoria_id)?.nombre || '—'} />
              <ReviewRow label="Fecha inicio"  value={form.fecha_inicio ? new Date(form.fecha_inicio).toLocaleString('es-CO') : '—'} />
              <ReviewRow label="Fecha fin"     value={form.fecha_fin    ? new Date(form.fecha_fin).toLocaleString('es-CO')    : '—'} />
              {form.modalidad !== 'virtual' && (
                <ReviewRow label="Lugar" value={[form.location_nombre, form.location_direccion].filter(Boolean).join(' — ') || '—'} />
              )}
              <ReviewRow label="Links" value={`${(form.links || []).filter(l => l.url?.trim()).length} agregado(s)`} />
              <ReviewRow label="Aforo" value={form.aforo_total || '—'} />
              <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20 text-sm text-warning">
                <InfoIcon className="w-4 h-4 flex-shrink-0" />
                El evento se creará como <strong>borrador</strong>. Lo puedes publicar cuando esté listo.
              </div>
            </div>
          )}
        </div>

        <div className="card-footer flex items-center justify-between">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/eventos')}
            className="btn-secondary"
          >
            {step === 0 ? 'Cancelar' : '← Atrás'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 0 && !form.titulo.trim()) || (step === 2 && !form.fecha_inicio)}
              className="btn-primary"
            >
              Continuar →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="btn-gradient">
              {loading ? <><Spinner size="sm" /> Creando...</> : 'Crear evento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-xs font-medium text-text-2 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-text-1 text-right flex-1">{value}</span>
    </div>
  );
}

function ChevronIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
}
function InfoIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
