import { useMemo, useRef, useState } from 'react';
import ImagePicker from '../ui/ImagePicker.jsx';

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
  fondo, onFondo, ownerId, guardando, alto = 460,
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

  /* Sillas y bloques son lo mismo para el editor: cosas con forma que se
     mueven. Se llevaban por separado, y eso obligaba a escribir dos veces cada
     gesto --arrastrar, girar, descartar, guardar--, que es exactamente como
     empiezan a comportarse distinto sin que nadie lo note. */
  const movibles = useMemo(() => [
    ...espacios.filter(e => e.geometria?.x != null),
    ...bloques.filter(b => (b.geometria?.puntos || []).length >= 3),
  ], [espacios, bloques]);

  const dibujables = useMemo(() => movibles.filter(e => e.geometria?.x != null), [movibles]);
  const posDe = (e) => movidos[e.id] || e.geometria;
  const esPoligono = (g) => Array.isArray(g?.puntos);

  /* Correr una forma, sea del tipo que sea. Un punto mueve su x/y; un poligono
     mueve TODOS sus vertices: moviendo solo el primero, el bloque se estiraria
     en vez de desplazarse. */
  const correr = (g, dx, dy) => (esPoligono(g)
    ? { ...g, puntos: g.puntos.map(([x, y]) => [x + dx, y + dy]),
        centro: g.centro ? [g.centro[0] + dx, g.centro[1] + dy] : undefined }
    : { ...g, x: g.x + dx, y: g.y + dy });

  const pegarForma = (g) => (esPoligono(g)
    ? { ...g, puntos: g.puntos.map(([x, y]) => [pegar(x), pegar(y)]) }
    : { ...g, x: pegar(g.x), y: pegar(g.y) });

  const caja = useMemo(() => {
    const xs = [];
    const ys = [];
    for (const e of dibujables) {
      const g = movidos[e.id] || e.geometria;
      xs.push(Number(g.x) || 0, (Number(g.x) || 0) + LADO);
      ys.push(Number(g.y) || 0, (Number(g.y) || 0) + LADO);
    }
    for (const b of bloques) {
      const gb = movidos[b.id] || b.geometria;
      for (const [px, py] of gb?.puntos || []) {
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

    const d = ev.target?.dataset || {};
    const p = enPlano(ev);

    /* Un vertice se arrastra EL solo, no la figura entera. Es lo que convierte
       "vuelve a dibujar el bloque" en "corrige esa esquina". */
    if (d.vertice != null) {
      gesto.current = {
        tipo: 'vertice', desde: p, id: d.duenio, indice: Number(d.vertice),
        inicio: { ...posDe(movibles.find(x => x.id === d.duenio)) },
      };
      return;
    }

    const id = d.id;
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
      const e = movibles.find(x => x.id === i);
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

    if (g.tipo === 'vertice') {
      const base = g.inicio;
      setMovidos(m => ({
        ...m,
        [g.id]: {
          ...base,
          puntos: base.puntos.map(([x, y], i2) => (i2 === g.indice ? [x + dx, y + dy] : [x, y])),
          /* El ancla de la etiqueta se borra al tocar un vertice: la calculo
             quien conocia el arco, y con la figura cambiada a mano ya no
             corresponde. Sin ancla, se vuelve al centro de la caja. */
          centro: undefined,
        },
      }));
      return;
    }

    /* Se mueve desde la posicion de INICIO del gesto, no desde la actual. Con
       incrementos, cada repintado acumula el redondeo y el grupo se deforma. */
    const sig = { ...movidos };
    for (const id of g.ids) {
      const ini = g.inicio[id];
      if (ini) sig[id] = correr(ini, dx, dy);
    }
    setMovidos(sig);
  };

  const alSoltar = () => {
    const g = gesto.current;
    gesto.current = null;
    if (!g || g.tipo === 'mapa') return;
    const ids = g.tipo === 'vertice' ? [g.id] : g.ids;
    setMovidos(m => {
      const sig = { ...m };
      for (const id of ids) if (sig[id]) sig[id] = pegarForma(sig[id]);
      return sig;
    });
  };

  const girar = (grados) => {
    if (!sel.size) return;
    setMovidos(m => {
      const sig = { ...m };
      for (const id of sel) {
        const e = movibles.find(x => x.id === id);
        if (!e) continue;
        const g = sig[id] || e.geometria;
        /* Un poligono se gira moviendo sus vertices alrededor de su centro; un
           punto, con su atributo `rot`. Girar un poligono con `rot` lo dejaria
           bien en pantalla y mal en los datos: el siguiente que lea sus puntos
           lo veria sin girar. */
        if (esPoligono(g)) {
          const xs2 = g.puntos.map(q => q[0]);
          const ys2 = g.puntos.map(q => q[1]);
          const cx = (Math.min(...xs2) + Math.max(...xs2)) / 2;
          const cy = (Math.min(...ys2) + Math.max(...ys2)) / 2;
          const rad = (grados * Math.PI) / 180;
          sig[id] = {
            ...g,
            puntos: g.puntos.map(([x, y]) => [
              Math.round((cx + (x - cx) * Math.cos(rad) - (y - cy) * Math.sin(rad)) * 100) / 100,
              Math.round((cy + (x - cx) * Math.sin(rad) + (y - cy) * Math.cos(rad)) * 100) / 100,
            ]),
            centro: undefined,
          };
        } else {
          sig[id] = { ...g, rot: Math.round(((Number(g.rot) || 0) + grados) % 360) };
        }
      }
      return sig;
    });
  };

  const cambios = Object.entries(movidos)
    .filter(([id, g]) => {
      const e = movibles.find(x => x.id === id);
      if (!e) return false;
      /* Solo lo que de verdad cambio. Sin este filtro, un clic sin arrastre
         contaria como cambio y el boton pediria guardar nada.
         Se comparan en JSON porque un poligono no se compara campo a campo sin
         escribir el recorrido a mano, y ese recorrido escrito aparte es otra
         lista que se separa. */
      return JSON.stringify(e.geometria) !== JSON.stringify(g);
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
              Arrastra sitios y bloques. Ctrl+clic para elegir varios; con un bloque elegido, sus esquinas se mueven una a una.
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
      {onFondo && <Fondo fondo={fondo} onFondo={onFondo} ownerId={ownerId} />}

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
          {bloques.map(b => {
            const g = posDe(b);
            const elegido = sel.has(b.id);
            return (
              <polygon key={b.id}
                data-id={modo === 'trazar' ? undefined : b.id}
                points={puntosDe(g)}
                fill={b.color || 'currentColor'} fillOpacity={elegido ? 0.55 : 0.7}
                stroke="currentColor" strokeOpacity={elegido ? 1 : 0.5}
                strokeWidth={elegido ? 3 : 1}
                className={elegido ? 'text-accent' : ''}
                style={{ cursor: modo === 'trazar' ? 'crosshair' : 'move',
                         pointerEvents: modo === 'trazar' ? 'none' : 'auto' }}>
                <title>{b.nombre}</title>
              </polygon>
            );
          })}

          {/* Los tiradores de los vertices, y SOLO cuando hay un bloque
              elegido. Con todos a la vez el plano se llena de circulos y deja
              de verse el recinto, que es lo que se esta mirando. */}
          {modo === 'mover' && sel.size === 1 && (() => {
            const b = bloques.find(x => sel.has(x.id));
            if (!b) return null;
            const g = posDe(b);
            return (g.puntos || []).map(([x, y], i2) => (
              <circle key={i2} cx={x} cy={y} r={7}
                data-vertice={i2} data-duenio={b.id}
                className="text-accent" fill="currentColor" stroke="#fff" strokeWidth={2}
                style={{ cursor: 'grab' }} />
            ));
          })()}

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
              : (sel.size
                  ? `${sel.size} seleccionado${sel.size > 1 ? 's' : ''}${
                      sel.size === 1 && bloques.some(x => sel.has(x.id))
                        ? ' · arrastra un punto blanco para corregir la forma' : ''}`
                  : `${dibujables.length} sitios · ${bloques.length} bloques`)}
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
function Fondo({ fondo, onFondo, ownerId }) {
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
      {/* El mismo selector que el resto de la plataforma: sube al almacén de
          imágenes del evento o acepta un enlace. Escribir aquí un subidor
          propio habría dejado dos listas de tipos permitidos que se separan a
          la primera prisa — el modo de fallo de este proyecto. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[16rem]">
          <ImagePicker
            value={url} ownerId={ownerId}
            onChange={(nueva) => onFondo({ ...fondo, url: nueva })}
            placeholder="Sube el plano del recinto, o pega su enlace" />
        </div>
        {url && (
          <button type="button"
            onClick={() => { onFondo({ url: '', opacidad: fondo?.opacidad }); setAbierto(false); }}
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
