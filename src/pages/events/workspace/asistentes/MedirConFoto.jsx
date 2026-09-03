import { useEffect, useRef, useState } from 'react';

/* Medir una etiqueta con una foto.
 *
 * ── Por qué hace falta una referencia, y no es un capricho ────────────────
 *
 * De una foto **no se puede sacar un tamaño**. Un rollo pequeño de cerca y uno
 * grande de lejos dan exactamente la misma imagen: la cámara no sabe a qué
 * distancia está nada. Cualquier herramienta que prometa medir con la cámara
 * sin una referencia está adivinando, y aquí adivinar significa comprar el rollo
 * equivocado o imprimir mil escarapelas cortadas.
 *
 * Con una referencia de tamaño conocido en la misma foto, el cálculo es una
 * regla de tres y sale exacto. La referencia buena es **una tarjeta de crédito
 * o la cédula**: son 85,6 × 54 mm por norma (ISO 7810), en todo el mundo, y
 * todo el mundo tiene una.
 *
 * ── Por qué lo marca la persona y no el programa ─────────────────────────
 *
 * Detectar los bordes automáticamente es posible, pero falla con reflejos,
 * sombras o un rollo blanco sobre mesa blanca — y falla **en silencio**, dando
 * un número plausible y equivocado. Aquí lo que cada quien hace mejor: la
 * persona reconoce los bordes de un vistazo, y el programa hace la aritmética,
 * que es donde la persona se equivoca.
 *
 * Tres arrastres y ya: el lado largo de la tarjeta, el ancho de la etiqueta y
 * su alto.
 */

/* ISO/IEC 7810 ID-1: el tamaño de una tarjeta bancaria y de casi cualquier
   documento de identidad con banda. */
const TARJETA_MM = 85.6;

const PASOS = [
  { id: 'ref',   titulo: 'El lado largo de la tarjeta', ayuda: 'Arrastra de un extremo al otro del lado LARGO de la tarjeta.' },
  { id: 'ancho', titulo: 'El ancho de la etiqueta',      ayuda: 'Ahora el lado horizontal de una etiqueta del rollo.' },
  { id: 'alto',  titulo: 'El alto de la etiqueta',       ayuda: 'Y por último el lado vertical de la misma etiqueta.' },
];

const largo = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

export default function MedirConFoto({ onListo, onCerrar }) {
  const [imagen, setImagen] = useState(null);
  const [paso, setPaso] = useState(0);
  const [lineas, setLineas] = useState({});
  const [arrastre, setArrastre] = useState(null);
  const lienzo = useRef(null);

  /* La foto se lee en el navegador y no se sube a ninguna parte: para esto no
     hace falta que salga del equipo, y una foto del sitio es una foto del
     sitio. */
  const cargar = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { setImagen(img); setPaso(0); setLineas({}); URL.revokeObjectURL(url); };
    img.src = url;
  };

  const puntoDe = (e) => {
    const r = lienzo.current.getBoundingClientRect();
    const t = e.touches?.[0] || e;
    return { x: (t.clientX - r.left) / r.width, y: (t.clientY - r.top) / r.height };
  };

  const empezar = (e) => { if (paso < PASOS.length) setArrastre({ a: puntoDe(e), b: puntoDe(e) }); };
  const mover   = (e) => { if (arrastre) setArrastre(v => ({ ...v, b: puntoDe(e) })); };
  const soltar  = () => {
    if (!arrastre) return;
    /* Un toque sin arrastrar no es una medida: se ignora en vez de guardar una
       línea de cero y dejar el resultado en infinito. */
    if (largo(arrastre.a, arrastre.b) > 0.02) {
      setLineas(l => ({ ...l, [PASOS[paso].id]: arrastre }));
      setPaso(p => p + 1);
    }
    setArrastre(null);
  };

  useEffect(() => {
    const fin = () => setArrastre(null);
    window.addEventListener('mouseup', fin);
    return () => window.removeEventListener('mouseup', fin);
  }, []);

  /* La regla de tres. Se hace sobre proporciones del lienzo, así que da igual a
     qué tamaño se esté viendo la foto. */
  const escala = lineas.ref ? TARJETA_MM / largo(lineas.ref.a, lineas.ref.b) : null;
  const anchoMm = escala && lineas.ancho ? largo(lineas.ancho.a, lineas.ancho.b) * escala : null;
  const altoMm  = escala && lineas.alto  ? largo(lineas.alto.a,  lineas.alto.b)  * escala : null;

  const listo = anchoMm && altoMm;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={onCerrar}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-1">Medir el rollo con una foto</h3>
          <p className="text-xs text-text-3 mt-1 leading-relaxed">
            Pon una <b className="text-text-2">tarjeta</b> —bancaria o la cédula— encima del rollo y hazle
            una foto de frente. Sirve de regla: mide 85,6 mm por norma.
          </p>
        </div>

        <div className="p-5 space-y-4">
          {!imagen ? (
            <>
              <label className="block rounded-2xl border border-dashed border-border px-5 py-10 text-center cursor-pointer hover:bg-surface-2/40 transition-colors">
                <input type="file" accept="image/*" capture="environment" className="hidden"
                       onChange={e => cargar(e.target.files?.[0])} />
                <p className="text-sm text-text-1">Tomar o elegir la foto</p>
                <p className="text-xs text-text-3 mt-1">La foto se queda en tu equipo: no se sube.</p>
              </label>
              <p className="text-[11px] text-text-3 leading-relaxed">
                De frente y sin inclinar. Una foto en ángulo mide de menos el lado que se aleja, y el
                error se lo lleva la etiqueta entera.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-text-1">
                {paso < PASOS.length ? PASOS[paso].titulo : 'Listo'}
              </p>
              <p className="text-xs text-text-3 -mt-2">
                {paso < PASOS.length ? PASOS[paso].ayuda : 'Comprueba las medidas y aplícalas.'}
              </p>

              <div ref={lienzo}
                   className="relative rounded-xl overflow-hidden border border-border select-none touch-none"
                   onMouseDown={empezar} onMouseMove={mover} onMouseUp={soltar}
                   onTouchStart={empezar} onTouchMove={mover} onTouchEnd={soltar}>
                <img src={imagen.src} alt="" className="w-full block pointer-events-none" />
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1 1"
                     preserveAspectRatio="none">
                  {[...Object.entries(lineas), ...(arrastre ? [['activa', arrastre]] : [])].map(([k, l]) => (
                    <line key={k} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y}
                          stroke={k === 'ref' ? '#22c55e' : k === 'activa' ? '#f59e0b' : '#3b82f6'}
                          strokeWidth="0.006" vectorEffect="non-scaling-stroke" />
                  ))}
                </svg>
              </div>

              {listo && (
                <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3">
                  <p className="text-sm text-text-1">
                    Medida: <b className="tabular-nums">{anchoMm.toFixed(1)} × {altoMm.toFixed(1)} mm</b>
                  </p>
                  <p className="text-[11px] text-text-3 mt-1 leading-relaxed">
                    Es una estimación, no un calibre. Antes de comprar nada, compárala con lo que diga
                    la caja del rollo — y si imprimes una de prueba, mídela con una regla.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-between gap-2">
          <button onClick={() => { setImagen(null); setPaso(0); setLineas({}); }}
                  disabled={!imagen} className="btn-ghost btn-sm disabled:opacity-40">
            Otra foto
          </button>
          <div className="flex gap-2">
            <button onClick={onCerrar} className="btn-ghost btn-sm">Cancelar</button>
            <button onClick={() => onListo({ ancho: Number(anchoMm.toFixed(1)), alto: Number(altoMm.toFixed(1)) })}
                    disabled={!listo} className="btn-primary btn-sm disabled:opacity-40">
              Usar estas medidas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
