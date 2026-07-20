import { useState, useRef, useCallback } from 'react';
import { ELEMENTOS, ElementoRender, ANCHO_DISENO, FUENTES_CANVAS } from './elementos.jsx';
import ImagePicker from '../../../../components/ui/ImagePicker.jsx';

/* ──────────────────────────────────────────────────────────────────
   Lienzo libre — editor tipo Canva (Rework Event Experience)
   Arrastra elementos desde la paleta al lienzo, muévelos libremente,
   redimensiona desde la esquina, cuadrícula opcional con imán, y
   panel de propiedades (texto, fuente, tamaño, color, imagen…).
   ────────────────────────────────────────────────────────────────── */

const GRID = 20;

function uid() { return `el_${Math.random().toString(36).slice(2, 9)}`; }

export default function CanvasEditor({ canvas, onChange, evento }) {
  const elementos = canvas?.elementos || [];
  const alto = canvas?.alto || 900;
  const fondo = canvas?.fondo || '';
  const [selId, setSelId] = useState(null);
  const [grid, setGrid]   = useState(true);
  const lienzoRef = useRef(null);
  const drag = useRef(null);

  const sel = elementos.find(e => e.id === selId) || null;
  const set = (patch) => onChange({ ...canvas, alto, elementos, ...patch });
  const setElementos = (next) => set({ elementos: typeof next === 'function' ? next(elementos) : next });
  const updateEl = (id, patch) =>
    setElementos(els => els.map(e => e.id === id ? { ...e, ...patch, props: { ...e.props, ...(patch.props || {}) } } : e));

  const snap = useCallback((v) => grid ? Math.round(v / GRID) * GRID : Math.round(v), [grid]);

  /* ── agregar desde la paleta ── */
  const agregar = (type) => {
    const def = ELEMENTOS[type].defaults;
    const el = { id: uid(), type, x: snap(80 + Math.random() * 120), y: snap(60 + Math.random() * 80), w: def.w, h: def.h, z: elementos.length + 1, props: structuredClone(def.props) };
    setElementos([...elementos, el]);
    setSelId(el.id);
  };

  /* ── drag / resize con punteros ── */
  const escala = () => {
    const node = lienzoRef.current;
    return node ? node.getBoundingClientRect().width / ANCHO_DISENO : 1;
  };
  const onPointerDown = (e, el, modo) => {
    e.stopPropagation();
    setSelId(el.id);
    drag.current = { id: el.id, modo, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h, k: escala() };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / d.k, dy = (e.clientY - d.sy) / d.k;
    if (d.modo === 'mover') {
      updateEl(d.id, { x: Math.max(0, snap(d.ox + dx)), y: Math.max(0, snap(d.oy + dy)) });
    } else {
      updateEl(d.id, { w: Math.max(40, snap(d.ow + dx)), h: Math.max(20, snap(d.oh + dy)) });
    }
  };
  const onPointerUp = () => {
    drag.current = null;
    window.removeEventListener('pointermove', onPointerMove);
  };

  const eliminar = (id) => { setElementos(els => els.filter(e => e.id !== id)); if (selId === id) setSelId(null); };
  const duplicar = (id) => {
    const e = elementos.find(x => x.id === id);
    if (!e) return;
    const copia = { ...e, id: uid(), x: e.x + 30, y: e.y + 30, z: elementos.length + 1, props: structuredClone(e.props) };
    setElementos([...elementos, copia]);
    setSelId(copia.id);
  };
  const traer = (id, delta) => {
    const e = elementos.find(x => x.id === id);
    if (!e) return;
    updateEl(id, { z: Math.max(1, (e.z || 1) + delta) });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[210px_1fr_300px] gap-4 items-start">
      {/* ── Paleta ── */}
      <aside className="rounded-2xl border border-border bg-surface/60 p-3 xl:sticky xl:top-[76px]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3 px-1 mb-2">Elementos</p>
        <div className="grid grid-cols-2 xl:grid-cols-1 gap-1">
          {Object.entries(ELEMENTOS).map(([type, def]) => (
            <button key={type} onClick={() => agregar(type)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors text-left">
              <def.icon className="w-4 h-4 text-text-3 flex-shrink-0" />
              {def.label}
            </button>
          ))}
        </div>
        <div className="border-t border-border mt-3 pt-3 space-y-2">
          <label className="flex items-center justify-between gap-2 px-1 cursor-pointer select-none">
            <span className="text-xs text-text-2">Cuadrícula e imán</span>
            <button type="button" role="switch" aria-checked={grid} onClick={() => setGrid(g => !g)}
              className={`relative w-8 h-4.5 h-[18px] rounded-full transition-colors ${grid ? 'bg-accent' : 'bg-surface-3'}`}>
              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${grid ? 'left-[15px]' : 'left-0.5'}`} />
            </button>
          </label>
          <div className="px-1">
            <label className="text-xs text-text-2 block mb-1">Alto del lienzo</label>
            <input type="number" min={400} step={100} value={alto}
              onChange={e => set({ alto: Number(e.target.value) || 900 })}
              className="input !h-8 text-xs w-full" />
          </div>
          <div className="px-1">
            <label className="text-xs text-text-2 block mb-1">Fondo del lienzo</label>
            <div className="flex gap-1.5">
              <input type="color" value={fondo || '#0e1116'} onChange={e => set({ fondo: e.target.value })}
                className="w-8 h-8 rounded-lg border border-border bg-surface cursor-pointer p-0.5" />
              <button onClick={() => set({ fondo: '' })} className="btn-ghost btn-sm text-[11px] flex-1">Del tema</button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Lienzo ── */}
      <div className="min-w-0">
        <div
          ref={lienzoRef}
          onPointerDown={() => setSelId(null)}
          className="relative w-full rounded-2xl border border-border overflow-hidden select-none"
          style={{
            aspectRatio: `${ANCHO_DISENO} / ${alto}`,
            background: fondo || 'rgb(var(--color-bg))',
            backgroundImage: grid
              ? 'radial-gradient(circle, rgba(139,92,246,0.18) 1px, transparent 1px)'
              : undefined,
            backgroundSize: grid ? `${GRID / ANCHO_DISENO * 100}% auto` : undefined,
          }}
        >
          {[...elementos].sort((a, b) => (a.z || 1) - (b.z || 1)).map(el => {
            const activo = el.id === selId;
            return (
              <div
                key={el.id}
                onPointerDown={(e) => onPointerDown(e, el, 'mover')}
                className={`absolute cursor-grab active:cursor-grabbing ${activo ? 'ring-2 ring-accent z-40' : 'hover:ring-1 hover:ring-accent/40'}`}
                style={{
                  left: `${el.x / ANCHO_DISENO * 100}%`,
                  top: `${el.y / alto * 100}%`,
                  width: `${el.w / ANCHO_DISENO * 100}%`,
                  height: `${el.h / alto * 100}%`,
                  borderRadius: 12,
                }}
              >
                <div className="w-full h-full pointer-events-none" style={{ fontSize: 0 }}>
                  <div className="w-full h-full" style={{ fontSize: '1rem' }}>
                    <ElementoRender el={el} evento={evento} />
                  </div>
                </div>
                {activo && (
                  <>
                    {/* Handle de resize */}
                    <span
                      onPointerDown={(e) => onPointerDown(e, el, 'resize')}
                      className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent border-2 border-white cursor-nwse-resize z-50"
                    />
                    {/* Mini-toolbar */}
                    <div className="absolute -top-9 left-0 flex items-center gap-0.5 bg-surface border border-border rounded-lg px-1 py-0.5 shadow-card z-50"
                         onPointerDown={e => e.stopPropagation()}>
                      <MiniBtn title="Subir capa" onClick={() => traer(el.id, +1)}>▲</MiniBtn>
                      <MiniBtn title="Bajar capa" onClick={() => traer(el.id, -1)}>▼</MiniBtn>
                      <MiniBtn title="Duplicar" onClick={() => duplicar(el.id)}>⧉</MiniBtn>
                      <MiniBtn title="Eliminar" danger onClick={() => eliminar(el.id)}>✕</MiniBtn>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {elementos.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-text-3">Haz clic en un elemento de la izquierda para ponerlo en el lienzo.</p>
            </div>
          )}
        </div>
        <p className="text-[11px] text-text-3 mt-2 px-1">
          Lienzo de {ANCHO_DISENO}px de diseño — en el sitio público se escala automáticamente a cada pantalla.
        </p>
      </div>

      {/* ── Propiedades ── */}
      <aside className="rounded-2xl border border-border bg-surface/60 overflow-hidden xl:sticky xl:top-[76px]">
        <header className="px-4 py-3 border-b border-border">
          <h3 className="text-[13px] font-semibold text-text-1">{sel ? `Propiedades · ${ELEMENTOS[sel.type].label}` : 'Propiedades'}</h3>
        </header>
        <div className="p-4 space-y-3.5 max-h-[62vh] overflow-y-auto no-scrollbar">
          {!sel && <p className="text-xs text-text-3">Selecciona un elemento del lienzo para editar su contenido, tamaño de letra, colores y más.</p>}
          {sel && (['titulo', 'texto'].includes(sel.type)) && (<>
            <Campo label="Texto">
              <textarea rows={3} className="input !h-auto resize-none" value={sel.props.texto || ''} onChange={e => updateEl(sel.id, { props: { texto: e.target.value } })} />
            </Campo>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Tamaño de letra">
                <input type="number" min={10} max={120} className="input" value={sel.props.fontSize || 16} onChange={e => updateEl(sel.id, { props: { fontSize: Number(e.target.value) } })} />
              </Campo>
              <Campo label="Alineación">
                <select className="input" value={sel.props.align || 'left'} onChange={e => updateEl(sel.id, { props: { align: e.target.value } })}>
                  <option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>
                </select>
              </Campo>
            </div>
            <Campo label="Fuente">
              <select className="input" value={sel.props.fuente || ''} onChange={e => updateEl(sel.id, { props: { fuente: e.target.value } })}>
                {FUENTES_CANVAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Campo>
            <div className="grid grid-cols-2 gap-2.5 items-end">
              <ColorMini label="Color" value={sel.props.color} onChange={v => updateEl(sel.id, { props: { color: v } })} />
              <label className="flex items-center gap-2 text-xs text-text-2 pb-2 cursor-pointer">
                <input type="checkbox" checked={!!sel.props.bold} onChange={e => updateEl(sel.id, { props: { bold: e.target.checked } })} />
                Negrita
              </label>
            </div>
          </>)}
          {sel?.type === 'imagen' && (<>
            <Campo label="Imagen">
              <ImagePicker value={sel.props.url || ''} onChange={v => updateEl(sel.id, { props: { url: v } })} ownerId={evento.id} placeholder="URL o subir" />
            </Campo>
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Bordes (px)">
                <input type="number" min={0} max={80} className="input" value={sel.props.radio ?? 20} onChange={e => updateEl(sel.id, { props: { radio: Number(e.target.value) } })} />
              </Campo>
              <Campo label="Ajuste">
                <select className="input" value={sel.props.ajuste || 'cover'} onChange={e => updateEl(sel.id, { props: { ajuste: e.target.value } })}>
                  <option value="cover">Recortar</option><option value="contain">Completa</option>
                </select>
              </Campo>
            </div>
          </>)}
          {sel?.type === 'boton' && (<>
            <Campo label="Texto del botón">
              <input className="input" value={sel.props.texto || ''} onChange={e => updateEl(sel.id, { props: { texto: e.target.value } })} />
            </Campo>
            <Campo label="Link (URL o /ruta)">
              <input className="input" value={sel.props.link || ''} onChange={e => updateEl(sel.id, { props: { link: e.target.value } })} placeholder="https://… o #boletas" />
            </Campo>
            <div className="grid grid-cols-3 gap-2.5">
              <Campo label="Letra">
                <input type="number" min={10} max={40} className="input" value={sel.props.fontSize || 16} onChange={e => updateEl(sel.id, { props: { fontSize: Number(e.target.value) } })} />
              </Campo>
              <ColorMini label="Texto" value={sel.props.color} onChange={v => updateEl(sel.id, { props: { color: v } })} />
              <ColorMini label="Fondo" value={sel.props.fondo} onChange={v => updateEl(sel.id, { props: { fondo: v } })} />
            </div>
          </>)}
          {sel?.type === 'countdown' && (
            <div className="grid grid-cols-2 gap-2.5">
              <Campo label="Tamaño de números">
                <input type="number" min={16} max={100} className="input" value={sel.props.fontSize || 40} onChange={e => updateEl(sel.id, { props: { fontSize: Number(e.target.value) } })} />
              </Campo>
              <ColorMini label="Color" value={sel.props.color} onChange={v => updateEl(sel.id, { props: { color: v } })} />
            </div>
          )}
          {sel?.type === 'caja' && (
            <div className="grid grid-cols-2 gap-2.5">
              <ColorMini label="Fondo" value={sel.props.fondo} onChange={v => updateEl(sel.id, { props: { fondo: v } })} />
              <Campo label="Bordes (px)">
                <input type="number" min={0} max={80} className="input" value={sel.props.radio ?? 24} onChange={e => updateEl(sel.id, { props: { radio: Number(e.target.value) } })} />
              </Campo>
            </div>
          )}
          {sel?.type === 'divisor' && (
            <ColorMini label="Color de la línea" value={sel.props.color} onChange={v => updateEl(sel.id, { props: { color: v } })} />
          )}
          {sel?.type === 'video' && (
            <Campo label="Link de YouTube o Vimeo">
              <input className="input" value={sel.props.url || ''} onChange={e => updateEl(sel.id, { props: { url: e.target.value } })} placeholder="https://youtube.com/watch?v=…" />
            </Campo>
          )}
          {sel?.type === 'boletas' && (
            <p className="text-xs text-text-3">Este bloque es funcional: en el sitio público muestra las boletas reales del evento con compra/reserva. Configúralas en Comercial → Boletas.</p>
          )}
          {sel && (<>
            <div className="border-t border-border pt-3 grid grid-cols-4 gap-2 text-center">
              {[['x', 'X'], ['y', 'Y'], ['w', 'Ancho'], ['h', 'Alto']].map(([k, l]) => (
                <div key={k}>
                  <label className="text-[10px] text-text-3 uppercase">{l}</label>
                  <input type="number" className="input !h-8 !px-1.5 text-xs text-center"
                    value={Math.round(sel[k])} onChange={e => updateEl(sel.id, { [k]: Number(e.target.value) || 0 })} />
                </div>
              ))}
            </div>
          </>)}
        </div>
      </aside>
    </div>
  );
}

function MiniBtn({ children, onClick, title, danger }) {
  return (
    <button onClick={onClick} title={title}
      className={`w-6 h-6 rounded-md text-[11px] flex items-center justify-center transition-colors
                  ${danger ? 'text-danger hover:bg-danger/10' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}>
      {children}
    </button>
  );
}
function Campo({ label, children }) {
  return <div><label className="block text-xs text-text-2 mb-1">{label}</label>{children}</div>;
}
function ColorMini({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-text-2 mb-1">{label}</label>
      <div className="flex gap-1">
        <input type="color" value={value || '#8B5CF6'} onChange={e => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-border bg-surface cursor-pointer p-0.5" />
        {value && <button onClick={() => onChange('')} className="btn-ghost btn-sm text-[10px]">Auto</button>}
      </div>
    </div>
  );
}
