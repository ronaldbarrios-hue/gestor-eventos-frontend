import { useState, useRef, useCallback } from 'react';
import { ELEMENTOS, ElementoRender, ANCHO_DISENO, FUENTES_CANVAS, ANIMACIONES, BLOQUES_INCRUSTABLES, FIGURAS } from './elementos.jsx';
import ImagePicker from '../../../../components/ui/ImagePicker.jsx';

/* ──────────────────────────────────────────────────────────────────
   Lienzo libre v2 — el lienzo ES la vista previa (Rework)
   Paleta compacta de iconos a la izquierda · canvas WYSIWYG gigante ·
   propiedades contextuales a la derecha SOLO al seleccionar.
   Con animaciones por elemento y bloques del evento incrustables.
   ────────────────────────────────────────────────────────────────── */

const GRID = 20;
function uid() { return `el_${Math.random().toString(36).slice(2, 9)}`; }

export default function CanvasEditor({ canvas, onChange, evento }) {
  const elementos = canvas?.elementos || [];
  const alto = canvas?.alto || 900;
  const fondo = canvas?.fondo || '';
  const [selId, setSelId] = useState(null);
  const [grid, setGrid]   = useState(true);
  const [animKey, setAnimKey] = useState(0); /* replay de animaciones */
  const lienzoRef = useRef(null);
  const drag = useRef(null);

  const sel = elementos.find(e => e.id === selId) || null;
  const set = (patch) => onChange({ ...canvas, alto, elementos, ...patch });
  const setElementos = (next) => set({ elementos: typeof next === 'function' ? next(elementos) : next });
  const updateEl = (id, patch) =>
    setElementos(els => els.map(e => e.id === id ? { ...e, ...patch, props: { ...e.props, ...(patch.props || {}) } } : e));

  const snap = useCallback((v) => grid ? Math.round(v / GRID) * GRID : Math.round(v), [grid]);

  const agregar = (type) => {
    const def = ELEMENTOS[type].defaults;
    const el = { id: uid(), type, x: snap(120), y: snap(80 + (elementos.length % 5) * 60), w: def.w, h: def.h, z: elementos.length + 1, props: structuredClone(def.props) };
    setElementos([...elementos, el]);
    setSelId(el.id);
  };

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
    /* Escala recalculada en cada movimiento: al seleccionar aparece el panel de
       propiedades y el lienzo se angosta, así que la escala capturada al iniciar
       el arrastre quedaba obsoleta y el primer arrastre se descuadraba. */
    const k = escala() || d.k || 1;
    const dx = (e.clientX - d.sx) / k, dy = (e.clientY - d.sy) / k;
    if (d.modo === 'mover') updateEl(d.id, { x: Math.max(0, snap(d.ox + dx)), y: Math.max(0, snap(d.oy + dy)) });
    else updateEl(d.id, { w: Math.max(40, snap(d.ow + dx)), h: Math.max(20, snap(d.oh + dy)) });
  };
  const onPointerUp = () => { drag.current = null; window.removeEventListener('pointermove', onPointerMove); };

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
    if (e) updateEl(id, { z: Math.max(1, (e.z || 1) + delta) });
  };

  return (
    <div className="flex gap-3 items-start">
      {/* ── Paleta compacta ── */}
      <aside className="flex-shrink-0 w-14 rounded-2xl border border-border bg-surface/70 py-2 flex flex-col items-center gap-0.5 sticky top-[76px] z-20">
        {Object.entries(ELEMENTOS).map(([type, def]) => (
          <button key={type} onClick={() => agregar(type)} title={def.label}
            className="w-10 h-10 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center transition-colors">
            <def.icon className="w-[18px] h-[18px]" />
          </button>
        ))}
        <div className="w-8 border-t border-border my-1.5" />
        <button onClick={() => setGrid(g => !g)} title={grid ? 'Cuadrícula: activada' : 'Cuadrícula: apagada'}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                      ${grid ? 'text-accent bg-accent/10' : 'text-text-3 hover:text-text-1 hover:bg-surface-2'}`}>
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path d="M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16" /></svg>
        </button>
        <button onClick={() => setAnimKey(k => k + 1)} title="Reproducir animaciones"
          className="w-10 h-10 rounded-xl text-text-3 hover:text-accent hover:bg-accent/10 flex items-center justify-center transition-colors">
          <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v13.72L19 12 8 5.14z"/></svg>
        </button>
      </aside>

      {/* ── El lienzo ES la vista previa ── */}
      <div className="flex-1 min-w-0">
        <div
          ref={lienzoRef}
          onPointerDown={() => setSelId(null)}
          className="relative w-full rounded-2xl border border-border overflow-hidden select-none shadow-card"
          style={{
            aspectRatio: `${ANCHO_DISENO} / ${alto}`,
            background: fondo || 'rgb(var(--color-bg))',
            backgroundImage: grid ? 'radial-gradient(circle, rgba(139,92,246,0.16) 1px, transparent 1px)' : undefined,
            backgroundSize: grid ? `${GRID / ANCHO_DISENO * 100}% auto` : undefined,
          }}
        >
          {[...elementos].sort((a, b) => (a.z || 1) - (b.z || 1)).map(el => {
            const activo = el.id === selId;
            return (
              <div
                key={el.id}
                onPointerDown={(e) => onPointerDown(e, el, 'mover')}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className={`absolute cursor-grab active:cursor-grabbing select-none ${activo ? 'ring-2 ring-accent z-40' : 'hover:ring-1 hover:ring-accent/40'}`}
                style={{
                  left: `${el.x / ANCHO_DISENO * 100}%`,
                  top: `${el.y / alto * 100}%`,
                  width: `${el.w / ANCHO_DISENO * 100}%`,
                  height: `${el.h / alto * 100}%`,
                  borderRadius: 12,
                  touchAction: 'none',
                }}
              >
                <div className="w-full h-full pointer-events-none">
                  <ElementoRender el={el} evento={evento} animKey={animKey} />
                </div>
                {activo && (
                  <>
                    <span
                      onPointerDown={(e) => onPointerDown(e, el, 'resize')}
                      className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent border-2 border-white cursor-nwse-resize z-50"
                    />
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
              <p className="text-sm text-text-3">Elige un elemento de la barra izquierda y constrúyelo a tu gusto.</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-text-3">
          <span>Lienzo {ANCHO_DISENO}px · se escala solo en cada pantalla</span>
          <span className="flex items-center gap-3">
            <label className="flex items-center gap-1.5">Alto
              <input type="number" min={400} step={100} value={alto} onChange={e => set({ alto: Number(e.target.value) || 900 })}
                className="input !h-7 !px-2 !text-[11px] w-20" />
            </label>
            <label className="flex items-center gap-1.5">Fondo
              <input type="color" value={fondo || '#0e1116'} onChange={e => set({ fondo: e.target.value })}
                className="w-7 h-7 rounded-md border border-border bg-surface cursor-pointer p-0.5" />
              {fondo && <button onClick={() => set({ fondo: '' })} className="underline hover:text-text-1">del tema</button>}
            </label>
          </span>
        </div>
      </div>

      {/* ── Propiedades: SOLO cuando hay selección ── */}
      {sel && (
        <aside className="flex-shrink-0 w-[300px] xl:w-[340px] rounded-2xl border border-border bg-surface/80 backdrop-blur overflow-hidden sticky top-[76px] z-20">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-[13px] font-semibold text-text-1">{ELEMENTOS[sel.type].label}</h3>
            <button onClick={() => setSelId(null)} aria-label="Cerrar" className="text-text-3 hover:text-text-1 text-xs">✕</button>
          </header>
          <div className="p-4 space-y-3.5 max-h-[64vh] overflow-y-auto no-scrollbar">
            {(['titulo', 'texto'].includes(sel.type)) && (<>
              <Campo label="Texto">
                <textarea rows={3} className="input !h-auto resize-none" value={sel.props.texto || ''} onChange={e => updateEl(sel.id, { props: { texto: e.target.value } })} />
              </Campo>
              <div className="grid grid-cols-2 gap-2.5">
                <Campo label="Tamaño"><input type="number" min={10} max={140} className="input" value={sel.props.fontSize || 16} onChange={e => updateEl(sel.id, { props: { fontSize: Number(e.target.value) } })} /></Campo>
                <Campo label="Alinear">
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
                  <input type="checkbox" checked={!!sel.props.bold} onChange={e => updateEl(sel.id, { props: { bold: e.target.checked } })} /> Negrita
                </label>
              </div>
            </>)}
            {sel.type === 'imagen' && (<>
              <Campo label="Imagen"><ImagePicker value={sel.props.url || ''} onChange={v => updateEl(sel.id, { props: { url: v } })} ownerId={evento.id} placeholder="URL o subir" /></Campo>
              <div className="grid grid-cols-2 gap-2.5">
                <Campo label="Bordes"><input type="number" min={0} max={80} className="input" value={sel.props.radio ?? 20} onChange={e => updateEl(sel.id, { props: { radio: Number(e.target.value) } })} /></Campo>
                <Campo label="Ajuste">
                  <select className="input" value={sel.props.ajuste || 'cover'} onChange={e => updateEl(sel.id, { props: { ajuste: e.target.value } })}>
                    <option value="cover">Recortar</option><option value="contain">Completa</option>
                  </select>
                </Campo>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Campo label="Encuadre">
                  <select className="input" value={sel.props.posicion || 'center'} onChange={e => updateEl(sel.id, { props: { posicion: e.target.value } })}>
                    <option value="center">Centro</option><option value="top">Arriba</option><option value="bottom">Abajo</option><option value="left">Izquierda</option><option value="right">Derecha</option>
                  </select>
                </Campo>
                <Campo label={`Opacidad · ${Math.round((sel.props.opacidad ?? 1) * 100)}%`}>
                  <input type="range" min={0.1} max={1} step={0.05} className="w-full accent-[#8B5CF6]" value={sel.props.opacidad ?? 1} onChange={e => updateEl(sel.id, { props: { opacidad: Number(e.target.value) } })} />
                </Campo>
              </div>
              <p className="text-[11px] text-text-3">Arrastra la imagen para moverla y usa la esquina para agrandarla o reducirla.</p>
            </>)}
            {sel.type === 'figura' && (<>
              <Campo label="Forma">
                <select className="input" value={sel.props.forma || 'circulo'} onChange={e => updateEl(sel.id, { props: { forma: e.target.value } })}>
                  {FIGURAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </Campo>
              <div className="grid grid-cols-2 gap-2.5">
                <ColorMini label="Relleno" value={sel.props.fondo} onChange={v => updateEl(sel.id, { props: { fondo: v } })} />
                <ColorMini label="Borde" value={sel.props.borde} onChange={v => updateEl(sel.id, { props: { borde: v } })} />
              </div>
              <Campo label={`Opacidad · ${Math.round((sel.props.opacidad ?? 1) * 100)}%`}>
                <input type="range" min={0.1} max={1} step={0.05} className="w-full accent-[#8B5CF6]" value={sel.props.opacidad ?? 1} onChange={e => updateEl(sel.id, { props: { opacidad: Number(e.target.value) } })} />
              </Campo>
            </>)}
            {sel.type === 'boton' && (<>
              <Campo label="Texto"><input className="input" value={sel.props.texto || ''} onChange={e => updateEl(sel.id, { props: { texto: e.target.value } })} /></Campo>
              <Campo label="Link"><input className="input" value={sel.props.link || ''} onChange={e => updateEl(sel.id, { props: { link: e.target.value } })} placeholder="https://… o #boletas" /></Campo>
              <div className="grid grid-cols-3 gap-2">
                <Campo label="Letra"><input type="number" min={10} max={40} className="input" value={sel.props.fontSize || 16} onChange={e => updateEl(sel.id, { props: { fontSize: Number(e.target.value) } })} /></Campo>
                <ColorMini label="Texto" value={sel.props.color} onChange={v => updateEl(sel.id, { props: { color: v } })} />
                <ColorMini label="Fondo" value={sel.props.fondo} onChange={v => updateEl(sel.id, { props: { fondo: v } })} />
              </div>
            </>)}
            {sel.type === 'countdown' && (
              <div className="grid grid-cols-2 gap-2.5">
                <Campo label="Tamaño"><input type="number" min={16} max={100} className="input" value={sel.props.fontSize || 40} onChange={e => updateEl(sel.id, { props: { fontSize: Number(e.target.value) } })} /></Campo>
                <ColorMini label="Color" value={sel.props.color} onChange={v => updateEl(sel.id, { props: { color: v } })} />
              </div>
            )}
            {sel.type === 'caja' && (<>
              <Campo label="Estilo del recuadro">
                <select className="input" value={sel.props.estilo || 'relleno'} onChange={e => updateEl(sel.id, { props: { estilo: e.target.value } })}>
                  <option value="relleno">Relleno</option>
                  <option value="contorno">Contorno</option>
                  <option value="degradado">Degradado</option>
                  <option value="vidrio">Vidrio (blur)</option>
                  <option value="sombra">Sombra</option>
                  <option value="punteado">Punteado</option>
                </select>
              </Campo>
              <div className="grid grid-cols-3 gap-2">
                <ColorMini label="Color" value={sel.props.fondo} onChange={v => updateEl(sel.id, { props: { fondo: v } })} />
                <ColorMini label="Borde" value={sel.props.borde} onChange={v => updateEl(sel.id, { props: { borde: v } })} />
                <Campo label="Radio"><input type="number" min={0} max={80} className="input" value={sel.props.radio ?? 24} onChange={e => updateEl(sel.id, { props: { radio: Number(e.target.value) } })} /></Campo>
              </div>
            </>)}
            {sel.type === 'divisor' && <ColorMini label="Color" value={sel.props.color} onChange={v => updateEl(sel.id, { props: { color: v } })} />}
            {sel.type === 'video' && (
              <Campo label="YouTube o Vimeo"><input className="input" value={sel.props.url || ''} onChange={e => updateEl(sel.id, { props: { url: e.target.value } })} placeholder="https://youtube.com/watch?v=…" /></Campo>
            )}
            {sel.type === 'bloque' && (
              <Campo label="Sección a mostrar">
                <select className="input" value={sel.props.bloque || 'agenda'} onChange={e => updateEl(sel.id, { props: { bloque: e.target.value } })}>
                  {BLOQUES_INCRUSTABLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </Campo>
            )}
            {sel.type === 'boletas' && (
              <p className="text-xs text-text-3">Muestra las boletas reales del evento con compra/reserva. Configúralas en Comercial → Boletas.</p>
            )}

            {/* ── Animación ── */}
            <div className="border-t border-border pt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Animación</p>
                {sel.props.anim && (
                  <button onClick={() => setAnimKey(k => k + 1)} className="text-[11px] text-accent hover:underline">▶ Reproducir</button>
                )}
              </div>
              {/* Al cambiar la animación se reproduce sola (antes había que darle a ▶
                  y parecía que "no hacía nada"). */}
              <select className="input" value={sel.props.anim || ''}
                onChange={e => { updateEl(sel.id, { props: { anim: e.target.value } }); setAnimKey(k => k + 1); }}>
                {ANIMACIONES.filter(a => a.value !== 'maquina' || ['titulo', 'texto'].includes(sel.type)).map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              {sel.props.anim && (
                <div className="grid grid-cols-2 gap-2.5">
                  <Campo label="Duración (s)"><input type="number" step={0.1} min={0.2} max={8} className="input" value={sel.props.animDur ?? 0.8} onChange={e => { updateEl(sel.id, { props: { animDur: Number(e.target.value) } }); setAnimKey(k => k + 1); }} /></Campo>
                  <Campo label="Retraso (s)"><input type="number" step={0.1} min={0} max={10} className="input" value={sel.props.animDelay ?? 0} onChange={e => { updateEl(sel.id, { props: { animDelay: Number(e.target.value) } }); setAnimKey(k => k + 1); }} /></Campo>
                </div>
              )}
            </div>

            {/* Posición exacta */}
            <div className="border-t border-border pt-3 grid grid-cols-4 gap-2 text-center">
              {[['x', 'X'], ['y', 'Y'], ['w', 'An'], ['h', 'Al']].map(([k, l]) => (
                <div key={k}>
                  <label className="text-[10px] text-text-3 uppercase">{l}</label>
                  <input type="number" className="input !h-8 !px-1 text-xs text-center" value={Math.round(sel[k])} onChange={e => updateEl(sel.id, { [k]: Number(e.target.value) || 0 })} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
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
