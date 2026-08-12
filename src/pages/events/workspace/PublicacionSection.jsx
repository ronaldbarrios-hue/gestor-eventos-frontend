import { useState, useMemo } from 'react';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import {
  MODOS_PUBLICACION, EMBED_ESPECIALES, EMBED_TEMAS,
  embedSnippet, embedUrl, embedFrameId,
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
      {v.modo_publico === 'iframe' && <CatalogoEmbeds evento={evento} />}

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
