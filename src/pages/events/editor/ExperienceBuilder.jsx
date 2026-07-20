import { useState, useEffect, useMemo } from 'react';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import { BLOCKS, BLOCK_TYPES_SISTEMA, BLOCK_TYPES_CUSTOM } from './blocks.jsx';
import { TEMPLATES, instanciarTemplate } from './templates.jsx';
import CanvasEditor from './canvas/CanvasEditor.jsx';
import CanvasPublico from './canvas/CanvasPublico.jsx';
import { ANIMACIONES } from './canvas/elementos.jsx';

/* ──────────────────────────────────────────────────────────────────
   Event Experience · Editor UNIFICADO (Rework v3)
   Un solo lugar: secciones a la izquierda · LA PÁGINA REAL grande y
   clickeable al centro (la vista previa ES el editor) · propiedades
   y animaciones a la derecha. El Lienzo libre es un tipo de sección
   y se edita directamente en el centro. Plantillas viven dentro del
   panel de secciones.
   ────────────────────────────────────────────────────────────────── */

function uid(prefix = 'b') { return `${prefix}_${Math.random().toString(36).slice(2, 10)}`; }
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

  const [pages, setPages]   = useState(initialPages);
  const [pageId]            = useState(initialPages[0]?.id);
  const [selId, setSelId]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [verPlantillas, setVerPlantillas] = useState(false);
  const { success, error: toastErr } = useToast();

  useEffect(() => {
    setDirty(JSON.stringify(pages) !== JSON.stringify(initialPages));
    /* eslint-disable-next-line */
  }, [pages]);

  const page = pages.find(p => p.id === pageId) || pages[0];
  const sel  = page?.blocks.find(b => b.id === selId) || null;

  const setBlocks = (updater) =>
    setPages(prev => prev.map(p => p.id === page.id ? { ...p, blocks: typeof updater === 'function' ? updater(p.blocks) : updater } : p));
  const updateBlockData = (id, data) => setBlocks(bs => bs.map(b => b.id === id ? { ...b, data } : b));

  const addBlock = (type) => {
    const defaults = type === 'lienzo' ? { canvas: { alto: 620, elementos: [] } } : structuredClone(BLOCKS[type]?.defaults || {});
    const nuevo = { id: uid(), type, data: defaults };
    setBlocks(bs => [...bs, nuevo]);
    setSelId(nuevo.id);
    setPaleta(false);
  };
  const removeBlock = async (id) => {
    if (!(await confirmDialog({ title: 'Quitar sección', message: '¿Quitar esta sección de la página?', confirmLabel: 'Quitar', danger: true }))) return;
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
  const mover = (id, delta) => {
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= bs.length) return bs;
      const copia = [...bs];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  };

  const aplicarTemplate = async (template) => {
    if (!(await confirmDialog({ title: `Plantilla "${template.nombre}"`, message: 'Se reemplazarán las secciones actuales de esta página con la estructura de la plantilla (tu información del evento se mantiene).', confirmLabel: 'Aplicar plantilla', danger: true }))) return;
    const [first] = instanciarTemplate(template);
    setBlocks(first.blocks);
    setSelId(null);
    setVerPlantillas(false);
    success(`Plantilla "${template.nombre}" aplicada — así se ve con tu información.`);
  };

  const guardar = async () => {
    setSaving(true);
    try {
      await eventosApi.update(evento.id, { page_json: { ...(evento.page_json || {}), pages } });
      success('Página guardada. El sitio público ya está actualizado.');
      setDirty(false);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const tiposDisponibles = ['lienzo', ...BLOCK_TYPES_SISTEMA, ...BLOCK_TYPES_CUSTOM];
  const labelDe = (type) => type === 'lienzo' ? 'Lienzo libre' : (BLOCKS[type]?.label || type);
  const IconDe  = (type) => type === 'lienzo' ? IcLienzo : (BLOCKS[type]?.icon || IcLienzo);

  return (
    <div className="space-y-3">
      {/* ── Toolbar mínima con jerarquía ── */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/90 backdrop-blur px-4 py-2.5 sticky top-0 z-30">
        <p className="text-sm text-text-2 min-w-0 truncate">
          <span className="font-semibold text-text-1">Editor de la página pública</span>
          <span className="text-text-3"> · {page?.blocks.length || 0} secciones</span>
          {dirty && <span className="text-warning"> · cambios sin guardar</span>}
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a href={`/explorar/${evento.slug}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm" title="Ver sitio público">
            <EyeIcon className="w-4 h-4" /><span className="hidden md:inline">Ver sitio</span>
          </a>
          {onClose && <button onClick={onClose} className="btn-ghost btn-sm">Salir</button>}
          <button onClick={guardar} disabled={saving || !dirty} className="btn-gradient btn-sm">
            {saving ? <><Spinner size="sm" /> Guardando…</> : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* ── Editor unificado ── */}
      <div className="flex gap-3 items-start">

        {/* IZQUIERDA · Secciones + Plantillas */}
        <aside className="hidden lg:flex flex-col flex-shrink-0 w-[225px] rounded-2xl border border-border bg-surface/70 overflow-hidden sticky top-[64px] max-h-[calc(100vh-90px)]">
          <div className="flex border-b border-border">
            {[[false, 'Secciones'], [true, 'Plantillas']].map(([v, label]) => (
              <button key={label} onClick={() => setVerPlantillas(v)}
                className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors
                            ${verPlantillas === v ? 'text-text-1 bg-surface-2/60' : 'text-text-3 hover:text-text-1'}`}>
                {label}
              </button>
            ))}
          </div>

          {!verPlantillas ? (<>
            <ul className="flex-1 p-2 space-y-0.5 overflow-y-auto no-scrollbar">
              {page?.blocks.map((b, i) => {
                const Icon = IconDe(b.type);
                const activo = selId === b.id;
                return (
                  <li key={b.id}
                    className={`group flex items-center gap-1 rounded-xl border transition-colors cursor-pointer
                                ${activo ? 'border-accent/50 bg-accent/10' : 'border-transparent hover:bg-surface-2'}`}
                    onClick={() => { setSelId(b.id); document.getElementById(`sec-${b.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                    <span className="flex flex-col ml-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => mover(b.id, -1)} disabled={i === 0} className="text-text-3 hover:text-text-1 disabled:opacity-20 leading-none text-[9px] px-1">▲</button>
                      <button onClick={() => mover(b.id, +1)} disabled={i === page.blocks.length - 1} className="text-text-3 hover:text-text-1 disabled:opacity-20 leading-none text-[9px] px-1">▼</button>
                    </span>
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${activo ? 'text-accent' : 'text-text-3'}`} />
                    <span className={`flex-1 py-2 text-[12.5px] truncate ${activo ? 'text-text-1 font-medium' : 'text-text-2'}`}>{labelDe(b.type)}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }} aria-label="Quitar"
                      className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-text-3 hover:text-danger transition-opacity">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="p-2 border-t border-border relative">
              <button onClick={() => setPaleta(v => !v)} className="btn-secondary btn-sm w-full justify-center">+ Agregar sección</button>
              {paleta && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setPaleta(false)} />
                  <div className="absolute bottom-12 left-2 right-2 z-30 card-glass rounded-xl p-1.5 max-h-72 overflow-y-auto no-scrollbar space-y-0.5">
                    {tiposDisponibles.map(t => {
                      const Icon = IconDe(t);
                      const yaExiste = BLOCKS[t]?.category === 'sistema' && page?.blocks.some(x => x.type === t);
                      return (
                        <button key={t} disabled={yaExiste} onClick={() => addBlock(t)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-text-1 hover:bg-surface-2 disabled:opacity-35 transition-colors text-left">
                          <Icon className="w-4 h-4 text-text-3 flex-shrink-0" />
                          {labelDe(t)}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>) : (
            <ul className="flex-1 p-2 space-y-2 overflow-y-auto no-scrollbar">
              {TEMPLATES.map(t => (
                <li key={t.nombre} className="rounded-xl border border-border p-3 hover:border-accent/40 transition-colors">
                  <p className="text-[13px] font-semibold text-text-1">{t.nombre}</p>
                  {t.descripcion && <p className="text-[11px] text-text-3 leading-snug mt-0.5 line-clamp-2">{t.descripcion}</p>}
                  <p className="text-[10px] text-text-3 mt-1.5">{t.pages?.[0]?.blocks?.length || 0} secciones</p>
                  <button onClick={() => aplicarTemplate(t)} className="btn-secondary btn-sm w-full justify-center mt-2 !text-xs">
                    Aplicar con mi información
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* CENTRO · LA PÁGINA (grande, clickeable) */}
        <main className="flex-1 min-w-0">
          <div className="rounded-2xl border border-border bg-bg overflow-hidden">
            <div className="px-6 sm:px-10 py-8 space-y-6">
              {page?.blocks.map(b => {
                const activo = selId === b.id;
                if (b.type === 'lienzo') {
                  return (
                    <div key={b.id} id={`sec-${b.id}`} className={`relative rounded-2xl ${activo ? '' : 'cursor-pointer'}`}
                         onClick={() => !activo && setSelId(b.id)}>
                      {activo ? (
                        <div className="rounded-2xl border-2 border-accent/50 p-3 bg-surface/30">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <p className="text-xs font-semibold text-accent">Lienzo libre — edítalo aquí mismo</p>
                            <BarraSeccion onUp={() => mover(b.id, -1)} onDown={() => mover(b.id, +1)} onDup={() => duplicateBlock(b.id)} onDel={() => removeBlock(b.id)} onCerrar={() => setSelId(null)} />
                          </div>
                          <CanvasEditor
                            canvas={b.data?.canvas}
                            onChange={(canvas) => updateBlockData(b.id, { ...b.data, canvas })}
                            evento={evento}
                          />
                        </div>
                      ) : (
                        <div className="relative group">
                          <CanvasPublico canvas={b.data?.canvas} evento={evento} />
                          {(!b.data?.canvas?.elementos?.length) && (
                            <div className="h-40 rounded-2xl border-2 border-dashed border-border-2 flex items-center justify-center">
                              <p className="text-sm text-text-3">Lienzo libre vacío — haz clic para diseñarlo</p>
                            </div>
                          )}
                          <HoverHalo activo={false} />
                        </div>
                      )}
                    </div>
                  );
                }
                const B = BLOCKS[b.type];
                if (!B) return null;
                const Pv = B.Preview;
                return (
                  <div key={b.id} id={`sec-${b.id}`}
                       onClick={() => setSelId(activo ? null : b.id)}
                       className={`relative rounded-2xl transition-shadow cursor-pointer group
                                   ${activo ? 'ring-2 ring-accent shadow-glow-sm' : 'hover:ring-1 hover:ring-accent/40'}`}>
                    <div className="pointer-events-none">
                      <Pv data={b.data || {}} evento={evento} isEditor />
                    </div>
                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-opacity
                                     ${activo ? 'bg-accent text-white opacity-100' : 'bg-surface/90 text-text-2 opacity-0 group-hover:opacity-100'}`}>
                      {labelDe(b.type)}
                    </span>
                    {activo && (
                      <div className="absolute top-2 right-2" onClick={e => e.stopPropagation()}>
                        <BarraSeccion onUp={() => mover(b.id, -1)} onDown={() => mover(b.id, +1)} onDup={() => duplicateBlock(b.id)} onDel={() => removeBlock(b.id)} onCerrar={() => setSelId(null)} />
                      </div>
                    )}
                  </div>
                );
              })}
              {(!page || page.blocks.length === 0) && (
                <div className="py-24 text-center">
                  <p className="text-text-2 text-sm">La página está vacía — agrega secciones a la izquierda o aplica una plantilla.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* DERECHA · Propiedades + Animación (solo con selección, y no para lienzo) */}
        {sel && sel.type !== 'lienzo' && (
          <aside className="hidden xl:block flex-shrink-0 w-[310px] rounded-2xl border border-border bg-surface/80 backdrop-blur overflow-hidden sticky top-[64px] max-h-[calc(100vh-90px)]">
            <header className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-[13px] font-semibold text-text-1 truncate">{labelDe(sel.type)}</h3>
              <button onClick={() => setSelId(null)} aria-label="Cerrar" className="text-text-3 hover:text-text-1 text-xs">✕</button>
            </header>
            <div className="p-4 space-y-4 overflow-y-auto no-scrollbar max-h-[calc(100vh-150px)]">
              {(() => {
                const Ed = BLOCKS[sel.type]?.Editor;
                return Ed ? (
                  <Ed data={sel.data || {}} evento={evento} onChange={(d) => updateBlockData(sel.id, d)} />
                ) : null;
              })()}

              {/* Animación de entrada de la sección */}
              <div className="border-t border-border pt-3.5 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Animación de entrada</p>
                <select className="input" value={sel.data?._anim || ''}
                        onChange={e => updateBlockData(sel.id, { ...sel.data, _anim: e.target.value })}>
                  {ANIMACIONES.filter(a => !['maquina', 'flotar', 'pulso'].includes(a.value)).map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
                {sel.data?._anim && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs text-text-2 block mb-1">Duración (s)</label>
                      <input type="number" step={0.1} min={0.2} max={5} className="input" value={sel.data?._animDur ?? 0.8}
                             onChange={e => updateBlockData(sel.id, { ...sel.data, _animDur: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="text-xs text-text-2 block mb-1">Retraso (s)</label>
                      <input type="number" step={0.1} min={0} max={8} className="input" value={sel.data?._animDelay ?? 0}
                             onChange={e => updateBlockData(sel.id, { ...sel.data, _animDelay: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function BarraSeccion({ onUp, onDown, onDup, onDel, onCerrar }) {
  const B = ({ children, onClick, danger, title }) => (
    <button onClick={onClick} title={title}
      className={`w-6.5 h-6.5 w-[26px] h-[26px] rounded-md text-[11px] flex items-center justify-center transition-colors
                  ${danger ? 'text-danger hover:bg-danger/10' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}>
      {children}
    </button>
  );
  return (
    <div className="flex items-center gap-0.5 bg-surface border border-border rounded-lg px-1 py-0.5 shadow-card">
      <B title="Subir" onClick={onUp}>▲</B>
      <B title="Bajar" onClick={onDown}>▼</B>
      <B title="Duplicar" onClick={onDup}>⧉</B>
      <B title="Quitar" danger onClick={onDel}>✕</B>
      <B title="Cerrar edición" onClick={onCerrar}>✓</B>
    </div>
  );
}

function IcLienzo({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>; }
function EyeIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>; }
function HoverHalo() { return null; }
