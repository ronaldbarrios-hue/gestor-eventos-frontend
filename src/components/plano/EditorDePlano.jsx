import { useMemo, useRef, useState } from 'react';

/* Colocar el recinto: arrastrar los sitios hasta donde están de verdad.
 *
 * ── Por qué hace falta ───────────────────────────────────────────────────
 *
 * El generador coloca en rejilla, y en abanico si se le pide. Eso ya no es una
 * cuadrícula ciega, pero sigue sin ser EL recinto: la platea está torcida, el
 * palco de prensa se metió donde no va, y la fila 1 empieza dos metros a la
 * izquierda. Sin poder mover nada, el plano es una aproximación que nadie
 * reconoce — y quien compra tiene que reconocer su sitio.
 *
 * ── Lo que este editor decide, y lo que no ───────────────────────────────
 *
 * Sólo mueve. No crea, no borra, no pone precios y no cambia modos: eso vive en
 * la lista, donde cada acción se lee antes de hacerse. Aquí se arrastra, que es
 * lo único que una lista no puede hacer.
 *
 * Mover una silla VENDIDA sí se permite. Es al revés de lo que parece: el plano
 * estaba mal y la venta está bien, así que corregir el dibujo no toca la venta.
 * Lo que no se puede es borrarla o dejar de venderla, y eso ya lo impide el
 * servidor.
 *
 * ── Y por qué se guarda con un botón ─────────────────────────────────────
 *
 * Guardar en cada empujón del ratón manda cientos de peticiones y, peor, hace
 * imposible arrepentirse: no hay «como estaba antes» si «antes» ya se guardó
 * cincuenta veces. Aquí se mueve libremente, se ve el número de cambios sin
 * guardar, y se decide.
 */

const LADO = 24;
const REJILLA = 8;   // a cuánto se pega al soltar

/* Pegar a una rejilla fina al soltar. Sin esto, dos filas colocadas a ojo
   quedan a 3 px de diferencia: en pantalla no se nota y en el plano impreso
   sí. Con 8 hay libertad de sobra y las cosas quedan alineadas solas. */
const pegar = (n) => Math.round(n / REJILLA) * REJILLA;

export default function EditorDePlano({
  espacios = [], colorDe, onGuardar, guardando, alto = 460,
}) {
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
    const con = dibujables.map(posDe);
    if (!con.length) return null;
    const xs = con.map(g => Number(g.x) || 0);
    const ys = con.map(g => Number(g.y) || 0);
    const m = 48;
    const x = Math.min(...xs) - m;
    const y = Math.min(...ys) - m;
    return { x, y, w: Math.max(...xs) - x + LADO + m, h: Math.max(...ys) - y + LADO + m };
    /* `movidos` entra en las dependencias a propósito: sin él, arrastrar algo
       fuera del encuadre inicial lo saca de la vista y no hay forma de volver
       a cogerlo. `posDe` lo lee, y por eso no hace falta en la lista. */
  }, [dibujables, movidos]);

  if (!caja) {
    return (
      <p className="text-sm text-text-2 p-4 rounded-xl border border-border">
        Todavía no hay sitios con posición. Genera una sección y vuelve aquí a colocarla.
      </p>
    );
  }

  const v = vista || caja;

  const enPlano = (ev) => {
    const r = svgRef.current.getBoundingClientRect();
    const p = ev.touches?.[0] || ev;
    return {
      x: v.x + ((p.clientX - r.left) / r.width) * v.w,
      y: v.y + ((p.clientY - r.top) / r.height) * v.h,
    };
  };

  const alBajar = (ev) => {
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
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-text-2 flex-1 min-w-[12rem]">
          Arrastra los sitios. Ctrl+clic para elegir varios; arrastra el fondo para mover el plano.
        </p>
        <button type="button" onClick={() => girar(-15)} disabled={!sel.size}
          className="btn-ghost btn-sm" title="Girar la selección">↺ 15°</button>
        <button type="button" onClick={() => girar(15)} disabled={!sel.size}
          className="btn-ghost btn-sm" title="Girar la selección">↻ 15°</button>
        <button type="button" onClick={() => setVista(null)} className="btn-ghost btn-sm">Centrar</button>
        <button type="button" onClick={() => { setMovidos({}); setSel(new Set()); }}
          disabled={!cambios.length} className="btn-ghost btn-sm">Descartar</button>
        <button type="button" disabled={!cambios.length || guardando}
          onClick={async () => { await onGuardar(cambios); setMovidos({}); }}
          className="btn-primary btn-sm">
          {guardando ? 'Guardando…' : `Guardar ${cambios.length || ''}`.trim()}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface-2/30 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`}
          className="w-full touch-none select-none text-border"
          style={{ maxHeight: `${alto}px`, cursor: gesto.current ? 'grabbing' : 'default' }}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerLeave={alSoltar}
          onWheel={(e) => {
            const p = enPlano(e);
            const f = e.deltaY > 0 ? 1.15 : 0.87;
            const w = Math.max(LADO * 4, Math.min(caja.w * 2, v.w * f));
            const h = w * (v.h / v.w);
            setVista({ x: p.x - (p.x - v.x) * (w / v.w), y: p.y - (p.y - v.y) * (h / v.h), w, h });
          }}
          role="group" aria-label="Editor del plano">

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
                transform={rot ? `rotate(${rot} ${x + LADO / 2} ${y + LADO / 2})` : undefined}
                fill={color || 'transparent'}
                fillOpacity={color ? 0.85 : 0}
                stroke={elegido ? 'currentColor' : (color || 'currentColor')}
                strokeWidth={elegido ? 3 : 1}
                className={elegido ? 'text-accent' : ''}
                style={{ cursor: 'move' }}>
                {/* El nombre en el título y no dibujado: dos mil etiquetas de
                    texto encima del plano lo vuelven ilegible y lento. */}
                <title>{e.nombre}</title>
              </rect>
            );
          })}
        </svg>

        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-t border-border">
          <span className="text-[10px] text-text-3">
            {sel.size ? `${sel.size} seleccionado${sel.size > 1 ? 's' : ''}` : `${dibujables.length} sitios`}
          </span>
          <span className="text-[10px] text-text-3">
            {cambios.length
              ? `${cambios.length} sin guardar`
              : 'Todo guardado'}
          </span>
        </div>
      </div>
    </div>
  );
}
