import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext.jsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TAMANOS } from '../../hooks/useWidgets.js';

const COLS = { sm: 'lg:col-span-4', md: 'lg:col-span-6', lg: 'lg:col-span-8', full: 'lg:col-span-12' };
const SIZE_LABEL = { sm: 'Pequeño', md: 'Mediano', lg: 'Grande', full: 'Pantalla completa' };

const MENU_ANCHO = 192;   // w-48
const MENU_ALTO  = 196;   // cuatro tamaños + separador + ocultar

/* Carcasa común de todo widget: header con título, handle de arrastre
   y menú (tamaño / ocultar). El contenido lo pone cada widget. */
export default function WidgetShell({ id, titulo, size, onSize, onHide, accion, children }) {
  const { t: tr } = useI18n();
  const [menu, setMenu] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  /* #44 · El menú se recortaba en los widgets bajos.

     Iba `absolute` dentro de la tarjeta, y la tarjeta lleva `overflow-hidden`
     por las esquinas redondeadas. En un widget alto el menú cabía dentro y
     no se notaba; en uno bajo —Ventas, Calendario— sobresalía del alto y se
     cortaba justo por la mitad. No era un problema de z-index: nada que viva
     dentro de un `overflow-hidden` puede salir de él.

     Se saca al body con un portal y se coloca desde la posición del botón,
     el mismo patrón que ya usaba la lista de espera. De paso se voltea hacia
     arriba si no cabe por debajo, que es justo el caso de los widgets del
     final de la página. */
  useLayoutEffect(() => {
    if (!menu || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const cabeDebajo = r.bottom + 6 + MENU_ALTO <= window.innerHeight - 8;
    setPos({
      top : cabeDebajo ? r.bottom + 6 : Math.max(8, r.top - 6 - MENU_ALTO),
      left: Math.max(8, Math.min(r.right - MENU_ANCHO, window.innerWidth - MENU_ANCHO - 8)),
    });
  }, [menu]);

  /* Al hacer scroll o redimensionar, un menú colocado en coordenadas de
     pantalla se queda flotando donde ya no está su botón. Se cierra. */
  useLayoutEffect(() => {
    if (!menu) return undefined;
    const cerrar = () => setMenu(false);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [menu]);

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
        <div>
          <button
            ref={btnRef}
            onClick={() => setMenu(v => !v)}
            aria-label={tr('Opciones del widget')}
            aria-expanded={menu}
            className="p-1 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors"
          >
            <DotsIcon className="w-4 h-4" />
          </button>
          {menu && createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setMenu(false)} />
              <div
                className="fixed z-[9999] w-48 card-glass rounded-xl overflow-hidden py-1.5 shadow-2xl"
                style={{ top: pos.top, left: pos.left }}
              >
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
            </>,
            document.body,
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
