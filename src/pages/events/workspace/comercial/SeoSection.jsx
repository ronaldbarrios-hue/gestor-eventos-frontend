import { useState } from 'react';
import { eventosApi } from '../../../../api/eventos.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import ImagePicker from '../../../../components/ui/ImagePicker.jsx';

/* Event Experience · SEO — metadatos del sitio público del evento.
   Distinto de Comercial→Analytics (ventas): esto es cómo se ve el evento
   al compartirlo y en buscadores. Se guarda en page_json.seo y lo aplica
   EventoPublicoPage en el <head>. Sin migración. */

const DEFECTO = {
  title: '', description: '', keywords: '',
  og_image: '', canonical: '',
  ga_id: '', meta_pixel: '',
};

export default function SeoSection({ evento }) {
  const { success, error } = useToast();
  const [f, setF] = useState({ ...DEFECTO, ...(evento.page_json?.seo || {}) });
  const [saving, setSaving] = useState(false);
  const set = (patch) => setF(x => ({ ...x, ...patch }));

  const guardar = async () => {
    setSaving(true);
    try {
      await eventosApi.update(evento.id, { page_json: { ...(evento.page_json || {}), seo: f } });
      success('SEO guardado. Ya aplica en el sitio público.');
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const tituloPreview = f.title?.trim() || evento.titulo;
  const descPreview = f.description?.trim() || evento.descripcion || 'Descripción del evento…';
  const urlPreview = `${window.location.origin}/explorar/${evento.slug}`;

  return (
    <div className="grid lg:grid-cols-[1fr_minmax(360px,460px)] gap-6 items-start w-full">
      <div className="space-y-5">
        <div className="card">
          <div className="card-header"><h3 className="text-base font-semibold text-text-1">Buscadores y redes</h3></div>
          <div className="card-body space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Título SEO <span className="lowercase tracking-normal font-normal text-text-3">(≈60 caracteres)</span></label>
                <input className="input" value={f.title} onChange={e => set({ title: e.target.value })} placeholder={evento.titulo} maxLength={70} />
                <p className="text-[11px] text-text-3 mt-1">{(f.title || '').length}/60</p>
              </div>
              <div>
                <label className="label">URL canónica <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
                <input className="input font-mono text-xs" value={f.canonical} onChange={e => set({ canonical: e.target.value })} placeholder={urlPreview} />
              </div>
            </div>
            <div>
              <label className="label">Descripción <span className="lowercase tracking-normal font-normal text-text-3">(≈155 caracteres)</span></label>
              <textarea rows={3} className="input !h-auto resize-none" value={f.description} onChange={e => set({ description: e.target.value })} placeholder="Cómo aparece el evento en Google y al compartir el link." maxLength={200} />
              <p className="text-[11px] text-text-3 mt-1">{(f.description || '').length}/155</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="label">Palabras clave <span className="lowercase tracking-normal font-normal text-text-3">(separadas por coma)</span></label>
                <input className="input" value={f.keywords} onChange={e => set({ keywords: e.target.value })} placeholder="conferencia, tecnología, bogotá" />
              </div>
              <div>
                <label className="label">Imagen al compartir (Open Graph)</label>
                <ImagePicker value={f.og_image} onChange={v => set({ og_image: v })} ownerId={evento.id} placeholder="1200×630 px · por defecto usa la portada" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="text-base font-semibold text-text-1">Seguimiento y píxeles</h3>
              <p className="text-xs text-text-3 mt-0.5">IDs de analítica web (distinto del dashboard de ventas en Comercial → Analytics).</p>
            </div>
          </div>
          <div className="card-body grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Google Analytics (ID)</label>
              <input className="input font-mono text-xs" value={f.ga_id} onChange={e => set({ ga_id: e.target.value })} placeholder="G-XXXXXXX" />
            </div>
            <div>
              <label className="label">Meta Pixel (ID)</label>
              <input className="input font-mono text-xs" value={f.meta_pixel} onChange={e => set({ meta_pixel: e.target.value })} placeholder="1234567890" />
            </div>
            <p className="sm:col-span-2 text-[11px] text-text-3">Se guardan aquí; su activación en el sitio público se habilita junto con la configuración de dominios y CSP (Configuración → Seguridad).</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={guardar} disabled={saving} className="btn-primary">{saving ? 'Guardando…' : 'Guardar SEO'}</button>
        </div>
      </div>

      {/* Preview de cómo se ve al compartir */}
      <div className="space-y-3 lg:sticky lg:top-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Vista previa al compartir</p>
        <div className="rounded-2xl border border-border overflow-hidden bg-surface/60">
          <div className="aspect-[1200/630] bg-surface-2">
            {(f.og_image || evento.cover_url)
              ? <img src={f.og_image || evento.cover_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xs text-text-3">Sin imagen</div>}
          </div>
          <div className="p-3">
            <p className="text-[11px] text-text-3 truncate">{urlPreview}</p>
            <p className="text-sm font-semibold text-text-1 leading-snug line-clamp-2 mt-0.5">{tituloPreview}</p>
            <p className="text-xs text-text-2 line-clamp-2 mt-1">{descPreview}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border p-3">
          <p className="text-[11px] text-primary-light truncate">{urlPreview}</p>
          <p className="text-base text-accent-light leading-snug line-clamp-1 mt-0.5">{tituloPreview}</p>
          <p className="text-xs text-text-2 line-clamp-2 mt-0.5">{descPreview}</p>
        </div>
      </div>
    </div>
  );
}
