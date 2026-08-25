import { useState, useMemo } from 'react';
import Icono from '../../../components/ui/Iconos.jsx';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import ImagePicker from '../../../components/ui/ImagePicker.jsx';

/* ──────────────────────────────────────────────────────────────────
   White Label del evento — Event Experience (Rework Fase 3.2)
   El corazón de iFrame: lo que el público ve al abrir la página del
   evento debe poder llevar 100% la identidad de la marca del cliente.
   Se guarda en page_json.branding y pisa el branding del organizador.
   ────────────────────────────────────────────────────────────────── */

const FUENTES = [
  { value: '',        label: 'Por defecto (Inter + Space Grotesk)' },
  { value: 'sans',    label: 'Sans — Inter' },
  { value: 'display', label: 'Display — Space Grotesk' },
  { value: 'serif',   label: 'Serif — Georgia' },
  { value: 'mono',    label: 'Mono — JetBrains' },
];
const RADIOS = [
  { value: '',     label: 'Por defecto' },
  { value: 'none', label: 'Rectos' },
  { value: 'sm',   label: 'Suaves' },
  { value: 'md',   label: 'Medios' },
  { value: 'lg',   label: 'Amplios' },
  { value: 'xl',   label: 'Máximos' },
];
/* El preset que se llama GESTEK tiene que ser GESTEK. Era el azul y el morado
   de la marca vieja, y como además son los valores por defecto del panel, esos
   dos colores aparecían en la vista previa de todo el mundo aunque la marca
   real fuera latón y noche. */
const PRESETS = [
  { nombre: 'GESTEK',    primary: '#E0B12B', accent: '#F2D66B', bg: '#12100B' },
  { nombre: 'Noche',     primary: '#8B5CF6', accent: '#EC4899', bg: '#0B0714' },
  { nombre: 'Esmeralda', primary: '#10B981', accent: '#3B82F6', bg: '#07120E' },
  { nombre: 'Fuego',     primary: '#F59E0B', accent: '#EF4444', bg: '#140B07' },
  { nombre: 'Claro',     primary: '#8A6E19', accent: '#A5811A', bg: '#F6F3EC' },
];

/* Este panel funciona de dos maneras:

   · SUELTO (`evento` y `reload`): lleva su propio estado y su propio botón de
     guardar. Es como se usa desde el espacio de trabajo del evento.

   · CONTROLADO (`valor` y `onChange`): no guarda nada por su cuenta, sino que
     va informando hacia arriba y quien lo monta guarda cuando toque. Es como
     se usa dentro del editor de la página.

   La distinción no es un capricho. Antes el panel guardaba SIEMPRE por su
   cuenta, y dentro del editor eso significaba dos botones escribiendo el
   mismo `page_json` desde copias distintas del evento: el segundo en pulsarse
   borraba lo del primero sin avisar. */
export default function WhiteLabelSection({ evento, reload, valor, onChange }) {
  const { success, error } = useToast();
  const controlado = typeof onChange === 'function';

  const base = useMemo(() => ({ ...(evento.page_json?.branding || {}) }), [evento.page_json]);
  const [propio, setPropio] = useState(base);
  const [saving, setSaving] = useState(false);
  const [paleta, setPaleta] = useState(null);      // [{hex, peso}]
  const [paletaCargando, setPaletaCargando] = useState(false);

  const b = controlado ? (valor || {}) : propio;
  const setB = (fn) => {
    const siguiente = typeof fn === 'function' ? fn(b) : fn;
    if (controlado) onChange(siguiente); else setPropio(siguiente);
  };
  const set = (k, v) => setB(prev => ({ ...prev, [k]: v }));

  /* Toma los colores de una imagen (el logo ya subido o un archivo suelto).
     Sin IA: se cuantizan los píxeles en el navegador. */
  const tomarColores = async (origen) => {
    if (!origen) return;
    setPaletaCargando(true);
    try {
      const { extraerPaleta, sugerirMarca } = await import('../../../lib/paletaImagen.js');
      const cols = await extraerPaleta(origen, { max: 6 });
      if (!cols.length) { error('No se pudieron leer colores de esa imagen.'); return; }
      setPaleta(cols);
      const sug = sugerirMarca(cols);
      if (sug) {
        setB(prev => ({ ...prev, primary: sug.primary, accent: sug.accent, bg: sug.bg }));
        success('Colores tomados de la imagen. Ajusta lo que quieras y guarda.');
      }
    } catch (e) {
      error(e.message || 'No se pudo procesar la imagen.');
    } finally { setPaletaCargando(false); }
  };

  const guardar = async () => {
    setSaving(true);
    try {
      /* Sólo la marca, en su propia columna (migración 0064). Antes esto
         mandaba `{...evento.page_json, branding}`: la copia entera del JSON
         compartido, escrita encima. Si el editor de la página había guardado
         entretanto, este botón le borraba las páginas — y al revés. Ahora
         cada uno escribe su campo y no hay nada que pisarse. */
      await eventosApi.update(evento.id, { branding: b });
      success('White Label guardado. El sitio público ya usa tu marca.');
      reload?.();
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  /* Estos son los colores que se ven cuando el evento todavía no tiene marca
     propia, así que TIENEN que ser los de GESTEK. Eran el azul y el morado de
     la marca vieja: por eso la vista previa enseñaba un evento azul mientras
     la página pública salía en latón. No era que la vista previa fallara, era
     que estaba pintando unos defaults que ya no existen en ningún sitio. */
  const primary = b.primary || '#E0B12B';
  const accent  = b.accent  || '#F2D66B';
  const bg      = b.bg      || '#12100B';
  const bgClaro = esClaro(bg);

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      {/* ── Formulario ── */}
      <div className="space-y-5">
        <Card titulo="Identidad">
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo label="Nombre de la marca / plataforma">
              <input className="input" value={b.plataforma || ''} onChange={e => set('plataforma', e.target.value)} placeholder="Ej. TechLive Events" />
            </Campo>
            <Campo label="Tagline (opcional)">
              <input className="input" value={b.tagline || ''} onChange={e => set('tagline', e.target.value)} placeholder="El futuro de la tecnología, hoy." />
            </Campo>
            <Campo label="Logo">
              <ImagePicker value={b.logo_url || ''} onChange={v => set('logo_url', v)} ownerId={evento.id} placeholder="URL del logo o subir" />
            </Campo>
            <Campo label="Favicon (pestaña del navegador)">
              <ImagePicker value={b.favicon_url || ''} onChange={v => set('favicon_url', v)} ownerId={evento.id} placeholder="URL del favicon o subir" />
            </Campo>
          </div>
        </Card>

        <Card titulo="Colores">
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map(p => (
              <button key={p.nombre}
                onClick={() => setB(prev => ({ ...prev, primary: p.primary, accent: p.accent, bg: p.bg }))}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:border-border-2 text-xs text-text-2 hover:text-text-1 transition-colors">
                <span className="flex -space-x-1">
                  <i className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: p.primary }} />
                  <i className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: p.accent }} />
                  <i className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: p.bg }} />
                </span>
                {p.nombre}
              </button>
            ))}
          </div>
          {/* Tomar la paleta de una imagen — sin IA, todo en el navegador */}
          <div className="rounded-2xl border border-border bg-surface-2/30 p-3 mb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-1 flex items-center gap-1.5"><Icono nombre="paleta" className="w-3.5 h-3.5" />Tomar colores de una imagen</p>
                <p className="text-[11px] text-text-3 mt-0.5">Saca la paleta de tu logo o de una foto. La imagen no se sube a ningún lado.</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {b.logo_url && (
                  <button onClick={() => tomarColores(b.logo_url)} disabled={paletaCargando} className="btn-ghost btn-sm">
                    Usar el logo
                  </button>
                )}
                <label className={`btn-secondary btn-sm cursor-pointer ${paletaCargando ? 'opacity-60 pointer-events-none' : ''}`}>
                  {paletaCargando ? 'Leyendo…' : 'Elegir imagen'}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; tomarColores(f); }} />
                </label>
              </div>
            </div>
            {paleta && (
              <div className="mt-3">
                <p className="text-[11px] text-text-3 mb-1.5">Tonos encontrados — clic para usar como principal:</p>
                <div className="flex flex-wrap gap-1.5">
                  {paleta.map(c => (
                    <button key={c.hex} onClick={() => set('primary', c.hex)} title={`${c.hex} · ${c.peso}%`}
                      className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg border border-border hover:border-border-2 transition-colors">
                      <i className="w-4 h-4 rounded border border-white/20" style={{ background: c.hex }} />
                      <span className="text-[10px] font-mono text-text-2">{c.hex}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <ColorCampo label="Color principal" value={primary} onChange={v => set('primary', v)} />
            <ColorCampo label="Color de acento" value={accent}  onChange={v => set('accent', v)} />
            <ColorCampo label="Fondo de la página" value={bg}   onChange={v => set('bg', v)} />
          </div>
        </Card>

        <Card titulo="Tipografía y estilo">
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo label="Tipografía">
              <select className="input" value={b.font || ''} onChange={e => set('font', e.target.value)}>
                {FUENTES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Campo>
            <Campo label="Bordes">
              <select className="input" value={b.radius || ''} onChange={e => set('radius', e.target.value)}>
                {RADIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Campo>
          </div>
        </Card>

        <Card titulo="Dominio de los enlaces">
          <div className="space-y-3">
            <Campo label="Dominio propio">
              <input className="input" value={b.dominio || ''} onChange={e => set('dominio', e.target.value)}
                placeholder="eventos.miempresa.com" />
            </Campo>
            <p className="text-xs text-text-3 leading-relaxed">
              Es el dominio con el que se arman los enlaces que ve el asistente —el de su boleta, el del QR y el que
              sale en los correos—. Vacío, se usa el dominio desde el que esté navegando.
            </p>
            <p className="text-xs text-warning leading-relaxed">
              Ojo: esto cambia cómo se escribe el enlace, no dónde vive la página. Ese dominio tiene que apuntar a
              GESTEK (añadirlo en el hosting y crear el CNAME) o los enlaces no abrirán nada.
              {b.dominio ? '' : ' Mientras esté vacío no hay riesgo: todo sigue como hoy.'}
            </p>
          </div>
        </Card>

        <Card titulo="Footer y redes">
          <div className="space-y-4">
            <Campo label="Texto del footer">
              <input className="input" value={b.footer || ''} onChange={e => set('footer', e.target.value)} placeholder="© 2026 TechLive Events. Todos los derechos reservados." />
            </Campo>
            <div className="grid sm:grid-cols-3 gap-4">
              <Campo label="Sitio web"><input className="input" value={b.web || ''} onChange={e => set('web', e.target.value)} placeholder="https://…" /></Campo>
              <Campo label="Instagram"><input className="input" value={b.instagram || ''} onChange={e => set('instagram', e.target.value)} placeholder="https://instagram.com/…" /></Campo>
              <Campo label="WhatsApp"><input className="input" value={b.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} placeholder="+57 300 000 0000" /></Campo>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={!!b.ocultar_marca}
                onClick={() => set('ocultar_marca', !b.ocultar_marca)}
                className={`relative w-9 h-5 rounded-full transition-colors ${b.ocultar_marca ? 'bg-accent' : 'bg-surface-3'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${b.ocultar_marca ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <span className="text-sm text-text-1">Ocultar "Eventos gestionados con GESTEK" en el footer</span>
            </label>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          {/* En modo controlado NO hay botón propio: guarda el editor, con
              todo lo demás y de una sola vez. Dejar aquí un segundo botón era
              justo lo que hacía que la marca se perdiera. */}
          {controlado ? (
            <p className="text-xs text-text-3 leading-snug">
              Los cambios de marca se guardan con <b className="text-text-1">Guardar cambios</b>,
              arriba, junto con el resto de la página.
            </p>
          ) : (
            <button onClick={guardar} disabled={saving} className="btn-primary">
              {saving ? 'Guardando…' : 'Guardar White Label'}
            </button>
          )}
          {/* `?gestek=1` cuando el evento publica hacia fuera (#32): esto enseña
              la marca que se está editando, y esa vive en la landing de GESTEK.
              Sin el parámetro el botón saltaría a la web del organizador. */}
          <a href={`/explorar/${evento.slug}${evento.modo_publico && evento.modo_publico !== 'gestek' ? '?gestek=1' : ''}`}
             target="_blank" rel="noreferrer" className="btn-secondary">Ver sitio público</a>
        </div>
      </div>

      {/* ── Vista previa en vivo ── */}
      <div className="lg:sticky lg:top-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-3 mb-2">Vista previa</p>
        <div className="rounded-3xl border border-border overflow-hidden shadow-card" style={{ background: bg }}>
          {/* mini navbar */}
          <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: `1px solid ${bgClaro ? '#00000014' : '#ffffff14'}` }}>
            {b.logo_url
              ? <img src={b.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
              : <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>{(b.plataforma || evento.titulo || 'E')[0].toUpperCase()}</span>}
            <span className="text-sm font-semibold" style={{ color: bgClaro ? '#0F172A' : '#F1F5F9' }}>{b.plataforma || 'Tu marca'}</span>
          </div>
          {/* mini hero */}
          <div className="p-5">
            <span className="inline-block text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full mb-3" style={{ background: `${primary}22`, color: primary }}>
              {evento.categoria?.nombre || 'Evento'}
            </span>
            <p className="text-lg font-bold leading-tight mb-1.5" style={{ color: bgClaro ? '#0F172A' : '#F1F5F9', fontFamily: b.font === 'serif' ? 'Georgia, serif' : b.font === 'mono' ? 'monospace' : 'inherit' }}>
              {evento.titulo}
            </p>
            <p className="text-xs mb-4" style={{ color: bgClaro ? '#475569' : '#94A3B8' }}>
              {b.tagline || 'Así verán tu página los asistentes.'}
            </p>
            <div className="flex gap-2">
              <span className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ background: primary, borderRadius: b.radius === 'none' ? 0 : undefined }}>Comprar boleta</span>
              <span className="px-3.5 py-1.5 rounded-xl text-xs font-medium" style={{ color: bgClaro ? '#0F172A' : '#F1F5F9', border: `1px solid ${bgClaro ? '#00000022' : '#ffffff22'}`, borderRadius: b.radius === 'none' ? 0 : undefined }}>Ver agenda</span>
            </div>
          </div>
          {/* mini footer */}
          <div className="px-5 py-3 text-center" style={{ borderTop: `1px solid ${bgClaro ? '#00000014' : '#ffffff14'}` }}>
            <p className="text-[10px]" style={{ color: bgClaro ? '#64748B' : '#64748B' }}>
              {b.footer || (b.ocultar_marca ? '' : 'Eventos gestionados con GESTEK')}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-text-3 mt-3 leading-relaxed">
          El branding del evento pisa el del organizador únicamente en la página pública de este evento.
        </p>
      </div>
    </div>
  );
}

function esClaro(hex) {
  try {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), bl = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + bl * 114) / 1000 > 150;
  } catch { return false; }
}

function Card({ titulo, children }) {
  return (
    <section className="rounded-3xl border border-border bg-surface/60 overflow-hidden">
      <header className="px-5 py-3.5 border-b border-border"><h2 className="text-sm font-semibold text-text-1">{titulo}</h2></header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
function Campo({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-2 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
function ColorCampo({ label, value, onChange }) {
  return (
    <Campo label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
               className="w-10 h-10 rounded-xl border border-border bg-surface cursor-pointer p-1" />
        <input className="input flex-1 font-mono text-xs" value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </Campo>
  );
}
