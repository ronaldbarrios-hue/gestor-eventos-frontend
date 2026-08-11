import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import { eventosApi } from '../../../api/eventos.js';
import { useDatosPreview } from '../../../hooks/useDatosPreview.js';
import { useToast } from '../../../context/ToastContext.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import { BLOCKS, BLOCK_TYPES_SISTEMA, BLOCK_TYPES_CUSTOM } from './blocks.jsx';
import { TEMPLATES, instanciarTemplate } from './templates.jsx';
import CanvasEditor from './canvas/CanvasEditor.jsx';
import CanvasPublico from './canvas/CanvasPublico.jsx';
import { ANIMACIONES } from './canvas/elementos.jsx';
import { EventNavbar, blocksVisibles, resolveBranding, coverLayout, navbarConfig, NAVBAR_ALINEACION } from '../../../components/public/EventChrome.jsx';
import { BrandHeader } from '../../../components/public/Branding.jsx';
import WhiteLabelSection from '../workspace/WhiteLabelSection.jsx';
import ExportIframeModal from './ExportIframeModal.jsx';

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

/* Alturas iniciales aproximadas por tipo de sección al convertirla en pieza del lienzo. */
const ALTO_SECCION = {
  portada: 460, galeria_evento: 320, titulo: 150, descripcion: 180, info: 220,
  direccion: 120, links: 150, tickets: 420, hero: 380, texto: 200, speakers: 380,
  sponsors: 260, mapa: 380, countdown: 170, galeria: 340, video: 340, redes: 160,
  faq: 340, cta: 140, cita: 180, separador: 60, recompensas: 320, expositores: 340, mapa_evento: 420,
};

/* Convierte las secciones de la página en elementos del lienzo CONSERVANDO su
   contenido, para que todo quede movible y redimensionable sin perder nada. */
function canvasDesdeBlocks(blocks, hasCover) {
  const elementos = [];
  let y = 40;
  for (const b of (blocks || [])) {
    if (!b || b.data?.oculto) continue;
    if (hasCover && b.type === 'portada') continue; /* la portada va arriba, fuera del lienzo */
    if (b.type === 'lienzo') continue;              /* no anidamos lienzos */
    const h = ALTO_SECCION[b.type] || 300;
    elementos.push({
      id: uid('el'), type: 'bloque',
      x: 100, y, w: 1000, h, z: elementos.length + 1,
      props: { bloque: b.type, data: b.data || {} },
    });
    y += h + 40;
  }
  return { alto: Math.max(900, y + 60), elementos };
}

export default function ExperienceBuilder({ evento: eventoBase, onClose }) {
  /* El endpoint privado del evento no engancha ninguna colección, así que los
     bloques que dependen de boletas, stands o recompensas se pintaban vacíos
     dentro del editor aunque en público salieran bien. `useDatosPreview` las
     trae y deja un evento equivalente al que ve el público. */
  const { eventoCompleto: evento } = useDatosPreview(eventoBase);

  const initialPages = useMemo(() => {
    const pj = evento.page_json;
    if (pj?.pages?.length > 0) return pj.pages;
    if (Array.isArray(pj?.blocks)) return [{ id: uid('p'), nombre: 'Inicio', blocks: pj.blocks }];
    return defaultPages();
    /* eslint-disable-next-line */
  }, []);

  const [pages, setPages]   = useState(initialPages);
  const [pageId, setPageId] = useState(initialPages[0]?.id);
  const [selId, setSelId]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [verPlantillas, setVerPlantillas] = useState(false);
  const [marcaOpen, setMarcaOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [embedId, setEmbedId] = useState(null);   // sección que se está exportando como iframe
  const [navbar, setNavbar] = useState(() => navbarConfig(evento.page_json));
  const initialNavbar = useMemo(() => navbarConfig(evento.page_json), []); // eslint-disable-line

  /* La marca vive AQUÍ, en el mismo sitio que las páginas y el navbar.

     Antes la editaba el panel por su cuenta y la guardaba él solo, así que
     había dos botones escribiendo el mismo `page_json` partiendo cada uno de
     su copia vieja del evento. Guardabas la marca, se escribía bien, y al
     pulsar "Guardar cambios" el editor volvía a escribir el page_json que
     tenía en memoria —sin la marca— y la borraba sin avisar. */
  const [branding, setBranding] = useState(() => ({ ...(evento.page_json?.branding || {}) }));
  const initialBranding = useMemo(() => ({ ...(evento.page_json?.branding || {}) }), []); // eslint-disable-line

  const { success, error: toastErr } = useToast();

  useEffect(() => {
    setDirty(
      JSON.stringify(pages) !== JSON.stringify(initialPages)
      || JSON.stringify(navbar) !== JSON.stringify(initialNavbar)
      || JSON.stringify(branding) !== JSON.stringify(initialBranding)
    );
    /* eslint-disable-next-line */
  }, [pages, navbar, branding]);

  const setNav = (patch) => setNavbar(n => ({ ...n, ...patch }));

  /* ── Páginas (los "tabs" del navbar del sitio) ── */
  const agregarPagina = () => {
    const nueva = { id: uid('p'), nombre: `Página ${pages.length + 1}`, blocks: [] };
    setPages(prev => [...prev, nueva]);
    setPageId(nueva.id);
    setSelId(null);
  };
  const renombrarPagina = (id, nombre) => setPages(prev => prev.map(p => p.id === id ? { ...p, nombre } : p));
  const borrarPagina = (id) => {
    if (pages.length <= 1) { toastErr('Debe quedar al menos una página.'); return; }
    setPages(prev => {
      const rest = prev.filter(p => p.id !== id);
      if (pageId === id) setPageId(rest[0].id);
      return rest;
    });
    setSelId(null);
  };

  const page = pages.find(p => p.id === pageId) || pages[0];
  const sel  = page?.blocks?.find(b => b.id === selId) || null;
  const esLienzoPagina = page?.modo === 'lienzo';

  const setPageCanvas = (canvas) =>
    setPages(prev => prev.map(p => p.id === page.id ? { ...p, canvas } : p));

  const toggleModo = async () => {
    if (!esLienzoPagina) {
      if (!(await confirmDialog({
        title: 'Lienzo libre (página completa)',
        message: 'Tus secciones actuales se convierten en piezas del lienzo: podrás moverlas, redimensionarlas y ponerlas donde quieras (izquierda/derecha en la misma línea, como en Word/Paint). Nada se pierde: puedes volver a "Secciones" cuando quieras.',
        confirmLabel: 'Activar lienzo libre',
      }))) return;
      setPages(prev => prev.map(p => p.id === page.id
        ? { ...p, modo: 'lienzo', canvas: p.canvas?.elementos?.length ? p.canvas : canvasDesdeBlocks(p.blocks, Boolean(evento.cover_url)) }
        : p));
    } else {
      setPages(prev => prev.map(p => p.id === page.id ? { ...p, modo: undefined } : p));
    }
    setSelId(null);
  };

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
      await eventosApi.update(evento.id, { page_json: { ...(evento.page_json || {}), pages, navbar, branding } });
      success('Página guardada. El sitio público ya está actualizado.');
      setDirty(false);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragSeccion = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setBlocks(bs => arrayMove(bs, bs.findIndex(b => b.id === active.id), bs.findIndex(b => b.id === over.id)));
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
          <span className="text-text-3"> · {esLienzoPagina ? 'lienzo libre' : `${page?.blocks?.length || 0} secciones`}</span>
          {dirty && <span className="text-warning"> · cambios sin guardar</span>}
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onClose && <button onClick={onClose} className="btn-ghost btn-sm">← Volver al preview</button>}
          {/* El cambio de modo se fue abajo, a la franja de Páginas: es una
              decisión SOBRE la página que se está editando, no una salida del
              editor como las otras. Arriba quedan solo las que abren otra cosa
              o cierran, y así la barra deja de mezclar dos tipos de acción. */}
          <button onClick={() => setNavOpen(true)} className="btn-ghost btn-sm" title="Editar el navbar del sitio">
            <NavIcon className="w-4 h-4" /><span className="hidden md:inline">Navbar</span>
          </button>
          <button onClick={() => setMarcaOpen(true)} className="btn-ghost btn-sm" title="Marca / White Label del sitio">
            <PaintIcon className="w-4 h-4" /><span className="hidden md:inline">Marca</span>
          </button>
          <button onClick={guardar} disabled={saving || !dirty} className="btn-gradient btn-sm">
            {saving ? <><Spinner size="sm" /> Guardando…</> : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* En móvil los paneles de secciones/propiedades se ocultan por espacio.
          Un aviso honesto evita que "tocar una sección no hace nada" confunda. */}
      <div className="lg:hidden rounded-xl border border-border bg-surface/70 px-4 py-3 text-xs text-text-2 leading-relaxed">
        El editor por secciones se ve completo en pantalla grande. En el móvil puedes previsualizar la página y editar <b className="text-text-1">Marca</b> y <b className="text-text-1">Navbar</b> desde los botones de arriba.
      </div>

      {/* ── Páginas del sitio (los "tabs" que verá el visitante en el navbar) ── */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface/70 px-2.5 py-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-3 pl-1 pr-1 flex-shrink-0">Páginas</span>
        {pages.map(p => {
          const activa = p.id === pageId;
          return (
            <div key={p.id}
              className={`group flex items-center gap-1 rounded-xl border pl-1 pr-1 flex-shrink-0 transition-colors
                          ${activa ? 'border-accent/50 bg-accent/10' : 'border-transparent hover:bg-surface-2'}`}>
              {activa ? (
                <input
                  value={p.nombre || ''}
                  onChange={e => renombrarPagina(p.id, e.target.value)}
                  className="bg-transparent text-[12.5px] font-medium text-text-1 px-1.5 py-1 w-[110px] focus:outline-none focus:w-[150px] transition-[width]"
                  aria-label="Nombre de la página" />
              ) : (
                <button onClick={() => { setPageId(p.id); setSelId(null); }}
                  className="text-[12.5px] text-text-2 hover:text-text-1 px-1.5 py-1 max-w-[140px] truncate">
                  {p.nombre || 'Página'}
                </button>
              )}
              {pages.length > 1 && (
                <button onClick={() => borrarPagina(p.id)} aria-label="Eliminar página"
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-text-3 hover:text-danger transition-opacity">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          );
        })}
        {/* Las dos acciones de la franja, juntas y destacadas.

            Iban perdidas: "+ Página" era un botón fantasma al final de una
            fila de pestañas, y el cambio de modo estaba arriba entre cuatro
            botones que hacen cosas distintas. Son las dos decisiones que más
            se toman aquí —añadir una página y cambiar cómo se edita— y ahora
            se ven como tales, separadas de las pestañas por una línea. */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto pl-2.5 border-l border-border">
          <button
            onClick={agregarPagina}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold
                       border border-accent/45 bg-accent/10 text-text-1
                       hover:bg-accent/20 hover:border-accent/70 transition-colors"
            title="Agregar una página nueva al sitio"
          >
            <span className="text-base leading-none -mt-px">+</span> Página
          </button>

          <button
            onClick={toggleModo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold
                        border transition-colors ${
              esLienzoPagina
                ? 'border-accent bg-accent/20 text-text-1'
                : 'border-border bg-surface-2 text-text-2 hover:text-text-1 hover:border-accent/50'
            }`}
            title={esLienzoPagina
              ? 'Volver a modo Secciones: cada bloque en su sitio, uno debajo de otro'
              : 'Lienzo libre: mover y redimensionar todo a mano'}
          >
            <IcLienzo className="w-4 h-4" />
            {esLienzoPagina ? 'Modo secciones' : 'Lienzo libre'}
          </button>
        </div>
      </div>

      {/* ── Editor unificado ── */}
      <div className="flex gap-3 items-start">

        {/* IZQUIERDA · Secciones + Plantillas (oculto en modo lienzo libre; el lienzo trae su propia paleta) */}
        {!esLienzoPagina && (
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
              {page?.blocks?.map((b, i) => {
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
                    <span className={`flex-1 py-2 text-[12.5px] truncate ${activo ? 'text-text-1 font-medium' : 'text-text-2'}`}>{b.data?.titulo?.trim() || labelDe(b.type)}</span>
                    <button onClick={(e) => { e.stopPropagation(); setEmbedId(b.id); }} aria-label="Exportar como iframe (iFrame)" title="Exportar esta sección como iframe (iFrame)"
                      className="px-1.5 py-1 rounded-md text-text-3 hover:text-accent hover:bg-accent/10 transition-colors font-mono text-[10px] leading-none flex-shrink-0">{'</>'}</button>
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
                      const yaExiste = BLOCKS[t]?.category === 'sistema' && page?.blocks?.some(x => x?.type === t);
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
                  {(t.desc || t.descripcion) && <p className="text-[11px] text-text-3 leading-snug mt-0.5 line-clamp-2">{t.desc || t.descripcion}</p>}
                  <p className="text-[10px] text-text-3 mt-1.5">{t.pages?.[0]?.blocks?.length || 0} secciones</p>
                  <button onClick={() => aplicarTemplate(t)} className="btn-secondary btn-sm w-full justify-center mt-2 !text-xs">
                    Aplicar con mi información
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        )}

        {/* CENTRO · LA PÁGINA (grande, clickeable, igual al público) */}
        <main className="flex-1 min-w-0">
          <div className="rounded-2xl border border-border bg-bg overflow-hidden">
            {/* Chrome superior idéntico al público (barra secundaria + navbar + portada) */}
            <EditorTopChrome
              evento={evento}
              pages={pages}
              navbar={navbar}
              portadaData={page?.blocks?.find(x => x.type === 'portada')?.data || {}}
              onPortada={() => { const b = page?.blocks?.find(x => x.type === 'portada'); if (b) setSelId(b.id); }}
            />
            {esLienzoPagina ? (
              <div className="px-3 sm:px-5 py-5">
                <CanvasEditor canvas={page?.canvas} onChange={setPageCanvas} evento={evento} />
              </div>
            ) : (() => {
              const hasCover = Boolean(evento.cover_url);
              const visibles = blocksVisibles(page, hasCover);
              /* Solo las secciones realmente arrastrables entran al SortableContext:
                 el lienzo en edición se excluye (se edita, no se reordena). Mantener
                 items y nodos en sincronía evita que dnd-kit descuadre el layout y
                 unas secciones se monten sobre otras (bug del mapa sobre FAQ). */
              const sortableIds = visibles.filter(b => !(b.type === 'lienzo' && b.id === selId)).map(b => b.id);
              return (
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={onDragSeccion}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="px-6 sm:px-10 py-8 space-y-6">
              {visibles.map(b => {
                const activo = selId === b.id;
                if (b.type === 'lienzo' && activo) {
                  return (
                    <div key={b.id} id={`sec-${b.id}`} className="relative rounded-2xl">
                      <div className="rounded-2xl border-2 border-accent/50 p-3 bg-surface/30">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <p className="text-xs font-semibold text-accent">Lienzo libre — edítalo aquí mismo</p>
                          <BarraSeccion onUp={() => mover(b.id, -1)} onDown={() => mover(b.id, +1)} onDup={() => duplicateBlock(b.id)} onDel={() => removeBlock(b.id)} onEmbed={() => setEmbedId(b.id)} onCerrar={() => setSelId(null)} />
                        </div>
                        <CanvasEditor
                          canvas={b.data?.canvas}
                          onChange={(canvas) => updateBlockData(b.id, { ...b.data, canvas })}
                          evento={evento}
                        />
                      </div>
                    </div>
                  );
                }
                if (b.type !== 'lienzo' && !BLOCKS[b.type]) return null;
                return (
                  <SeccionSortable key={b.id} b={b} activo={activo} evento={evento}
                    label={labelDe(b.type)}
                    onSelect={() => setSelId(activo ? null : b.id)}
                    onDataChange={(d) => updateBlockData(b.id, d)}
                    barra={<BarraSeccion onUp={() => mover(b.id, -1)} onDown={() => mover(b.id, +1)} onDup={() => duplicateBlock(b.id)} onDel={() => removeBlock(b.id)} onEmbed={() => setEmbedId(b.id)} onCerrar={() => setSelId(null)} />}
                  />
                );
              })}
              {visibles.length === 0 && (
                <div className="py-24 text-center">
                  <p className="text-text-2 text-sm">La página está vacía — agrega secciones a la izquierda o aplica una plantilla.</p>
                </div>
              )}
            </div>
            </SortableContext>
            </DndContext>
              );
            })()}
          </div>
        </main>

        {/* DERECHA · Propiedades + Animación (solo con selección, y no para lienzo) */}
        {sel && sel.type !== 'lienzo' && (
          /* Columna flex con alto fijo, igual que los cajones de Marca y
             Navbar, que sí se recorren bien.

             Este panel era el raro: `block` con DOS alturas máximas encajadas,
             la del aside y la del cuerpo, calculadas cada una por su cuenta.
             Con eso el cuerpo nunca sabía cuánto sitio le quedaba de verdad y
             no aparecía su barra: para ver el final de Portada había que mover
             el scroll de la página entera.

             Las tres piezas del arreglo van juntas y ninguna vale sola: alto
             FIJO en vez de máximo, cabecera que no se encoge, y `min-h-0` en
             el cuerpo. Sin ese `min-h-0` un hijo flexible se niega a encogerse
             por debajo de su contenido, y el desbordamiento se escapa hacia
             afuera en vez de convertirse en barra. */
          <aside className="hidden lg:flex flex-col flex-shrink-0 w-[400px] xl:w-[460px] rounded-2xl border border-border bg-surface/80 backdrop-blur overflow-hidden sticky top-[64px] h-[calc(100vh-90px)]">
            <header className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <h3 className="text-[13px] font-semibold text-text-1 truncate">{labelDe(sel.type)}</h3>
              <button onClick={() => setSelId(null)} aria-label="Cerrar" className="text-text-3 hover:text-text-1 text-xs">✕</button>
            </header>
            <div className="flex-1 min-h-0 p-4 space-y-4 overflow-y-auto">
              {(() => {
                const Ed = BLOCKS[sel.type]?.Editor;
                return Ed ? (
                  <Ed data={sel.data || {}} evento={evento} onChange={(d) => updateBlockData(sel.id, d)} />
                ) : null;
              })()}

              {/* Diseño de la sección */}
              <div className="border-t border-border pt-3.5 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Diseño</p>
                <label className="text-xs text-text-2 block">Ancho de la sección</label>
                <select className="input" value={sel.data?._ancho || ''}
                        onChange={e => updateBlockData(sel.id, { ...sel.data, _ancho: e.target.value })}>
                  {ANCHOS_SECCION.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>

              {/* Animación de entrada de la sección */}
              <div className="border-t border-border pt-3.5 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Animación de entrada</p>
                <select className="input" value={sel.data?._anim || ''}
                        onChange={e => updateBlockData(sel.id, { ...sel.data, _anim: e.target.value })}>
                  {ANIMACIONES.filter(a => !['maquina', 'flotar', 'pulso', 'balanceo'].includes(a.value)).map(a => (
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

              {/* Exportar esta sección como iframe (iFrame) — visible y claro */}
              <div className="border-t border-border pt-3.5">
                <button onClick={() => setEmbedId(sel.id)} className="btn-secondary btn-sm w-full justify-center">
                  <span className="font-mono">{'</>'}</span> Exportar como iframe
                </button>
                <p className="text-[11px] text-text-3 mt-1.5">Genera el código para incrustar SOLO esta sección en otra web (iFrame).</p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Exportar sección como iframe (iFrame) */}
      {embedId && (() => {
        const b = page?.blocks?.find(x => x.id === embedId);
        if (!b) return null;
        return <ExportIframeModal evento={evento} bloque={b} label={labelDe(b.type)} onClose={() => setEmbedId(null)} />;
      })()}

      {/* Drawer: Marca / White Label — la identidad del sitio público se edita aquí mismo.
          En PORTAL al body: dentro del árbol, los ancestros con transform rompían el `fixed`
          y el panel se fusionaba con la barra superior. */}
      {marcaOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] bg-black/25" onClick={() => setMarcaOpen(false)} />
          <aside className="fixed top-0 right-0 z-[9999] h-full w-[1040px] max-w-[96vw] bg-bg border-l border-border flex flex-col shadow-2xl">
            <header className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-text-1">Marca · White Label</h2>
                <p className="text-xs text-text-3 mt-0.5">Logo, colores, tipografía y footer del sitio público.</p>
              </div>
              <button onClick={() => setMarcaOpen(false)} aria-label="Cerrar" className="w-9 h-9 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-5">
              <WhiteLabelSection evento={evento} valor={branding} onChange={setBranding} />
            </div>
          </aside>
        </>,
        document.body,
      )}

      {/* Drawer: Navbar del sitio (portal al body, igual que Marca) */}
      {navOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] bg-black/25" onClick={() => setNavOpen(false)} />
          <aside className="fixed top-0 right-0 z-[9999] h-full w-[520px] max-w-[96vw] bg-bg border-l border-border flex flex-col shadow-2xl">
            <header className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-text-1">Navbar del sitio</h2>
                <p className="text-xs text-text-3 mt-0.5">Posición, botones y enlaces de la barra superior.</p>
              </div>
              <button onClick={() => setNavOpen(false)} aria-label="Cerrar" className="w-9 h-9 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <label className="text-xs text-text-2 block mb-2">Posición del menú de páginas</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']].map(([v, l]) => (
                    <button key={v} onClick={() => setNav({ alineacion: v })}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${navbar.alineacion === v ? 'border-accent bg-accent/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="flex items-center justify-between gap-3 text-sm text-text-2 cursor-pointer">
                  <span>Mostrar "Explorar eventos"</span>
                  <input type="checkbox" checked={navbar.mostrar_explorar} onChange={e => setNav({ mostrar_explorar: e.target.checked })} className="accent-[#8B5CF6] w-4 h-4" />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm text-text-2 cursor-pointer">
                  <span>Mostrar "Compartir"</span>
                  <input type="checkbox" checked={navbar.mostrar_compartir} onChange={e => setNav({ mostrar_compartir: e.target.checked })} className="accent-[#8B5CF6] w-4 h-4" />
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-text-2">Enlaces personalizados</label>
                  <button onClick={() => setNav({ enlaces: [...navbar.enlaces, { label: '', url: '' }] })} className="text-xs text-accent hover:underline">+ Agregar</button>
                </div>
                <div className="space-y-2">
                  {navbar.enlaces.length === 0 && <p className="text-xs text-text-3">Sin enlaces extra. Agrega botones que lleven a donde quieras.</p>}
                  {navbar.enlaces.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={l.label} onChange={e => setNav({ enlaces: navbar.enlaces.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x) })} placeholder="Texto" className="input !h-9 flex-1" />
                      <input value={l.url} onChange={e => setNav({ enlaces: navbar.enlaces.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x) })} placeholder="https://…" className="input !h-9 flex-1 font-mono text-xs" />
                      <button onClick={() => setNav({ enlaces: navbar.enlaces.filter((_, idx) => idx !== i) })} className="text-text-3 hover:text-danger w-8 h-8 flex items-center justify-center flex-shrink-0 text-lg">×</button>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-text-3 border-t border-border pt-3">Los cambios se ven arriba en la vista previa. Guarda con "Guardar cambios".</p>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </div>
  );
}

function PaintIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 00-2 2 2 2 0 104 0m6-11h4a2 2 0 012 2v3a2 2 0 01-2 2h-2" /></svg>; }
function NavIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="5" width="18" height="6" rx="2" /><path strokeLinecap="round" d="M7 8h4" /></svg>; }

/* Mismas clases que el público, para que la animación de entrada se VEA
   en el editor al cambiarla (antes solo se aplicaba en el sitio público). */
const ANIM_CLASE = {
  aparecer: 'gk-anim-fade', subir: 'gk-anim-up', bajar: 'gk-anim-down', zoom: 'gk-anim-zoom',
  izq: 'gk-anim-left', der: 'gk-anim-right', rebote: 'gk-anim-bounce',
  girar: 'gk-anim-rotate', voltear: 'gk-anim-flip', desenfoque: 'gk-anim-blur',
};

export const ANCHOS_SECCION = [
  { value: '',          label: 'Normal (contenido)' },
  { value: 'full',      label: 'Ancho completo' },
  { value: 'angosto',   label: 'Angosto (centrado)' },
];
export function claseAncho(v) {
  if (v === 'full') return 'max-w-none';
  if (v === 'angosto') return 'max-w-xl mx-auto';
  return 'max-w-4xl mx-auto';
}

function SeccionSortable({ b, activo, evento, label, onSelect, barra, onDataChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const esLienzo = b.type === 'lienzo';
  const B = BLOCKS[b.type];
  /* Cuando la sección está seleccionada, sus sub-elementos (speakers, FAQ,
     galería, redes) se pueden arrastrar directamente en la vista previa. */
  const reorder = activo && onDataChange ? { onChange: onDataChange } : undefined;
  return (
    <div ref={setNodeRef} id={`sec-${b.id}`}
         style={{ transform: CSS.Transform.toString(transform), transition }}
         onClick={onSelect}
         className={`relative rounded-2xl transition-shadow cursor-pointer group isolate
                     ${activo ? 'ring-2 ring-accent shadow-glow-sm' : 'hover:ring-1 hover:ring-accent/40'}
                     ${isDragging ? 'opacity-70 z-30' : ''}`}>
      {/* key con los ajustes de animación: al cambiarlos se remonta y la animación
          se reproduce en el editor, no solo en el sitio público. */}
      <div key={`anim-${b.data?._anim || ''}-${b.data?._animDur ?? ''}-${b.data?._animDelay ?? ''}`}
        className={`pointer-events-none overflow-hidden rounded-2xl ${esLienzo ? '' : claseAncho(b.data?._ancho)} ${ANIM_CLASE[b.data?._anim] || ''}`}
        style={b.data?._anim ? { animationDuration: `${b.data?._animDur ?? 0.8}s`, animationDelay: `${b.data?._animDelay ?? 0}s` } : undefined}>
        {esLienzo ? (
          b.data?.canvas?.elementos?.length
            ? <CanvasPublico canvas={b.data?.canvas} evento={evento} />
            : <div className="h-40 rounded-2xl border-2 border-dashed border-border-2 flex items-center justify-center"><p className="text-sm text-text-3">Lienzo libre vacío — haz clic para diseñarlo</p></div>
        ) : (
          <B.Preview data={b.data || {}} evento={evento} isEditor reorder={reorder} />
        )}
      </div>
      {/* Grip de arrastre — visible en hover, siempre en activo */}
      <button {...attributes} {...listeners} onClick={e => e.stopPropagation()} aria-label="Arrastrar sección"
        className={`absolute top-2 left-2 w-7 h-7 rounded-lg bg-surface/95 border border-border text-text-3 hover:text-text-1
                    flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity z-10
                    ${activo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
      </button>
      <span className={`absolute top-2 left-11 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-opacity
                       ${activo ? 'bg-accent text-white opacity-100' : 'bg-surface/90 text-text-2 opacity-0 group-hover:opacity-100'}`}>
        {label}
      </span>
      {activo && <div className="absolute top-2 right-2 z-10" onClick={e => e.stopPropagation()}>{barra}</div>}
    </div>
  );
}

function BarraSeccion({ onUp, onDown, onDup, onDel, onEmbed, onCerrar }) {
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
      {onEmbed && <B title="Exportar como iframe (incrustar en otra web)" onClick={onEmbed}>{'</>'}</B>}
      <B title="Quitar" danger onClick={onDel}>✕</B>
      <B title="Cerrar edición" onClick={onCerrar}>✓</B>
    </div>
  );
}

function IcLienzo({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>; }
function EyeIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>; }

/* Representación fiel (no interactiva) del chrome superior del sitio público:
   barra secundaria (Explorar eventos + Rueda/Torneo/Agenda + Compartir),
   navbar/píldora de páginas y portada. Así el editor se ve igual que el
   público — el único punto interactivo es la portada, que al hacer clic
   selecciona el bloque "Portada" para editarlo. */
function EditorTopChrome({ evento, pages, onPortada, portadaData, navbar = {} }) {
  const hasCover = Boolean(evento.cover_url);
  const { organizador, nombreOrg } = resolveBranding(evento);
  const { contenido: coverContenido, ratio: coverRatio } = coverLayout(portadaData);
  const nav = { alineacion: 'center', mostrar_explorar: true, mostrar_compartir: true, enlaces: [], ...navbar };
  const pillAlign = NAVBAR_ALINEACION[nav.alineacion] || 'justify-center';
  const Chip = ({ children }) => (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm text-text-2">{children}</span>
  );
  return (
    <div className="select-none">
      {/* Barra secundaria (representación · configurable desde "Navbar") */}
      <div className="pointer-events-none flex items-center justify-between gap-3 px-6 sm:px-10 pt-5 flex-wrap min-h-[1px]">
        {nav.mostrar_explorar ? (
          <Chip>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Explorar eventos
          </Chip>
        ) : <span />}
        <div className="flex items-center gap-2 flex-wrap">
          {evento.tiene_networking && <Chip>🤝 Rueda de Negocios</Chip>}
          {evento.tiene_torneo && <Chip>Ver Torneo</Chip>}
          {evento.tiene_agenda && <Chip>📅 Ver Agenda</Chip>}
          {nav.enlaces.map((l, i) => <Chip key={i}>{l.label}</Chip>)}
          {nav.mostrar_compartir && (
            <Chip>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Compartir
            </Chip>
          )}
        </div>
      </div>

      {hasCover ? (
        <div className="px-6 sm:px-10 pt-4">
          <div className={`pointer-events-none flex ${pillAlign} relative z-10 mb-[-14px]`}>
            <EventNavbar evento={evento} pages={pages} activeIdx={0} />
          </div>
          <div className={`rounded-3xl overflow-hidden border border-border cursor-pointer group relative bg-surface-2 ${coverContenido ? 'max-w-3xl mx-auto' : ''}`}
               style={{ aspectRatio: coverRatio }} onClick={onPortada}>
            <img src={evento.cover_url} alt={evento.titulo} className="w-full h-full object-cover" />
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-surface/90 text-text-2 opacity-0 group-hover:opacity-100 transition-opacity">Portada (clic para editar)</span>
          </div>
          {nombreOrg && (
            <p className="text-xs text-text-3 text-center mt-3">
              Presentado por <span className="text-text-2 font-medium">{nombreOrg}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="pointer-events-none px-6 sm:px-10 pt-4">
          <BrandHeader organizador={organizador} size="lg" />
          {pages.length > 1 && (
            <div className={`flex ${pillAlign} mt-6`}>
              <EventNavbar evento={evento} pages={pages} activeIdx={0} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
