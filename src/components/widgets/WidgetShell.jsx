import { useState } from 'react';
import { useI18n } from '../../context/I18nContext.jsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TAMANOS } from '../../hooks/useWidgets.js';

const COLS = { sm: 'lg:col-span-4', md: 'lg:col-span-6', lg: 'lg:col-span-8', full: 'lg:col-span-12' };
const SIZE_LABEL = { sm: 'Pequeño', md: 'Mediano', lg: 'Grande', full: 'Pantalla completa' };

/* Carcasa común de todo widget: header con título, handle de arrastre
   y menú (tamaño / ocultar). El contenido lo pone cada widget. */
export default function WidgetShell({ id, titulo, size, onSize, onHide, accion, children }) {
  const { t: tr } = useI18n();
  const [menu, setMenu] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`col-span-12 ${COLS[size] || COLS.md} rounded-3xl border border-border bg-surface/60
                  backdrop-blur-sm overflow-hidden flex flex-col
                  ${isDragging ? 'opacity-70 shadow-glow z-20 relative' : ''}`}
    >
      <header className="flex items-center gap-2 px-5 py-3.5 border-b border-border flex-shrink-0">
        <button
          {...attributes} {...listeners}
          aria-label={tr('Mover widget')}
          className="cursor-grab active:cursor-grabbing text-text-3 hover:text-text-1 transition-colors -ml-1 p-1"
        >
          <GripIcon className="w-3.5 h-3.5" />
        </button>
        <h2 className="text-sm font-semibold text-text-1 flex-1 truncate">{titulo}</h2>
        {accion}
        <div className="relative">
          <button
            onClick={() => setMenu(v => !v)}
            aria-label={tr('Opciones del widget')}
            className="p-1 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors"
          >
            <DotsIcon className="w-4 h-4" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-8 z-20 w-48 card-glass rounded-xl overflow-hidden py-1.5">
                <p className="px-3.5 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-3">{tr('Tamaño')}</p>
                {TAMANOS.map(t => (
                  <button
                    key={t}
                    onClick={() => { onSize(t); setMenu(false); }}
                    className={`w-full text-left px-3.5 py-1.5 text-sm transition-colors
                                ${t === size ? 'text-accent font-medium' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}
                  >
                    {tr(SIZE_LABEL[t])}
                  </button>
                ))}
                <div className="border-t border-border mt-1.5 pt-1.5">
                  <button
                    onClick={() => { onHide(); setMenu(false); }}
                    className="w-full text-left px-3.5 py-1.5 text-sm text-text-2 hover:text-danger hover:bg-danger/5 transition-colors"
                  >
                    {tr('Ocultar widget')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

function GripIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>;
}
function DotsIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>;
}
