/* Una barra de «cuánto de esto va lleno».
 *
 * Estaba escrita a mano en siete sitios: el aforo de una zona, el cupo de un
 * tipo de boleta, la bolsa de puntos de un stand, las fuentes de tráfico de
 * Analytics… Siempre lo mismo —un carril y algo dentro— y siempre con
 * pequeñas diferencias que nadie decidió: `bg-surface-2` en unos y
 * `bg-surface-3` en otros, `h-1`, `h-1.5` o `h-2` según el día.
 *
 * ── Lo que sí varía de verdad, y por eso son props ────────────────────────
 *
 * · El **alto**: en una tarjeta apretada la barra es un hilo; en un tablero
 *   que se lee de pie, gruesa.
 * · El **color**: unas veces es fijo, otras depende del valor (verde → ámbar →
 *   rojo al llenarse) y otras viene de un dato (el color de la fuente de
 *   tráfico). Se acepta una clase de Tailwind o un color CSS, porque los tres
 *   casos existen y forzar uno solo obligaría a inventar clases dinámicas —que
 *   Tailwind purga y dejan la barra invisible.
 *
 * ── Lo que NO se deja pasar ───────────────────────────────────────────────
 *
 * El porcentaje se acota entre 0 y 100 aquí dentro. Un `width: 140%` se sale
 * del carril y pinta por encima de lo que haya al lado, y pasarse SÍ ocurre:
 * el aforo por zonas permite exceder el máximo a propósito —lo marca, no lo
 * bloquea—, así que 140 es un valor real que llega hasta aquí. */

export default function BarraProgreso({
  pct,
  alto = 'h-1.5',
  color = 'bg-text-1',
  fondo = 'bg-surface-2',
  className = '',
  /* Para lectores de pantalla: la barra es un dibujo, y sin esto quien no la
     ve no se entera de nada. */
  etiqueta = null,
}) {
  const n = Math.max(0, Math.min(100, Number(pct) || 0));
  /* Una clase de Tailwind se aplica como clase; cualquier otra cosa —`#a1b2c3`,
     `rgb(...)`, una variable CSS— va como estilo. Distinguirlo por el prefijo
     es tosco pero honesto: lo que no empieza por `bg-` no es una clase. */
  const esClase = typeof color === 'string' && color.startsWith('bg-');

  return (
    <div className={`${alto} rounded-full ${fondo} overflow-hidden ${className}`}
      role="progressbar" aria-valuenow={Math.round(n)} aria-valuemin={0} aria-valuemax={100}
      {...(etiqueta ? { 'aria-label': etiqueta } : {})}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${esClase ? color : ''}`}
        style={{ width: `${n}%`, ...(esClase ? {} : { background: color }) }}
      />
    </div>
  );
}
