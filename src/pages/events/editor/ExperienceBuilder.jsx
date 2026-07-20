import { useState, useEffect, useMemo } from 'react';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import { BLOCKS, BLOCK_TYPES_SISTEMA, BLOCK_TYPES_CUSTOM } from './blocks.jsx';
import { TemplatesPicker, instanciarTemplate } from './templates.jsx';
import CanvasEditor from './canvas/CanvasEditor.jsx';

/* ──────────────────────────────────────────────────────────────────
   Event Experience · Editor de la landing — Rework (mockup del PDF)
   3 paneles: Secciones (izq) · Editar sección (centro) · Vista previa
   en vivo (der). Reutiliza toda la maquinaria de bloques existente.
   ────────────────────────────────────────────────────────────────── */

function uid(prefix = 'b') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
function defaultPages() {
  return [{ id: uid('p'), nombre: 'Inicio', blocks: BLOCK_TYPES_SISTEMA.map(type => ({ id: uid(), type, data: {} })) }];
}

export default function ExperienceBuilder({ evento, onClose }) {
  const initialPages = useMemo(() => {
    const pj = evento.page_json;
    if (pj?.pages?.length > 0) return pj.pages;
    if (Array.isArray(pj?.blocks)) return [{ id: uid('p'), nombre: 'Inicio', blocks: pj.blocks }];
    return defaultPages();
    /* eslint-disable-next-line */
  }, []);

  const [pages, setPages]       = useState(initialPages);
  const [pageId, setPageId]     = useState(initialPages[0]?.id);
  const [selId, setSelId]       = useState(initialPages[0]?.blocks?.[0]?.id || null);
  const [saving, setSaving]     = useState(false);
  const [dirty, setDirty]       = useState(false);
  const [paleta, setPaleta]     = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const { success, error: toastErr } = useToast();

  useEffect(() => {
    setDirty(JSON.stringify(pages) !== JSON.stringify(initialPages));
    /* eslint-disable-next-line */
  }, [pages]);

  const page = pages.find(p => p.id === pageId) || pages[0];
  const modoPagina = page?.modo || 'bloques';
  const setModoPagina = (m) => setPages(prev => prev.map(p => p.id === page.id ? { ...p, modo: m } : p));
  const setCanvas = (canvas) => setPages(prev => prev.map(p => p.id === page.id ? { ...p, canvas } : p));
  const sel  = page?.blocks.find(b => b.id === selId) || null;

  const setBlocks = (updater) =>
    setPages(prev => prev.map(p => p.id === page.id ? { ...p, blocks: typeof updater === 'function' ? updater(p.blocks) : updater } : p));

  const addBlock = (type) => {
    const nuevo = { id: uid(), type, data: structuredClone(BLOCKS[type].defaults || {}) };
    setBlocks(bs => [...bs, nuevo]);
    setSelId(nuevo.id);
    setPaleta(false);
  };
  const removeBlock = async (id) => {
    if (!(await confirmDialog({ title: 'Quitar sección', message: '¿Quitar esta sección de la landing?', confirmLabel: 'Quitar', danger: true }))) return;
    setBlocks(bs => bs.filter(b => b.id !== id));
    if (selId === id) setSelId(null);
  };
  const duplicateBlock = (id) => {
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id);
      if (i < 0) return bs;
      const copia = { ...bs[i], id: uid(), data: structuredClone(bs[i].data) };
      return [...bs.slice(0, i + 1), copia, ...bs.slice(i + 1)];
    });
  };
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setBlocks(bs => arrayMove(bs, bs.findIndex(b => b.id === active.id), bs.findIndex(b => b.id === over.id)));
  };

  const aplicarTemplate = async (template) => {
    if (!(await confirmDialog({ title: 'Aplicar plantilla', message: `¿Reemplazar la página "${page?.nombre}" con la plantilla "${template.nombre}"?`, confirmLabel: 'Aplicar', danger: true }))) return;
    const [first, ...rest] = instanciarTemplate(template);
    setPages(prev => [...prev.map(p => p.id === page.id ? { ...p, blocks: first.blocks } : p), ...rest]);
    setTemplatesOpen(false);
    setSelId(null);
    success(`Plantilla "${template.nombre}" aplicada.`);
  };

  const guardar = async () => {
    setSaving(true);
    try {
      await eventosApi.update(evento.id, { page_json: { ...(evento.page_json || {}), pages } });
      success('Landing guardada. El sitio público ya está actualizado.');
      setDirty(false);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-border bg-surface/90 backdrop-blur px-4 py-3 sticky top-0 z-30">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-1">Diseña la experiencia que vivirán tus asistentes</p>
          <p className="text-xs text-text-3 mt-0.5">
            {page?.blocks.length || 0} secciones{dirty && <span className="text-warning"> · cambios sin guardar</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Modo de diseño de la página */}
          <div className="flex rounded-xl border border-border bg-surface overflow-hidden">
            {[['bloques', 'Bloques'], ['lienzo', 'Lienzo libre']].map(([m, label]) => (
              <button key={m} onClick={() => setModoPagina(m)}
                className={`px-3 h-8 text-xs font-medium transition-colors
                            ${modoPagina === m ? 'bg-accent text-white' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setTemplatesOpen(true)} className="btn-secondary btn-sm">Plantillas</button>
          <a href={`/explorar/${evento.slug}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Ver sitio público</a>
          {onClose && <button onClick={onClose} className="btn-ghost btn-sm">Salir</button>}
          <button onClick={guardar} disabled={saving || !dirty} className="btn-gradient btn-sm">
            {saving ? <><Spinner size="sm" /> Guardando…</> : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {modoPagina === 'lienzo' ? (
        <CanvasEditor canvas={page?.canvas} onChange={setCanvas} evento={evento} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] xl:grid-cols-[250px_1fr_400px] gap-4 items-start">

        {/* IZQUIERDA · Secciones de la landing */}
        <aside className="rounded-2xl border border-border bg-surface/60 overflow-hidden lg:sticky lg:top-[76px]">
          <header className="px-4 py-3 border-b border-border">
            <h3 className="text-[13px] font-semibold text-text-1">Secciones de la landing</h3>
            <p className="text-[11px] text-text-3 mt-0.5">Arrastra para reordenar · toca para editar</p>
          </header>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={page?.blocks.map(b => b.id) || []} strategy={verticalListSortingStrategy}>
              <ul className="p-2 space-y-1 max-h-[46vh] overflow-y-auto no-scrollbar">
                {page?.blocks.map(b => (
                  <SeccionItem
                    key={b.id}
                    block={b}
                    activo={selId === b.id}
                    onSelect={() => setSelId(b.id)}
                    onRemove={() => removeBlock(b.id)}
                    onDuplicate={() => duplicateBlock(b.id)}
                  />
                ))}
                {(!page || page.blocks.length === 0) && (
                  <p className="text-xs text-text-3 text-center py-6 px-3">Sin secciones aún. Agrega la primera abajo.</p>
                )}
              </ul>
            </SortableContext>
          </DndContext>
          <div className="p-2 border-t border-border relative">
            <button onClick={() => setPaleta(v => !v)} className="btn-secondary btn-sm w-full justify-center">+ Agregar sección</button>
            {paleta && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setPaleta(false)} />
                <div className="absolute bottom-14 left-2 right-2 z-30 card-glass rounded-xl p-2 max-h-72 overflow-y-auto no-scrollbar space-y-0.5">
                  {[...BLOCK_TYPES_SISTEMA, ...BLOCK_TYPES_CUSTOM].map(t => {
                    const B = BLOCKS[t];
                    const yaExiste = B.category === 'sistema' && page?.blocks.some(x => x.type === t);
                    return (
                      <button
                        key={t}
                        disabled={yaExiste}
                        onClick={() => addBlock(t)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-1 hover:bg-surface-2 disabled:opacity-35 disabled:cursor-not-allowed transition-colors text-left"
                      >
                        <B.icon className="w-4 h-4 text-text-3 flex-shrink-0" />
                        {B.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* CENTRO · Editar sección */}
        <section className="min-w-0">
          {sel ? (
            <div className="rounded-2xl border border-border bg-surface/60 overflow-hidden">
              <header className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <h3 className="text-sm font-semibold text-text-1 flex items-center gap-2">
                  {(() => { const I = BLOCKS[sel.type].icon; return <I className="w-4 h-4 text-accent" />; })()}
                  Editar sección · {BLOCKS[sel.type].label}
                </h3>
                <div className="flex items-center gap-1">
                  <button onClick={() => duplicateBlock(sel.id)} className="btn-ghost btn-sm text-xs">Duplicar</button>
                  <button onClick={() => removeBlock(sel.id)} className="btn-ghost btn-sm text-xs text-danger/80 hover:text-danger">Quitar</button>
                </div>
              </header>
              <div className="p-5">
                {(() => {
                  const Ed = BLOCKS[sel.type].Editor;
                  return (
                    <Ed
                      data={sel.data}
                      evento={evento}
                      onChange={(d) => setBlocks(bs => bs.map(b => b.id === sel.id ? { ...b, data: d } : b))}
                    />
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border-2 py-20 text-center">
              <p className="text-text-2 text-sm">Selecciona una sección a la izquierda para editarla,</p>
              <p className="text-text-3 text-xs mt-1">o agrega una nueva con "+ Agregar sección".</p>
            </div>
          )}
        </section>

        {/* DERECHA · Vista previa en vivo */}
        <aside className="hidden xl:block xl:sticky xl:top-[76px]">
          <div className="rounded-2xl border border-border bg-surface/60 overflow-hidden">
            <header className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-[13px] font-semibold text-text-1">Vista previa</h3>
              <span className="text-[10px] text-text-3 uppercase tracking-widest">En vivo</span>
            </header>
            <div className="bg-bg/60 p-3">
              <div className="rounded-xl border border-border bg-bg overflow-hidden h-[62vh] overflow-y-auto no-scrollbar">
                <div className="origin-top-left scale-[0.42] w-[238%] pointer-events-none select-none p-6 space-y-8">
                  {page?.blocks.map(b => {
                    const Pv = BLOCKS[b.type].Preview;
                    return (
                      <div key={b.id} className={selId === b.id ? 'ring-2 ring-accent/70 rounded-3xl' : ''}>
                        <Pv data={b.data} evento={evento} isEditor />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
      )}

      {templatesOpen && <TemplatesPicker onPick={aplicarTemplate} onCancel={() => setTemplatesOpen(false)} />}
    </div>
  );
}

/* ── Item de la lista de secciones ── */
function SeccionItem({ block, activo, onSelect, onRemove, onDuplicate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const B = BLOCKS[block.type];
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-1.5 rounded-xl border transition-colors
                  ${activo ? 'border-accent/50 bg-accent/10' : 'border-transparent hover:bg-surface-2'}
                  ${isDragging ? 'opacity-60 z-20 relative' : ''}`}
    >
      <button {...attributes} {...listeners} aria-label="Mover" className="cursor-grab active:cursor-grabbing p-1.5 text-text-3 hover:text-text-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
      </button>
      <button onClick={onSelect} className="flex-1 flex items-center gap-2 py-2 text-left min-w-0">
        <B.icon className={`w-3.5 h-3.5 flex-shrink-0 ${activo ? 'text-accent' : 'text-text-3'}`} />
        <span className={`text-[13px] truncate ${activo ? 'text-text-1 font-medium' : 'text-text-2'}`}>{B.label}</span>
      </button>
      <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity pr-1">
        <button onClick={onDuplicate} aria-label="Duplicar" className="p-1 text-text-3 hover:text-text-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        </button>
        <button onClick={onRemove} aria-label="Quitar" className="p-1 text-text-3 hover:text-danger">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </li>
  );
}
