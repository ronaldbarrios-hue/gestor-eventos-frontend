import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { embedUrl, embedSnippet, embedFrameId, EMBED_TEMAS, EMBED_SLUG_AMIGABLE, EMBED_ESPECIALES } from '../../../lib/embed.js';

/* Exportar UNA sección de la landing como iframe: la empresa arma su web
   donde quiera y trae de GESTEK solo lo que le sirve (boletas, cómo llegar,
   llaves del torneo…). Se copia el snippet y listo. */

export default function ExportIframeModal({ evento, bloque, label, onClose }) {
  const toast = useToast();
  const [modo,   setModo]   = useState('tipo');   // tipo | exacta
  const [tema,   setTema]   = useState('auto');
  const [fondo,  setFondo]  = useState('transparente');
  const [alto,   setAlto]   = useState(600);
  const [autoAlto, setAutoAlto] = useState(true);

  const slug = evento?.slug;
  const seccion = modo === 'exacta'
    ? bloque?.id
    : (EMBED_SLUG_AMIGABLE[bloque?.type] || bloque?.type);

  const url = useMemo(
    () => embedUrl({ slug, seccion, tema, fondo, fid: embedFrameId(slug, seccion) }),
    [slug, seccion, tema, fondo]
  );
  const snippet = useMemo(
    () => embedSnippet({ slug, seccion, titulo: `${label} — ${evento?.nombre || 'Evento'}`, tema, fondo, alto, autoAlto }),
    [slug, seccion, label, evento?.nombre, tema, fondo, alto, autoAlto]
  );

  const copiar = async (texto, que) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast?.success?.(`${que} copiado`);
    } catch {
      toast?.error?.('No se pudo copiar — selecciona el texto y usa Ctrl+C');
    }
  };

  if (!slug) {
    return createPortal(
      <Fondo onClose={onClose}>
        <div className="p-6">
          <h3 className="text-base font-semibold text-text-1 mb-2">Falta la URL pública</h3>
          <p className="text-sm text-text-2">
            Este evento todavía no tiene una dirección pública (slug). Publícalo desde
            Configuración y vuelve para exportar la sección.
          </p>
          <button onClick={onClose} className="btn btn-sm mt-5">Entendido</button>
        </div>
      </Fondo>,
      document.body
    );
  }

  return createPortal(
    <Fondo onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-text-1">Exportar «{label}» como iframe</h3>
          <p className="text-xs text-text-3 mt-0.5">Pega este código en cualquier web y la sección aparece ahí, siempre actualizada.</p>
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="text-text-3 hover:text-text-1">✕</button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-0 max-h-[75vh] overflow-y-auto">
        {/* Vista previa real: es el mismo iframe que verá el visitante */}
        <div className="p-6 border-r border-border min-w-0">
          <p className="text-xs font-semibold text-text-2 mb-2">Vista previa</p>
          <div className="rounded-xl border border-border overflow-hidden bg-surface-2">
            <iframe
              key={url}
              src={url}
              title="Vista previa del embed"
              className="w-full block bg-transparent"
              style={{ height: `${Math.min(Math.max(Number(alto) || 600, 200), 900)}px`, border: 0 }}
            />
          </div>
          <p className="text-[11px] text-text-3 mt-2">
            Dentro de una web ajena, comprar abre la página del evento en una pestaña nueva
            (los pagos no funcionan bien incrustados).
          </p>
        </div>

        {/* Opciones + código */}
        <div className="p-6 space-y-5">
          <Campo label="Qué se exporta">
            <div className="space-y-1.5">
              <Radio checked={modo === 'tipo'} onChange={() => setModo('tipo')}
                titulo={`Por tipo · /${EMBED_SLUG_AMIGABLE[bloque?.type] || bloque?.type}`}
                nota="Recomendado: si borras y vuelves a crear la sección, el embed sigue vivo." />
              <Radio checked={modo === 'exacta'} onChange={() => setModo('exacta')}
                titulo="Esta sección exacta"
                nota="Útil si tienes dos secciones del mismo tipo y quieres una en concreto." />
            </div>
          </Campo>

          <Campo label="Tema">
            <select value={tema} onChange={e => setTema(e.target.value)} className="input text-sm w-full">
              {EMBED_TEMAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Campo>

          <Campo label="Fondo">
            <select value={fondo} onChange={e => setFondo(e.target.value)} className="input text-sm w-full">
              <option value="transparente">Transparente (hereda el de la web)</option>
              <option value="solido">Sólido del tema</option>
            </select>
          </Campo>

          <Campo label="Alto inicial (px)">
            <input type="number" min={200} max={2000} value={alto}
              onChange={e => setAlto(Number(e.target.value) || 600)}
              className="input text-sm w-full" />
          </Campo>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={autoAlto} onChange={e => setAutoAlto(e.target.checked)} className="mt-0.5" />
            <span className="text-xs text-text-2">
              <span className="font-medium text-text-1">Ajustar el alto solo</span><br />
              Añade unas líneas de JavaScript para que el iframe crezca con el contenido.
            </span>
          </label>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-text-2">Código para pegar</p>
              <button onClick={() => copiar(snippet, 'Código')} className="btn btn-sm">Copiar código</button>
            </div>
            <textarea readOnly value={snippet} rows={10}
              onFocus={e => e.target.select()}
              className="input w-full font-mono text-[11px] leading-relaxed resize-y" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-text-2">Solo el enlace</p>
              <button onClick={() => copiar(url, 'Enlace')} className="btn-ghost btn-sm">Copiar enlace</button>
            </div>
            <input readOnly value={url} onFocus={e => e.target.select()}
              className="input text-sm w-full font-mono text-[11px]" />
            <p className="text-[11px] text-text-3 mt-1.5">
              Sirve para Notion, Wix, WordPress o cualquier bloque de “insertar web”.
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs font-semibold text-text-2 mb-2">También puedes incrustar</p>
            <div className="space-y-1.5">
              {EMBED_ESPECIALES.map(e => (
                <div key={e.seccion} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-1">{e.label}</p>
                    <p className="text-[11px] text-text-3">{e.nota}</p>
                  </div>
                  <button
                    onClick={() => copiar(
                      embedSnippet({ slug, seccion: e.seccion, titulo: `${e.label} — ${evento?.nombre || 'Evento'}`, tema, fondo, alto, autoAlto }),
                      e.label
                    )}
                    className="btn-ghost btn-sm flex-shrink-0">
                    Copiar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Fondo>,
    document.body
  );
}

function Fondo({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         onClick={onClose}>
      <div className="w-full max-w-4xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-2 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Radio({ checked, onChange, titulo, nota }) {
  return (
    <label className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border transition-colors
                       ${checked ? 'border-accent/60 bg-accent/5' : 'border-border hover:bg-surface-2'}`}>
      <input type="radio" checked={checked} onChange={onChange} className="mt-0.5" />
      <span className="text-xs">
        <span className="font-medium text-text-1 block">{titulo}</span>
        <span className="text-text-3">{nota}</span>
      </span>
    </label>
  );
}
