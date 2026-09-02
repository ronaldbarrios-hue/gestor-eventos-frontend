import { forwardRef, useCallback, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/* GESTEK — Lo que se despliega encima de un modal.

   El contenedor del modal recorta a sus hijos con `overflow`, así que cualquier
   cosa que se abra dentro de él —la lista de un selector buscable, el menú de
   formatos de descarga— se corta contra su borde y no hay `z-index` que la
   salve: el recorte no es un problema de capas, es que el padre no la deja
   salir.

   Se descubrió dos veces: primero en el desplegable de «Comuna», donde se veían
   cinco opciones de cuarenta y ocho; y otra vez, el mismo día, en el menú de
   descarga recién escrito, donde la tercera opción quedaba fuera del modal y no
   se podía pulsar. La segunda vez es la que justifica este archivo: escrito
   suelto, el fallo vuelve cada vez que alguien añade un desplegable.

   Lo que hace: saca el contenido a `document.body` por portal y lo coloca en
   coordenadas de pantalla, midiendo el ancla. Si abajo no cabe y arriba hay más
   sitio, se abre hacia arriba. Se remide en cada scroll y en cada cambio de
   tamaño — con captura, porque el scroll de un contenedor interno (el del
   modal, justamente) no burbujea, y en el registro embebido el ancla se mueve
   con la página. */

export function usePosicionFlotante(abierto, ancla, { altoMax = 256, hueco = 4, minAlto = 140 } = {}) {
  const [pos, setPos] = useState(null);

  const medir = useCallback(() => {
    const el = ancla.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const debajo = window.innerHeight - r.bottom;
    /* Hacia arriba sólo si abajo no cabe Y arriba hay más sitio: si no, el
       desplegable salta de lado en una pantalla pequeña por diez píxeles. */
    const arriba = debajo < altoMax - 36 && r.top > debajo;
    setPos({
      left: r.left,
      width: r.width,
      alto: Math.max(minAlto, Math.min(altoMax, (arriba ? r.top : debajo) - hueco - 8)),
      ...(arriba
        ? { bottom: window.innerHeight - r.top + hueco }
        : { top: r.bottom + hueco }),
    });
  }, [ancla, altoMax, hueco, minAlto]);

  useLayoutEffect(() => {
    if (!abierto) { setPos(null); return; }
    medir();
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [abierto, medir]);

  return pos;
}

/* El envoltorio. `ancho` decide si copia el ancho del ancla —lo que quiere una
   lista de opciones, que ha de alinearse con su campo— o si se queda con el
   suyo, que es lo que quiere un menú corto colgado de un botón estrecho.

   `as` porque quien lo usa manda en el elemento: una lista de opciones tiene
   que ser un `ul` de verdad para que sus `li` sean legales, y un menú puede ser
   un `div`. Y `forwardRef` porque el «cerrar al pinchar fuera» necesita saber
   si el clic cayó dentro, y el contenido ya no es hijo de su ancla. */
export const Flotante = forwardRef(function Flotante(
  { pos, as: Etiqueta = 'div', ancho = 'ancla', className = '', style, children, ...resto }, ref,
) {
  if (!pos) return null;
  return createPortal(
    <Etiqueta
      {...resto}
      ref={ref}
      style={{
        position: 'fixed',
        left: pos.left,
        maxHeight: pos.alto,
        ...(ancho === 'ancla' ? { width: pos.width } : {}),
        ...(pos.top != null ? { top: pos.top } : { bottom: pos.bottom }),
        ...style,
      }}
      className={`z-[100] overflow-y-auto ${className}`}>
      {children}
    </Etiqueta>,
    document.body,
  );
});
