import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* Reordenar los sub-elementos ARRASTRÁNDOLOS en la vista previa.
 *
 * Cuando un bloque con lista está seleccionado en el editor, sus elementos se
 * pueden mover directamente sobre la vista —bajar el segundo ponente, subir una
 * foto— en vez de en un panel aparte. El público nunca recibe `reorder`, así
 * que allí no pasa nada.
 *
 * Se trabaja con los índices REALES del array completo aunque en pantalla se
 * vean filtrados: así el orden que se guarda es el que se ve.
 *
 * ── Por qué vive en su propio archivo ────────────────────────────────────
 *
 * Por `@dnd-kit`, que son 16 kB comprimidos. Estaba dentro de `blocks.jsx`, y
 * `blocks.jsx` lo importan cuatro páginas PÚBLICAS — así que el formulario de
 * registro metido dentro de la web de un cliente se descargaba una librería de
 * arrastrar y soltar para no arrastrar nada.
 *
 * Aquí fuera, `blocks.jsx` se queda sin una sola línea de dnd-kit y el módulo
 * llega con un `import()` perezoso que sólo dispara el editor. Se midió antes
 * de moverlo: el trozo del embebido lo traía.
 */

/* La estrategia se pide por NOMBRE y no se pasa el objeto de dnd-kit.
   Si el que llama tuviera que importarla, volvería a arrastrar la librería
   —que es exactamente lo que se está evitando— y el archivo quedaría partido
   en el papel y junto en el paquete. */
const ESTRATEGIAS = {
  rejilla: rectSortingStrategy,
  lista: verticalListSortingStrategy,
};

export default function PreviewReorder({ visibleIndices, onMove, estrategia, className, renderItem }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => { if (over && active.id !== over.id) onMove(Number(active.id), Number(over.id)); }}>
      <SortableContext items={visibleIndices.map(String)} strategy={ESTRATEGIAS[estrategia] || ESTRATEGIAS.lista}>
        <div className={className}>
          {visibleIndices.map(realIdx => (
            <PreviewSortable key={realIdx} id={String(realIdx)}>{renderItem(realIdx)}</PreviewSortable>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function PreviewSortable({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${isDragging ? 'opacity-80 z-30' : ''}`}>
      {/* Handle SIEMPRE visible (la sección seleccionada es pointer-events-none,
          así que un handle por hover nunca se vería). pointer-events-auto lo
          reactiva solo a él para poder arrastrar. */}
      <button {...attributes} {...listeners} type="button" aria-label="Arrastrar para reordenar" title="Arrastra para reordenar"
        onClick={e => e.stopPropagation()}
        className="pointer-events-auto absolute left-1.5 top-1.5 z-20 w-6 h-6 rounded-md bg-accent/90 hover:bg-accent border border-white/20 text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-card">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
      </button>
      {children}
    </div>
  );
}
