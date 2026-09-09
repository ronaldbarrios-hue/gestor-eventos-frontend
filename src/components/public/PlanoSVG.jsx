import { useMemo, useRef, useState } from 'react';

/* El plano, dibujado.
 *
 * ── Los dos niveles ──────────────────────────────────────────────────────
 *
 * Un mapa de recinto se lee en dos pasos, y no por gusto: nadie elige entre dos
 * mil sillas a la vez. Primero se ve el recinto entero con sus BLOQUES pintados
 * del color de su precio —«122», «GENERAL B», la tarima—, se toca uno, y sólo
 * entonces aparecen las sillas de ese bloque.
 *
 * Este componente dibuja los dos: si le pasas `bloques` pinta el recinto, si le
 * pasas `unidades` pinta las sillas, y si le pasas los dos pinta las sillas
 * sobre el contorno de su bloque para que se vea dónde están.
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
 * ── El color ─────────────────────────────────────────────────────────────
 *
 * El color no decora: ES el precio. Viene del tipo de boleta —la localidad— y
 * no de la silla, porque cambiar el color de «Platea» tiene que repintar sus
 * dos mil sillas de una vez.
 *
 * Ocupado se dibuja gris y sin relleno, nunca en otro color: si una silla
 * vendida conservara el color de su localidad, el mapa parecería más disponible
 * de lo que está.
 *
 * ── Lo que este componente NO hace ───────────────────────────────────────
 *
 * Retener, soltar ni hablar con el servidor. Eso vive en `ElegirSitio`, que es
 * quien sabe del carrito y del reloj. Aquí sólo se dibuja y se avisa de qué se
 * pulsó — para que el plano se pueda cambiar por una lista, o al revés, sin
 * tocar la lógica de la compra.
 */

/* Tamaño de la silla en las unidades del plano. `generarUnidades` coloca en una
   cuadrícula de 32, así que 24 deja un pasillo visible entre sillas.
   Tiene que coincidir con `lib/geometriaDelPlano.js` del backend. */
const LADO = 24;
const HUECO = 32;

const NEUTRO = 'currentColor';

/* El encuadre de lo que haya: sillas (puntos) y bloques (polígonos). Un recinto
   de veinte mesas y uno de dos mil sillas tienen que caber igual. */
function encuadrar(unidades, bloques) {
  const xs = [];
  const ys = [];
  for (const u of unidades) {
    if (u.geometria?.x == null) continue;
    xs.push(Number(u.geometria.x), Number(u.geometria.x) + LADO);
    ys.push(Number(u.geometria.y), Number(u.geometria.y) + LADO);
  }
  for (const b of bloques) {
    for (const [px, py] of b.geometria?.puntos || []) {
      if (!Number.isFinite(Number(px)) || !Number.isFinite(Number(py))) continue;
      xs.push(Number(px)); ys.push(Number(py));
    }
  }
  if (!xs.length) return null;
  const x = Math.min(...xs) - HUECO;
  const y = Math.min(...ys) - HUECO;
  return { x, y, w: Math.max(...xs) - x + HUECO, h: Math.max(...ys) - y + HUECO };
}

const puntosDe = (g) => (g?.puntos || []).map(([x, y]) => `${x},${y}`).join(' ');

export default function PlanoSVG({
  unidades = [], bloques = [], valor, onElegir, onBloque,
  ocupadoTitulo, colorDe, alto = 340,
}) {
  const [vista, setVista] = useState(null);   // null = encuadre automático
  const svgRef = useRef(null);
  const arrastre = useRef(null);
  const movido = useRef(false);

  const caja = useMemo(() => encuadrar(unidades, bloques), [unidades, bloques]);

  /* Sin coordenadas no hay plano que dibujar. Quien llama enseña la lista, que
     funciona igual: el plano es una forma de elegir, no la única. */
  if (!caja) return null;

  const v = vista || caja;
  const viewBox = `${v.x} ${v.y} ${v.w} ${v.h}`;

  /* Un solo manejador para todo lo dibujado. */
  const alPulsar = (e) => {
    /* Arrastrar el mapa no es elegir. Sin esto, mover el plano con el dedo
       selecciona la silla donde se levantó, que es la peor forma de descubrir
       que has apartado un sitio equivocado. */
    if (movido.current) { movido.current = false; return; }
    const d = e.target?.dataset || {};
    if (d.bloque) { onBloque?.(bloques.find(b => b.id === d.bloque)); return; }
    if (!d.id) return;
    const u = unidades.find(x => x.id === d.id);
    if (u && (u.libre || u.id === valor)) onElegir?.(u);
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
        className="w-full touch-none select-none text-border"
        style={{ maxHeight: `${alto}px`, cursor: arrastre.current ? 'grabbing' : 'grab' }}
        onClick={alPulsar}
        onPointerDown={(e) => { arrastre.current = enPlano(e); movido.current = false; }}
        onPointerMove={(e) => {
          if (!arrastre.current) return;
          const p = enPlano(e);
          /* Un temblor de dedo no es un arrastre: con el umbral a cero, tocar
             una silla en el móvil casi nunca la selecciona. */
          if (Math.hypot(p.x - arrastre.current.x, p.y - arrastre.current.y) > LADO / 3) {
            movido.current = true;
          }
          setVista({ ...v, x: v.x - (p.x - arrastre.current.x), y: v.y - (p.y - arrastre.current.y) });
        }}
        onPointerUp={() => { arrastre.current = null; }}
        onPointerLeave={() => { arrastre.current = null; }}
        onWheel={(e) => { const p = enPlano(e); zoom(e.deltaY > 0 ? 1.15 : 0.87, p.x, p.y); }}
        role="group"
        aria-label="Plano del recinto">

        {/* Los bloques van primero para que las sillas queden encima: en SVG
            manda el orden del documento, no un z-index. */}
        {bloques.map(b => {
          const color = b.color || null;
          const vacio = b.libres === 0;
          return (
            <g key={b.id}>
              <polygon
                data-bloque={onBloque ? b.id : undefined}
                points={puntosDe(b.geometria)}
                fill={color || NEUTRO}
                /* Un bloque agotado se apaga en vez de desaparecer: quien mira
                   tiene que poder ver que existe y que no queda nada, no
                   preguntarse dónde está la sección que le dijeron. */
                fillOpacity={vacio ? 0.12 : 0.85}
                stroke={color || NEUTRO}
                strokeOpacity={0.6}
                strokeWidth={1}
                style={{ cursor: onBloque && !vacio ? 'pointer' : 'default' }}>
                <title>{b.libres != null ? `${b.nombre} — ${vacio ? 'agotado' : `${b.libres} libres`}` : b.nombre}</title>
              </polygon>
              {b.centro && (
                /* La etiqueta no recibe clics: si los recibiera, tocar el
                   número «122» no abriría la sección 122. */
                <text
                  x={b.centro[0]} y={b.centro[1]}
                  textAnchor="middle" dominantBaseline="middle"
                  className="fill-white"
                  style={{ pointerEvents: 'none', fontSize: b.tamanoTexto || 14, fontWeight: 600 }}>
                  {b.nombre}
                </text>
              )}
            </g>
          );
        })}

        {unidades.map(u => {
          const x = Number(u.geometria?.x) || 0;
          const y = Number(u.geometria?.y) || 0;
          const rot = Number(u.geometria?.rot) || 0;
          const mio = u.id === valor;
          const color = colorDe?.(u) || null;
          return (
            <rect
              key={u.id}
              data-id={u.id}
              x={x} y={y} width={LADO} height={LADO} rx={5}
              /* El giro va por atributo, alrededor del centro de la silla. Sin
                 el centro, girar la desplaza además de orientarla. */
              transform={rot ? `rotate(${rot} ${x + LADO / 2} ${y + LADO / 2})` : undefined}
              /* Ocupado NUNCA lleva el color de su localidad: si lo llevara, el
                 mapa parecería más disponible de lo que está. */
              fill={!u.libre && !mio ? NEUTRO : (color || 'transparent')}
              fillOpacity={!u.libre && !mio ? 0.18 : (color ? 0.85 : 0)}
              stroke={mio ? 'currentColor' : (color || NEUTRO)}
              strokeOpacity={!u.libre && !mio ? 0.35 : 1}
              className={mio ? 'text-accent stroke-accent' : ''}
              strokeWidth={mio ? 2.5 : 1}
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

/* La leyenda: qué precio es cada color. Sin ella el mapa es bonito y mudo —
   nadie deduce que el rojo son 450 mil mirando el rojo. */
export function LeyendaDePrecios({ localidades = [], formato }) {
  if (!localidades.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {localidades.map(l => (
        <li key={l.id} className="flex items-center gap-1.5 text-xs text-text-2">
          <span aria-hidden="true" className="w-3 h-3 rounded-sm shrink-0"
            style={{ background: l.color }} />
          <span className="text-text-1">{l.nombre}</span>
          {l.precio != null && (
            <span className="text-text-3">{formato ? formato(l.precio, l.currency) : l.precio}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* El centro de un polígono, para poner su etiqueta encima.
 *
 * Es el centro de la caja que lo contiene, no el centroide de verdad. Para las
 * formas de un recinto —rectángulos y trapecios— caen casi en el mismo sitio, y
 * el centroide real de un polígono cóncavo puede quedar FUERA de la figura:
 * la etiqueta «122» acabaría flotando en el pasillo de al lado. */
export function centroDe(geometria) {
  /* Si el bloque trae su propio ancla, manda. La calcula quien lo generó, que
     conoce el ángulo y el radio del arco, y por eso acierta donde la caja
     falla: en un arco ancho el centro de la caja cae en el AGUJERO, y el nombre
     se dibuja flotando fuera de la figura. */
  const propio = geometria?.centro;
  if (Array.isArray(propio) && propio.length === 2
      && Number.isFinite(Number(propio[0])) && Number.isFinite(Number(propio[1]))) {
    return [Number(propio[0]), Number(propio[1])];
  }

  const puntos = geometria?.puntos || [];
  if (puntos.length < 3) return null;
  const xs = puntos.map(p => Number(p[0])).filter(Number.isFinite);
  const ys = puntos.map(p => Number(p[1])).filter(Number.isFinite);
  if (!xs.length || !ys.length) return null;
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}
