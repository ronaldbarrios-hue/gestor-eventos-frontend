import { WIDGETS_META, TAMANOS } from '../../hooks/useWidgets.js';

const SIZE_LABEL = { sm: 'S', md: 'M', lg: 'L', full: 'XL' };

/* Panel lateral de personalización del Inicio. */
export default function PersonalizarPanel({ open, onClose, layout, toggle, setSize, reset, meta = WIDGETS_META, titulo = 'Personalizar Inicio' }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-[70] bg-bg/60 backdrop-blur-sm transition-opacity
                    ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-[80] h-full w-[340px] max-w-[90vw] bg-surface border-l border-border
                    flex flex-col transform transition-transform duration-300
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-1">{titulo}</h2>
            <p className="text-xs text-text-3 mt-0.5">Activa, oculta y dimensiona tus widgets.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {meta.map(w => {
            const cfg = layout.config[w.id] || {};
            return (
              <div key={w.id} className={`rounded-2xl border p-3.5 transition-colors ${cfg.visible ? 'border-accent/30 bg-accent/5' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-1">{w.titulo}</p>
                    <p className="text-xs text-text-3 leading-snug mt-0.5">{w.descripcion}</p>
                  </div>
                  <button
                    onClick={() => toggle(w.id)}
                    role="switch"
                    aria-checked={!!cfg.visible}
                    className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors mt-0.5
                                ${cfg.visible ? 'bg-accent' : 'bg-surface-3'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${cfg.visible ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {cfg.visible && (
                  <div className="flex gap-1.5 mt-2.5">
                    {TAMANOS.map(t => (
                      <button
                        key={t}
                        onClick={() => setSize(w.id, t)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                                    ${cfg.size === t ? 'bg-accent text-white' : 'bg-surface-2 text-text-2 hover:text-text-1'}`}
                      >
                        {SIZE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="px-5 py-4 border-t border-border">
          <button onClick={reset} className="btn-secondary w-full justify-center text-sm">
            Restablecer layout
          </button>
        </footer>
      </aside>
    </>
  );
}
