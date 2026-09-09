import { useMemo, useRef, useState } from 'react';

/* Dibujar y colocar el recinto.
 *
 * ── Las dos cosas que hace ───────────────────────────────────────────────
 *
 * **Trazar** bloques —la tarima, la general, una tribuna, un palco— haciendo
 * clic punto a punto sobre el plano. Y **colocar**: arrastrar lo que ya existe
 * hasta donde está de verdad.
 *
 * Son dos modos y no uno porque el mismo gesto significa cosas opuestas: en
 * trazado, un clic añade un vértice; en colocación, un clic elige. Mezclarlos
 * haría que mirar el plano lo modificara.
 *
 * ── El fondo, que es lo que convierte dibujar en calcar ──────────────────
 *
 * Debajo del lienzo se pone la imagen del plano oficial del recinto, con su
 * opacidad. Sin ella se dibuja a ojo y el resultado no se parece al edificio;
 * con ella se repasa por encima y sale exacto. Es lo más barato de construir de
 * todo esto y lo que más cambia el resultado.
 *
 * ── Lo que este editor NO decide ─────────────────────────────────────────
 *
 * Precios, modos, borrados. Eso vive en la lista, donde cada acción se lee
 * antes de hacerse. Mover una silla VENDIDA sí se permite, y es al revés de lo
 * que parece: el plano estaba mal y la venta está bien, así que corregir el
 * dibujo no toca la venta.
 *
 * ── Y por qué se guarda con un botón ─────────────────────────────────────
 *
 * Guardar en cada empujón del ratón manda cientos de peticiones y, peor, hace
 * imposible arrepentirse: no hay «como estaba antes» si «antes» ya se guardó
 * cincuenta veces.
 */

const LADO = 24;
const REJILLA = 8;

/* Pegar a una rejilla fina al soltar. Sin esto, dos filas colocadas a ojo
   quedan a 3 px de diferencia: en pantalla no se nota y en el plano impreso
   sí. Con 8 hay libertad de sobra y las cosas quedan alineadas solas. */
const pegar = (n) => Math.round(n / REJILLA) * REJILLA;

/* Las piezas de un mapa de concierto. El mismo vocabulario que la plantilla del
   servidor: si aquí se ofreciera otro, el editor crearía bloques que el resto
   de la plataforma no sabría contar. */
const PIEZAS = [
  { id: 'tribuna', label: 'Tribuna',  ayuda: 'Un bloque numerado. Dentro van las butacas.' },
  { id: 'pista',   label: 'General',  ayuda: 'De pie, sin sitio asignado. Cuenta gente.' },
  { id: 'palco',   label: 'Palco',    ayuda: 'Se vende entero y entran varios.' },
  { id: 'tarima',  label: 'Tarima',   ayuda: 'No se vende. Dice dónde está el frente.' },
];

const puntosDe = (g) => (g?.puntos || []).map(([x, y]) => `${x},${y}`).join(' ');

export default function EditorDePlano({
  espacios = [], bloques = [], colorDe, onGuardar, onCrearBloque,
  fondo, onFondo, guardando, alto = 460,
}) {
  const [modo, setModo] = useState('mover');       // mover | trazar
  const [pieza, setPieza] = useState('tribuna');
  const [trazo, setTrazo] = useState([]);          // los vértices del bloque en curso
  /* Los movimientos que aún no se han guardado, por id. Se lleva aparte de
     `espacios` para que «descartar» sea tirar este objeto y no rehacer nada. */
  const [movidos, setMovidos] = useState({});
  const [sel, setSel] = useState(new Set());
  const [vista, setVista] = useState(null);
  const svgRef = useRef(null);
  const gesto = useRef(null);

  const dibujables = useMemo(
    () => espacios.filter(e => e.geometria?.x != null),
    [espacios]);

  const posDe = (e) => movidos[e.id] || e.geometria;

  const caja = useMemo(() => {
    const xs = [];
    const ys = [];
    for (const e of dibujables) {
      const g = movidos[e.id] || e.geometria;
      xs.push(Number(g.x) || 0, (Number(g.x) || 0) + LADO);
      ys.push(Number(g.y) || 0, (Number(g.y) || 0) + LADO);
    }
    for (const b of bloques) {
      for (const [px, py] of b.geometria?.puntos || []) {
        if (!Number.isFinite(Number(px)) || !Number.isFinite(Number(py))) continue;
        xs.push(Number(px)); ys.push(Number(py));
      }
    }
    /* Un lienzo por defecto cuando no hay nada: sin él, el primer trazo no
       tiene dónde empezar y el editor se ve vacío para siempre. */
    if (!xs.length) return { x: -400, y: -300, w: 800, h: 600 };
    const m = 48;
    const x = Math.min(...xs) - m;
    const y = Math.min(...ys) - m;
    return { x, y, w: Math.max(...xs) - x + m, h: Math.max(...ys) - y + m };
    /* `movidos` entra a propósito: sin él, arrastrar algo fuera del encuadre
       inicial lo saca de la vista y no hay forma de volver a cogerlo. */
  }, [dibujables, bloques, movidos]);

  const v = vista || caja;

  const enPlano = (ev) => {
    const r = svgRef.current.getBoundingClientRect();
    const p = ev.touches?.[0] || ev;
    return {
      x: v.x + ((p.clientX - r.left) / r.width) * v.w,
      y: v.y + ((p.clientY - r.top) / r.height) * v.h,
    };
  };

  /* ── Trazar ───────────────────────────────────────────────────────────── */

  const cerrarTrazo = async () => {
    /* Menos de tres vértices no es un área: es una línea, y una línea no se
       puede pintar ni tocar. */
    if (trazo.length < 3) { setTrazo([]); return; }
    await onCrearBloque?.({
      tipo: pieza,
      geometria: { puntos: trazo.map(p => [pegar(p.x), pegar(p.y)]) },
    });
    setTrazo([]);
  };

  const alBajar = (ev) => {
    if (modo === 'trazar') {
      const p = enPlano(ev);
      /* Volver al primer punto cierra la figura, que es el gesto que todo el
         mundo intenta antes de buscar un botón. */
      if (trazo.length >= 3) {
        const primero = trazo[0];
        if (Math.hypot(p.x - primero.x, p.y - primero.y) < LADO) { cerrarTrazo(); return; }
      }
      setTrazo(t => [...t, p]);
      return;
    }

    const id = ev.target?.dataset?.id;
    const p = enPlano(ev);
    if (!id) { gesto.current = { tipo: 'mapa', desde: p }; return; }

    /* Con ctrl/cmd se añade a la selección; sin él, tocar algo fuera de la
       selección la reemplaza. Tocar algo YA seleccionado no la deshace: si lo
       hiciera, arrastrar un grupo desde uno de sus miembros movería sólo ése,
       que es el gesto que más se usa. */
    let sig = new Set(sel);
    if (ev.ctrlKey || ev.metaKey) { sig.has(id) ? sig.delete(id) : sig.add(id); }
    else if (!sig.has(id)) { sig = new Set([id]); }
    setSel(sig);
    gesto.current = { tipo: 'sitios', desde: p, ids: [...sig], inicio: {} };
    for (const i of gesto.current.ids) {
      const e = espacios.find(x => x.id === i);
      if (e) gesto.current.inicio[i] = { ...posDe(e) };
    }
  };

  const alMover = (ev) => {
    const g = gesto.current;
    if (!g) return;
    const p = enPlano(ev);
    const dx = p.x - g.desde.x;
    const dy = p.y - g.desde.y;

    if (g.tipo === 'mapa') { setVista({ ...v, x: v.x - dx, y: v.y - dy }); return; }

    /* Se mueve desde la posición de INICIO del gesto, no desde la actual. Con
       incrementos, cada repintado acumula el redondeo y el grupo se deforma. */
    const sig = { ...movidos };
    for (const id of g.ids) {
      const i = g.inicio[id];
      if (i) sig[id] = { ...i, x: i.x + dx, y: i.y + dy };
    }
    setMovidos(sig);
  };

  const alSoltar = () => {
    const g = gesto.current;
    gesto.current = null;
    if (g?.tipo !== 'sitios') return;
    setMovidos(m => {
      const sig = { ...m };
      for (const id of g.ids) {
        if (sig[id]) sig[id] = { ...sig[id], x: pegar(sig[id].x), y: pegar(sig[id].y) };
      }
      return sig;
    });
  };

  const girar = (grados) => {
    if (!sel.size) return;
    setMovidos(m => {
      const sig = { ...m };
      for (const id of sel) {
        const e = espacios.find(x => x.id === id);
        if (!e) continue;
        const g = sig[id] || e.geometria;
        sig[id] = { ...g, rot: Math.round(((Number(g.rot) || 0) + grados) % 360) };
      }
      return sig;
    });
  };

  const cambios = Object.entries(movidos)
    .filter(([id, g]) => {
      const e = espacios.find(x => x.id === id);
      if (!e) return false;
      /* Sólo lo que de verdad cambió. Sin este filtro, un clic sin arrastre
         contaría como cambio y el botón de guardar pediría guardar nada. */
      return e.geometria?.x !== g.x || e.geometria?.y !== g.y || (e.geometria?.rot || 0) !== (g.rot || 0);
    })
    .map(([id, geometria]) => ({ id, geometria }));

  return (
    <div className="space-y-2">
      {/* ── Barra ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          {[['mover', 'Colocar'], ['trazar', 'Trazar']].map(([id, label]) => (
            <button key={id} type="button"
              onClick={() => { setModo(id); setTrazo([]); setSel(new Set()); }}
              className={`px-3 py-1 text-xs ${modo === id ? 'bg-accent text-white' : 'text-text-2 hover:text-text-1'}`}>
              {label}
            </button>
          ))}
        </div>

        {modo === 'trazar' ? (
          <>
            <select value={pieza} onChange={(e) => setPieza(e.target.value)}
              aria-label="Qué se dibuja" className="input input-sm text-xs">
              {PIEZAS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <span className="text-[11px] text-text-3 flex-1 min-w-[10rem]">
              {PIEZAS.find(p => p.id === pieza)?.ayuda}
            </span>
            <button type="button" onClick={() => setTrazo(t => t.slice(0, -1))}
              disabled={!trazo.length} className="btn-ghost btn-sm">Quitar punto</button>
            <button type="button" onClick={cerrarTrazo}
              disabled={trazo.length < 3} className="btn-primary btn-sm">
              Cerrar bloque {trazo.length ? `(${trazo.length})` : ''}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-text-2 flex-1 min-w-[11rem]">
              Arrastra los sitios. Ctrl+clic para elegir varios.
            </p>
            <button type="button" onClick={() => girar(-15)} disabled={!sel.size}
              className="btn-ghost btn-sm" title="Girar la selección">↺ 15°</button>
            <button type="button" onClick={() => girar(15)} disabled={!sel.size}
              className="btn-ghost btn-sm" title="Girar la selección">↻ 15°</button>
            <button type="button" onClick={() => { setMovidos({}); setSel(new Set()); }}
              disabled={!cambios.length} className="btn-ghost btn-sm">Descartar</button>
            <button type="button" disabled={!cambios.length || guardando}
              onClick={async () => { await onGuardar(cambios); setMovidos({}); }}
              className="btn-primary btn-sm">
              {guardando ? 'Guardando…' : `Guardar ${cambios.length || ''}`.trim()}
            </button>
          </>
        )}
        <button type="button" onClick={() => setVista(null)} className="btn-ghost btn-sm">Centrar</button>
      </div>

      {/* ── El fondo para calcar ──────────────────────────────────────── */}
      {onFondo && <Fondo fondo={fondo} onFondo={onFondo} />}

      {/* ── El lienzo ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface-2/30 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`}
          className="w-full touch-none select-none text-border"
          style={{ maxHeight: `${alto}px`, cursor: modo === 'trazar' ? 'crosshair' : 'default' }}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerLeave={alSoltar}
          onWheel={(e) => {
            const p = enPlano(e);
            const f = e.deltaY > 0 ? 1.15 : 0.87;
            const w = Math.max(LADO * 4, Math.min(caja.w * 3, v.w * f));
            const h = w * (v.h / v.w);
            setVista({ x: p.x - (p.x - v.x) * (w / v.w), y: p.y - (p.y - v.y) * (h / v.h), w, h });
          }}
          role="group" aria-label="Editor del plano">

          {/* La imagen del recinto, debajo de todo y sin recibir clics: si los
              recibiera, cada intento de trazar un vértice encima del plano
              caería en la imagen en vez de en el lienzo. */}
          {fondo?.url && (
            <image href={fondo.url}
              x={caja.x} y={caja.y} width={caja.w} height={caja.h}
              preserveAspectRatio="xMidYMid meet"
              opacity={Number(fondo.opacidad ?? 0.4)}
              style={{ pointerEvents: 'none' }} />
          )}

          {/* Los bloques van antes que las sillas: en SVG manda el orden del
              documento, no un z-index. */}
          {bloques.map(b => (
            <polygon key={b.id} points={puntosDe(b.geometria)}
              fill={b.color || 'currentColor'} fillOpacity={0.7}
              stroke="currentColor" strokeOpacity={0.5} strokeWidth={1}
              style={{ pointerEvents: 'none' }}>
              <title>{b.nombre}</title>
            </polygon>
          ))}

          {dibujables.map(e => {
            const g = posDe(e);
            const x = Number(g.x) || 0;
            const y = Number(g.y) || 0;
            const rot = Number(g.rot) || 0;
            const elegido = sel.has(e.id);
            const color = colorDe?.(e) || null;
            return (
              <rect
                key={e.id}
                data-id={e.id}
                x={x} y={y} width={LADO} height={LADO} rx={5}
                /* El giro va alrededor del centro de la silla. Sin el centro,
                   girar la desplaza además de orientarla. */
                transform={rot ? `rotate(${rot} ${x + LADO / 2} ${y + LADO / 2})` : undefined}
                fill={color || 'transparent'}
                fillOpacity={color ? 0.85 : 0}
                stroke={elegido ? 'currentColor' : (color || 'currentColor')}
                strokeWidth={elegido ? 3 : 1}
                className={elegido ? 'text-accent' : ''}
                style={{ cursor: modo === 'trazar' ? 'crosshair' : 'move',
                         pointerEvents: modo === 'trazar' ? 'none' : 'auto' }}>
                {/* El nombre en el título y no dibujado: dos mil etiquetas de
                    texto encima del plano lo vuelven ilegible y lento. */}
                <title>{e.nombre}</title>
              </rect>
            );
          })}

          {/* El trazo en curso, con sus vértices. El primero va marcado porque
              volver a él es lo que cierra la figura. */}
          {trazo.length > 0 && (
            <g style={{ pointerEvents: 'none' }}>
              <polyline points={trazo.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none" stroke="currentColor" strokeWidth={2}
                strokeDasharray="6 4" className="text-accent" />
              {trazo.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 8 : 5}
                  className="text-accent" fill="currentColor"
                  fillOpacity={i === 0 ? 1 : 0.6} />
              ))}
            </g>
          )}
        </svg>

        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-t border-border">
          <span className="text-[10px] text-text-3">
            {modo === 'trazar'
              ? (trazo.length
                  ? `${trazo.length} punto${trazo.length > 1 ? 's' : ''} · vuelve al primero para cerrar`
                  : 'Haz clic para poner el primer punto')
              : (sel.size ? `${sel.size} seleccionado${sel.size > 1 ? 's' : ''}` : `${dibujables.length} sitios`)}
          </span>
          <span className="text-[10px] text-text-3">
            {modo === 'trazar'
              ? `${bloques.length} bloque${bloques.length === 1 ? '' : 's'}`
              : (cambios.length ? `${cambios.length} sin guardar` : 'Todo guardado')}
          </span>
        </div>
      </div>
    </div>
  );
}

/* La imagen del plano oficial, debajo del lienzo.
 *
 * Es lo que convierte «dibujar a ojo» en «calcar», y por eso la opacidad se
 * regula: al 100 % tapa lo dibujado y al 0 % no sirve de nada. Alrededor del
 * 40 % se ve el plano y se distingue encima lo que uno va poniendo.
 */
function Fondo({ fondo, onFondo }) {
  const [abierto, setAbierto] = useState(false);
  const url = fondo?.url || '';

  if (!abierto && !url) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="text-xs text-accent hover:underline">
        Poner el plano del recinto de fondo, para calcarlo
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url" value={url} placeholder="Enlace a la imagen del plano"
          aria-label="Imagen del plano del recinto"
          onChange={(e) => onFondo({ ...fondo, url: e.target.value.trim() })}
          className="input input-sm text-xs flex-1 min-w-[14rem]" />
        {url && (
          <button type="button" onClick={() => { onFondo({ url: '', opacidad: fondo?.opacidad }); setAbierto(false); }}
            className="btn-ghost btn-sm">Quitar</button>
        )}
      </div>
      {url && (
        <label className="flex items-center gap-2 text-[11px] text-text-3">
          Opacidad
          <input type="range" min="0.1" max="1" step="0.05"
            value={fondo?.opacidad ?? 0.4}
            onChange={(e) => onFondo({ ...fondo, opacidad: Number(e.target.value) })}
            className="flex-1 max-w-[12rem]" />
          {Math.round((fondo?.opacidad ?? 0.4) * 100)} %
        </label>
      )}
      <p className="text-[11px] text-text-3">
        Se dibuja debajo de todo y no se vende: sirve para repasar encima el recinto de verdad.
      </p>
    </div>
  );
}
