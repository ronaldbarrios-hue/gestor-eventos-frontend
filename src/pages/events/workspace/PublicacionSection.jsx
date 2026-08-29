import { useState, useMemo } from 'react';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import {
  MODOS_PUBLICACION, EMBED_ESPECIALES, EMBED_TEMAS,
  embedSnippet, embedUrl, embedFrameId,
  WIDGET_DEFECTOS, WIDGET_TAMANOS, WIDGET_SOMBRAS,
  estiloBotonWidget, widgetSnippet, widgetSnippetEnSitio,
} from '../../../lib/embed.js';

/* ──────────────────────────────────────────────────────────────────
   #32 · Publicación — a dónde lleva el enlace público del evento.

   Tres caminos que hasta ahora eran uno solo: la landing de GESTEK, la web
   propia del organizador, o la web propia con secciones de GESTEK dentro.
   Se guardan en `eventos.modo_publico` y `eventos.url_externa` (migración
   0060), columnas propias y no dentro de `page_json`: ese campo ya lo
   escriben tres sitios distintos y no hacía falta un cuarto.

   Igual que el panel de Marca, funciona de dos maneras:
     · SUELTO (`evento`, `reload`) — su estado y su botón. Espacio de trabajo.
     · CONTROLADO (`valor`, `onChange`) — informa hacia arriba y no guarda.
       Dentro del editor de la página, que guarda todo de una vez.
   ────────────────────────────────────────────────────────────────── */

function urlValida(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

export default function PublicacionSection({ evento, reload, valor, onChange }) {
  const { success, error } = useToast();
  const controlado = typeof onChange === 'function';

  const base = useMemo(() => ({
    modo_publico: evento.modo_publico || 'gestek',
    url_externa: evento.url_externa || '',
  }), [evento.modo_publico, evento.url_externa]);

  const [propio, setPropio] = useState(base);
  const [saving, setSaving] = useState(false);

  const v = controlado ? { ...base, ...(valor || {}) } : propio;
  const set = (patch) => {
    const siguiente = { ...v, ...patch };
    if (controlado) onChange(siguiente); else setPropio(siguiente);
  };

  const modoActual = MODOS_PUBLICACION.find(m => m.value === v.modo_publico) || MODOS_PUBLICACION[0];
  const faltaUrl = modoActual.pideUrl && !urlValida(v.url_externa);

  const guardar = async () => {
    if (faltaUrl) { error('Escribe la dirección de tu web antes de guardar.'); return; }
    setSaving(true);
    try {
      await eventosApi.update(evento.id, {
        modo_publico: v.modo_publico,
        url_externa: v.modo_publico === 'gestek' ? (v.url_externa || null) : v.url_externa.trim(),
      });
      success('Guardado. El enlace público del evento ya lleva a donde dijiste.');
      reload?.();
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {!controlado && (
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Publicación</h2>
          <p className="text-sm text-text-2 mt-1">
            Dónde vive la página de tu evento y qué ve quien abre el enlace.
          </p>
        </div>
      )}

      {/* ── Los tres modos ── */}
      <div className="grid sm:grid-cols-3 gap-3">
        {MODOS_PUBLICACION.map(m => {
          const activo = v.modo_publico === m.value;
          return (
            <button key={m.value} type="button"
              onClick={() => set({ modo_publico: m.value })}
              aria-pressed={activo}
              className={`text-left rounded-2xl border p-4 transition-colors ${
                activo ? 'border-accent bg-accent/10' : 'border-border bg-surface/40 hover:border-accent/50'
              }`}>
              <p className="text-sm font-semibold text-text-1">{m.label}</p>
              <p className="text-[11px] text-text-3 mt-0.5">{m.resumen}</p>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-text-2 leading-relaxed">{modoActual.detalle}</p>

      {/* ── La URL, sólo cuando el modo la necesita ── */}
      {modoActual.pideUrl && (
        <div>
          <label className="text-xs font-semibold text-text-2 block mb-1.5" htmlFor="url-externa">
            Dirección de tu web
          </label>
          <input
            id="url-externa"
            type="url"
            inputMode="url"
            value={v.url_externa}
            onChange={e => set({ url_externa: e.target.value })}
            placeholder="https://mievento.com"
            className="input w-full font-mono text-sm" />
          {faltaUrl ? (
            <p className="text-[11px] text-warning mt-1.5">
              Falta la dirección, o no empieza por <code>http://</code> o <code>https://</code>.
              Mientras esté así, el enlace público sigue mostrando la página de GESTEK.
            </p>
          ) : (
            <p className="text-[11px] text-text-3 mt-1.5">
              Quien abra <code>/explorar/{evento.slug}</code> saldrá aquí. Tu página de GESTEK
              sigue existiendo como respaldo en <code>?gestek=1</code>.
            </p>
          )}
        </div>
      )}

      {/* ── El catálogo de secciones incrustables ──
          Sólo en el modo que las usa: en los otros dos sería ruido. El botón
          de exportar sección a sección sigue estando en el editor. */}
      {v.modo_publico === 'iframe' && (
        <>
          <BotonDeRegistro evento={evento} />
          <CatalogoEmbeds evento={evento} />
        </>
      )}

      {!controlado && (
        <div className="pt-4 border-t border-border">
          <button onClick={guardar} disabled={saving || faltaUrl} className="btn-gradient">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  );
}

/* Todo lo que se puede incrustar, con el código listo para copiar.
   El tema y el alto se eligen una vez y valen para todas: quien está armando
   su web las pega seguidas y no quiere configurar ocho veces lo mismo. */
function CatalogoEmbeds({ evento }) {
  const { success, error } = useToast();
  const [tema, setTema] = useState('auto');
  const [alto, setAlto] = useState(600);
  const [abierta, setAbierta] = useState(null);

  const slug = evento.slug;

  const copiar = async (texto, que) => {
    try {
      await navigator.clipboard.writeText(texto);
      success(`${que} copiado`);
    } catch {
      error('No se pudo copiar — selecciona el texto y usa Ctrl+C');
    }
  };

  if (!slug) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/5 px-4 py-3">
        <p className="text-sm text-text-2">
          Este evento todavía no tiene dirección pública. Publícalo desde Configuración
          y aquí aparecerá el código de cada sección.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-text-1">Secciones para tu web</p>
          <p className="text-[11px] text-text-3 mt-0.5">
            Cada una se actualiza sola: si cambias las boletas aquí, cambian allí.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-3 block mb-1">Tema</label>
            <select value={tema} onChange={e => setTema(e.target.value)} className="input !h-9 text-xs">
              {EMBED_TEMAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-3 block mb-1">Alto (px)</label>
            <input type="number" min={200} max={2000} value={alto}
              onChange={e => setAlto(Number(e.target.value) || 600)}
              className="input !h-9 text-xs w-24" />
          </div>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {EMBED_ESPECIALES.map(s => {
          const titulo = `${s.label} — ${evento.titulo || 'Evento'}`;
          const snippet = embedSnippet({ slug, seccion: s.seccion, titulo, tema, alto });
          const url = embedUrl({ slug, seccion: s.seccion, tema, fid: embedFrameId(slug, s.seccion) });
          const abierto = abierta === s.seccion;
          return (
            <li key={s.seccion} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-1">{s.label}</p>
                  <p className="text-[11px] text-text-3 leading-relaxed">{s.nota}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => setAbierta(abierto ? null : s.seccion)} className="btn-ghost btn-sm">
                    {abierto ? 'Ocultar' : 'Ver'}
                  </button>
                  <button onClick={() => copiar(snippet, s.label)} className="btn btn-sm">Copiar código</button>
                </div>
              </div>

              {abierto && (
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl border border-border overflow-hidden bg-surface-2">
                    <iframe
                      src={url}
                      title={`Vista previa · ${s.label}`}
                      className="w-full block bg-transparent"
                      style={{ height: `${Math.min(Math.max(alto, 200), 700)}px`, border: 0 }} />
                  </div>
                  <textarea readOnly value={snippet} rows={6}
                    onFocus={e => e.target.select()}
                    className="input w-full font-mono text-[11px] leading-relaxed resize-y" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}


/* ── El botón de registro para la web del cliente ──────────────────────────
 *
 * Lo de abajo incrusta una SECCIÓN entera. Esto es lo otro que hacía falta y
 * no existía: sólo un botón, y al pulsarlo el registro se abre ENCIMA de su
 * página. Antes, el botón de una sección incrustada mandaba al visitante a
 * GESTEK en otra pestaña, que es justo lo que un organizador con web propia no
 * quiere: pierde a la persona en mitad de su sitio.
 *
 * Todo lo que se toca aquí sale del mismo sitio que lo aplica `widget.js`, así
 * que la vista previa es el botón de verdad y no una aproximación.
 */
function BotonDeRegistro({ evento }) {
  const { success, error } = useToast();
  const [cfg, setCfg] = useState({ ...WIDGET_DEFECTOS, degradado: false, color2: '#F2D66B', ancho: 'auto' });
  const [comoSitio, setComoSitio] = useState(false);

  const slug = evento.slug;
  const set = (patch) => setCfg(c => ({ ...c, ...patch }));

  /* El degradado es un interruptor en el panel y "hay segundo color" en el
     widget: se traduce aquí para que la casilla no tenga que borrar el color
     que el organizador ya eligió. */
  const opciones = useMemo(() => ({
    ...cfg,
    color2: cfg.degradado ? cfg.color2 : '',
  }), [cfg]);

  const snippet = useMemo(
    () => (comoSitio ? widgetSnippetEnSitio : widgetSnippet)({ slug, ...opciones }),
    [comoSitio, slug, opciones],
  );

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      success('Código del botón copiado');
    } catch {
      error('No se pudo copiar — selecciona el texto y usa Ctrl+C');
    }
  };

  if (!slug) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-text-1">Botón de registro</p>
        <p className="text-[11px] text-text-3 mt-0.5">
          Un botón en tu web. Al pulsarlo, el formulario se abre encima de tu página:
          quien se registra no sale de tu sitio.
        </p>
      </div>

      <div className="p-4 grid lg:grid-cols-[1fr_minmax(260px,320px)] gap-5 items-start">
        <div className="space-y-3 min-w-0">
          <div>
            <label className="label">Texto del botón</label>
            <input value={cfg.texto} onChange={e => set({ texto: e.target.value })}
              className="input w-full" placeholder="Registrarme" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Color etiqueta="Color" valor={cfg.color} onChange={v => set({ color: v })} />
            <Color etiqueta="Color del texto" valor={cfg.colorTexto} onChange={v => set({ colorTexto: v })} />
          </div>

          <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
            <input type="checkbox" checked={cfg.degradado}
              onChange={e => set({ degradado: e.target.checked })} className="accent-[#8B5CF6]" />
            Degradado de dos colores
          </label>

          {cfg.degradado && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Color etiqueta="Segundo color" valor={cfg.color2} onChange={v => set({ color2: v })} />
              <div>
                <label className="label">Ángulo</label>
                <select value={cfg.gradiente} onChange={e => set({ gradiente: e.target.value })} className="input w-full">
                  {['90deg', '120deg', '135deg', '180deg', 'to right', 'to bottom right'].map(g =>
                    <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Esquinas (px)</label>
              <input type="number" min={0} max={999} value={cfg.radio}
                onChange={e => set({ radio: e.target.value })} className="input w-full" />
            </div>
            <div>
              <label className="label">Borde (px)</label>
              <input type="number" min={0} max={8} value={cfg.borde}
                onChange={e => set({ borde: e.target.value })} className="input w-full" />
            </div>
            <Color etiqueta="Color del borde" valor={cfg.colorBorde === 'transparent' ? '#ffffff' : cfg.colorBorde}
              onChange={v => set({ colorBorde: v })} />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Sombra</label>
              <select value={cfg.sombra} onChange={e => set({ sombra: e.target.value })} className="input w-full">
                {Object.keys(WIDGET_SOMBRAS).map(s =>
                  <option key={s} value={s}>{{ no: 'Sin sombra', sm: 'Suave', md: 'Media', lg: 'Marcada' }[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tamaño</label>
              <select value={cfg.tamano} onChange={e => set({ tamano: e.target.value })} className="input w-full">
                {Object.keys(WIDGET_TAMANOS).map(s =>
                  <option key={s} value={s}>{{ sm: 'Pequeño', md: 'Mediano', lg: 'Grande' }[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ancho</label>
              <select value={cfg.ancho} onChange={e => set({ ancho: e.target.value })} className="input w-full">
                <option value="auto">Del texto</option>
                <option value="completo">Todo el ancho</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Así se verá</label>
            {/* Sobre un gris neutro: encima del fondo del panel, un botón
                claro parecería tener menos contraste del que tendrá en la web
                del organizador. */}
            <div className="rounded-2xl border border-border bg-[#f4f4f5] p-6 flex items-center justify-center">
              <button type="button" style={estiloBotonWidget(opciones)}>{cfg.texto || 'Registrarme'}</button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer">
            <input type="checkbox" checked={comoSitio}
              onChange={e => setComoSitio(e.target.checked)} className="accent-[#8B5CF6]" />
            Quiero colocarlo yo (varios botones o dentro de un menú)
          </label>

          <textarea readOnly value={snippet} rows={comoSitio ? 10 : 8}
            onFocus={e => e.target.select()}
            className="input w-full font-mono text-[11px] leading-relaxed resize-y" />
          <button onClick={copiar} className="btn btn-sm w-full">Copiar código</button>
          <p className="text-[11px] text-text-3 leading-relaxed">
            Pégalo en tu web donde quieras que salga el botón. El pago, si la entrada
            es de pago, se abre en una pestaña aparte: las pasarelas no funcionan
            dentro de una ventana incrustada.
          </p>
        </div>
      </div>
    </div>
  );
}

function Color({ etiqueta, valor, onChange }) {
  return (
    <div>
      <label className="label">{etiqueta}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={valor} onChange={e => onChange(e.target.value)}
          className="h-9 w-12 rounded-lg border border-border bg-transparent cursor-pointer" />
        <input value={valor} onChange={e => onChange(e.target.value)}
          className="input flex-1 font-mono text-xs" />
      </div>
    </div>
  );
}
