import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import GLoader from '../../components/ui/GLoader.jsx';
import DateTimePicker  from '../../components/ui/DateTimePicker.jsx';
import LinksEditor     from '../../components/ui/LinksEditor.jsx';
import CoverUploader   from '../../components/ui/CoverUploader.jsx';
import GalleryUploader from '../../components/ui/GalleryUploader.jsx';

/* Edición flat de un evento. Todos los campos visibles a la vez,
   sin wizard. Pensado para ajustes rápidos sobre borradores o publicados. */

export default function EventEditPage() {
  const { id }          = useParams();
  const navigate        = useNavigate();
  const { usuario }     = useAuth();
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [cats,    setCats]    = useState([]);
  const [form,    setForm]    = useState(null);

  useEffect(() => {
    Promise.all([
      eventosApi.get(id),
      eventosApi.categorias(),
    ]).then(([ev, c]) => {
      const e = ev.evento;
      setForm({
        titulo            : e.titulo || '',
        descripcion       : e.descripcion || '',
        categoria_id      : e.categoria_id || (e.categoria?.id) || '',
        modalidad         : e.modalidad || 'fisico',
        fecha_inicio      : toLocalInput(e.fecha_inicio),
        fecha_fin         : toLocalInput(e.fecha_fin),
        location_nombre   : e.location_nombre || '',
        location_direccion: e.location_direccion || '',
        links             : e.links || [],
        cover_url         : e.cover_url || '',
        gallery           : e.gallery || [],
        aforo_total       : e.aforo_total || '',
        pago_llave        : e.pago_llave || '',
        pago_qr_url       : e.pago_qr_url || '',
        pago_instrucciones: e.pago_instrucciones || '',
      });
      setCats(c.categorias || []);
    }).catch(e => error(e.message)).finally(() => setLoading(false));
  }, [id]);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const onSave = async () => {
    setSaving(true);
    try {
      await eventosApi.update(id, {
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
        pago_llave        : form.pago_llave?.trim() || null,
        pago_qr_url       : form.pago_qr_url?.trim() || null,
        pago_instrucciones: form.pago_instrucciones?.trim() || null,
      });
      success('Cambios guardados.');
      navigate(`/eventos/${id}`);
    } catch (e) {
      error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return (
    <GLoader size="lg" message="Cargando..." />
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 animate-[fadeUp_0.4s_ease_both]">
      <nav className="flex items-center gap-1.5 text-sm text-text-2">
        <Link to="/eventos" className="hover:text-text-1 transition-colors">Eventos</Link>
        <ChevronIcon className="w-3 h-3 text-text-3" />
        <Link to={`/eventos/${id}`} className="hover:text-text-1 transition-colors">{form.titulo || 'Detalle'}</Link>
        <ChevronIcon className="w-3 h-3 text-text-3" />
        <span className="text-text-1">Editar</span>
      </nav>

      <header>
        <h1 className="text-2xl font-bold font-display text-text-1">Editar evento</h1>
        <p className="text-sm text-text-2 mt-1">Cambia cualquier información. Los cambios se ven al instante.</p>
      </header>

      <Section title="Información">
        <Field label="Título *">
          <input type="text" className="input rounded-2xl py-3" value={form.titulo}
            onChange={e => update('titulo', e.target.value)} required />
        </Field>
        <Field label="Descripción">
          <textarea rows={3} className="input rounded-2xl py-3 resize-none"
            value={form.descripcion} onChange={e => update('descripcion', e.target.value)} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Categoría">
            <select className="input bg-surface-2 rounded-2xl py-3" value={form.categoria_id}
              onChange={e => update('categoria_id', e.target.value)}>
              <option value="">Sin categoría</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Modalidad *">
            <select className="input bg-surface-2 rounded-2xl py-3" value={form.modalidad}
              onChange={e => update('modalidad', e.target.value)}>
              <option value="fisico">Físico</option>
              <option value="virtual">Virtual</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Imágenes">
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
      </Section>

      <Section title="Fecha y lugar">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Inicio *">
            <DateTimePicker value={form.fecha_inicio} onChange={v => update('fecha_inicio', v)} minDate={null} />
          </Field>
          <Field label="Fin">
            <DateTimePicker value={form.fecha_fin} onChange={v => update('fecha_fin', v)} minDate={form.fecha_inicio || null} />
          </Field>
        </div>
        {(form.modalidad === 'fisico' || form.modalidad === 'hibrido') && (
          <>
            <Field label="Lugar / Venue">
              <input type="text" className="input rounded-2xl py-3" value={form.location_nombre}
                onChange={e => update('location_nombre', e.target.value)}
                placeholder="Centro de Convenciones, Bogotá" />
            </Field>
            <Field label="Dirección">
              <input type="text" className="input rounded-2xl py-3" value={form.location_direccion}
                onChange={e => update('location_direccion', e.target.value)}
                placeholder="Calle 26 # 59-51" />
            </Field>
            <MapaPreview lugar={form.location_nombre} direccion={form.location_direccion} />
          </>
        )}
        <LinksEditor value={form.links} onChange={links => update('links', links)}
          title={form.modalidad === 'fisico' ? 'Redes sociales' : 'Streaming y redes'} />
        <Field label="Aforo">
          <input type="number" min="0" className="input rounded-2xl py-3" value={form.aforo_total}
            onChange={e => update('aforo_total', e.target.value)} placeholder="Capacidad estimada" />
        </Field>
      </Section>

      <Section title="Pago manual (Mercado Pago)">
        <div className="rounded-2xl bg-warning/10 border border-warning/25 px-4 py-3 text-sm text-text-2 leading-relaxed">
          <p className="font-semibold text-warning-light mb-1">Sin verificación automática</p>
          <p>
            Si pegás tu llave/alias o subís un QR de Mercado Pago acá, los asistentes lo verán al reservar tickets pagos y pagarán por fuera. La boleta queda en estado <strong>emitido</strong> y tenés que confirmarla manualmente desde el tab <strong>Clientes</strong>.
          </p>
          <p className="mt-1.5 text-text-3">
            <strong>No recomendado para eventos grandes</strong> (más de ~50 asistentes pagos). Para esos casos conectá tu cuenta MP completa en <strong>Configuración → Pagos</strong> y los pagos se confirman solos por webhook.
          </p>
        </div>

        <Field label="Llave o alias de Mercado Pago">
          <input type="text" className="input rounded-2xl py-3 font-mono" value={form.pago_llave}
            onChange={e => update('pago_llave', e.target.value)}
            placeholder="ej. tu_alias_mp · tu-llave@correo.com" />
        </Field>

        <Field label="URL de imagen del QR">
          <input type="url" className="input rounded-2xl py-3 font-mono" value={form.pago_qr_url}
            onChange={e => update('pago_qr_url', e.target.value)}
            placeholder="https://..." />
          <p className="text-xs text-text-3 mt-1.5">Subí la imagen del QR de tu app MP a un host público (ej. Imgur) y pegá el link acá, o pegá el link directo del QR de cobro de MP.</p>
        </Field>

        <Field label="Instrucciones extra para el asistente">
          <textarea className="input rounded-2xl py-3 resize-none" rows={2}
            value={form.pago_instrucciones}
            onChange={e => update('pago_instrucciones', e.target.value)}
            placeholder="ej. Después de pagar, envianos el comprobante a +57 300 000 0000 por WhatsApp." />
        </Field>
      </Section>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-[var(--sidebar-w)] right-0 bg-bg/85 backdrop-blur-md border-t border-border z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-end gap-2 px-6 py-3">
          <button onClick={() => navigate(`/eventos/${id}`)} className="btn-ghost">Cancelar</button>
          <button onClick={onSave} disabled={saving || !form.titulo.trim()} className="btn-gradient">
            {saving ? <><Spinner size="sm" /> Guardando...</> : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-3xl border border-border bg-surface/40 p-6 space-y-4 animate-[fadeUp_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{title}</p>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
function ChevronIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
}

/* Mini mapa preview que se actualiza con debounce de 600ms para no spamear iframes */
function MapaPreview({ lugar, direccion }) {
  const query = [direccion, lugar].filter(Boolean).join(', ').trim();
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 600);
    return () => clearTimeout(t);
  }, [query]);

  if (!debouncedQuery) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/20 px-4 py-6 text-center text-xs text-text-3">
        Escribe el lugar o la dirección para previsualizar el mapa real.
      </div>
    );
  }

  const src = `https://www.google.com/maps?q=${encodeURIComponent(debouncedQuery)}&output=embed`;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">Vista del mapa</p>
      <div className="aspect-video rounded-2xl overflow-hidden border border-border-2">
        <iframe src={src} className="w-full h-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Mapa" />
      </div>
      <p className="text-[11px] text-text-3 mt-1.5">Los asistentes verán este mapa con botón &quot;Cómo llegar&quot; en la página pública (agregando el bloque Mapa).</p>
    </div>
  );
}

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
