import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

/* Grid de 12 columnas con reordenamiento drag & drop. */
export default function WidgetGrid({ visibles, onMove, children }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => { if (over) onMove(active.id, over.id); }}
    >
      <SortableContext items={visibles} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-12 gap-5">
          {children}
        </div>
      </SortableContext>
    </DndContext>
  );
}
