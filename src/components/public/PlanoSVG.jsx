import { useMemo, useRef, useState } from 'react';

/* El plano, dibujado.
 *
 * ── Por qué SVG y no divs ────────────────────────────────────────────────
 *
 * Dos mil `<div>` con su propio estado de React no van en un móvil de gama
 * media: cada cambio de una silla vuelve a evaluar el árbol entero. Dos mil
 * `<rect>` dentro de un SVG con **un solo manejador de eventos arriba** sí.
 *
 * Por eso aquí no hay `onClick` por silla: hay uno en el `<svg>` y se mira qué
 * se pulsó por su `data-id`. Es la diferencia entre un mapa que responde y uno
 * que se arrastra.
 *
 * ── Y por qué el `viewBox` hace el zoom ──────────────────────────────────
 *
 * Mover y ampliar cambiando el `viewBox` es una sola propiedad del SVG: el
 * navegador lo resuelve sin volver a pintar dos mil nodos. Un `transform` por
 * silla sería exactamente lo contrario.
 *
 * ── Lo que este componente NO hace ───────────────────────────────────────
 *
 * Retener, soltar ni hablar con el servidor. Eso vive en `ElegirSitio`, que es
 * quien sabe del carrito y del reloj. Aquí sólo se dibuja y se avisa de qué se
 * pulsó — para que el plano se pueda cambiar por una lista, o al revés, sin
 * tocar la lógica de la compra.
 */

/* Tamaño de la silla en las unidades del plano. `generarUnidades` coloca en una
   cuadrícula de 32, así que 24 deja un pasillo visible entre sillas. */
const LADO = 24;
const HUECO = 32;

export default function PlanoSVG({ unidades = [], valor, onElegir, ocupadoTitulo }) {
  const [vista, setVista] = useState(null);   // null = encuadre automático
  const svgRef = useRef(null);
  const arrastre = useRef(null);

  /* El encuadre. Se calcula del contenido y no se fija a mano: un recinto de
     veinte mesas y uno de dos mil sillas tienen que caber igual. */
  const caja = useMemo(() => {
    const con = unidades.filter(u => u.geometria?.x != null);
    if (!con.length) return null;
    const xs = con.map(u => Number(u.geometria.x) || 0);
    const ys = con.map(u => Number(u.geometria.y) || 0);
    const margen = HUECO;
    const x = Math.min(...xs) - margen;
    const y = Math.min(...ys) - margen;
    return {
      x, y,
      w: Math.max(...xs) - x + LADO + margen,
      h: Math.max(...ys) - y + LADO + margen,
    };
  }, [unidades]);

  /* Sin coordenadas no hay plano que dibujar. Quien llama enseña la lista, que
     funciona igual: el plano es una forma de elegir, no la única. */
  if (!caja) return null;

  const v = vista || caja;
  const viewBox = `${v.x} ${v.y} ${v.w} ${v.h}`;

  /* Un solo manejador para todas las sillas. */
  const alPulsar = (e) => {
    const id = e.target?.dataset?.id;
    if (!id) return;
    const u = unidades.find(x => x.id === id);
    if (u && (u.libre || u.id === valor)) onElegir(u);
  };

  const zoom = (factor, cx, cy) => {
    const w = Math.max(LADO * 4, Math.min(caja.w * 1.2, v.w * factor));
    const h = w * (v.h / v.w);
    setVista({ x: cx - (cx - v.x) * (w / v.w), y: cy - (cy - v.y) * (h / v.h), w, h });
  };

  const enPlano = (ev) => {
    const r = svgRef.current.getBoundingClientRect();
    const p = ev.touches?.[0] || ev;
    return {
      x: v.x + ((p.clientX - r.left) / r.width) * v.w,
      y: v.y + ((p.clientY - r.top) / r.height) * v.h,
    };
  };

  return (
    <div className="rounded-xl border border-border bg-surface-2/30 overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full touch-none select-none"
        style={{ maxHeight: '340px', cursor: arrastre.current ? 'grabbing' : 'grab' }}
        onClick={alPulsar}
        onPointerDown={(e) => { arrastre.current = enPlano(e); }}
        onPointerMove={(e) => {
          if (!arrastre.current) return;
          const p = enPlano(e);
          setVista({ ...v, x: v.x - (p.x - arrastre.current.x), y: v.y - (p.y - arrastre.current.y) });
        }}
        onPointerUp={() => { arrastre.current = null; }}
        onPointerLeave={() => { arrastre.current = null; }}
        onWheel={(e) => { const p = enPlano(e); zoom(e.deltaY > 0 ? 1.15 : 0.87, p.x, p.y); }}
        role="group"
        aria-label="Plano de sitios">
        {unidades.map(u => {
          const x = Number(u.geometria?.x) || 0;
          const y = Number(u.geometria?.y) || 0;
          const mio = u.id === valor;
          return (
            <rect
              key={u.id}
              data-id={u.id}
              x={x} y={y} width={LADO} height={LADO} rx={5}
              /* El color va por atributo y no por estado de React: cambiar una
                 silla es cambiar un atributo, no volver a pintar el mapa. */
              className={mio ? 'fill-accent stroke-accent'
                : u.libre ? 'fill-transparent stroke-border hover:stroke-accent'
                : 'fill-border/30 stroke-border/40'}
              strokeWidth={mio ? 2 : 1}
              style={{ cursor: u.libre || mio ? 'pointer' : 'not-allowed' }}>
              <title>{u.libre || mio ? u.nombre : `${u.nombre} — ${ocupadoTitulo || 'ocupada'}`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-t border-border">
        <span className="text-[10px] text-text-3">Arrastra para mover · rueda para acercar</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => zoom(0.8, v.x + v.w / 2, v.y + v.h / 2)}
            aria-label="Acercar" className="px-2 py-0.5 rounded text-xs text-text-3 hover:text-text-1">+</button>
          <button type="button" onClick={() => zoom(1.25, v.x + v.w / 2, v.y + v.h / 2)}
            aria-label="Alejar" className="px-2 py-0.5 rounded text-xs text-text-3 hover:text-text-1">−</button>
          {/* Volver al encuadre. Sin esto, tres arrastres y el plano se pierde
              de vista sin forma de recuperarlo. */}
          <button type="button" onClick={() => setVista(null)}
            className="px-2 py-0.5 rounded text-xs text-text-3 hover:text-text-1">Centrar</button>
        </div>
      </div>
    </div>
  );
}
