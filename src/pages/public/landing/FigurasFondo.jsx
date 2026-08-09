/* Las figuras del fondo del hero.

   Van DETRÁS de "GESTEK / Personaliza, organiza y crece", repartidas por todo
   el ancho, cada una a su altura, a su tamaño y con su giro. No es una tira ni
   una cuadrícula: es un puñado de piezas sueltas, como el nudo del logo visto
   de cerca. Una fila ordenada se lee como un carrusel de catálogo; esto se lee
   como fondo.

   La forma es el eslabón del logo, el mismo hexágono alargado del nudo.

   Se llenan con las PORTADAS DE LOS EVENTOS PUBLICADOS de verdad. Las que
   sobran se quedan en gris cálido, así que la sección nunca se ve rota: se va
   encendiendo sola a medida que se publican eventos.

   Dos cosas que mandan sobre lo bonito:

   · El texto va primero. Las piezas se quedan por debajo del 40% de opacidad
     y llevan un velo encima que se oscurece hacia el centro, que es justo por
     donde pasa el titular. Un fondo que compite con el titular es un fondo
     mal puesto.

   · No capturan el puntero. Están debajo de los botones de "Crear mi cuenta"
     y "Ver cómo funciona"; si fueran enlaces, se comerían clics del CTA. Son
     decoración honesta: el que quiera ver eventos tiene Explorar en el menú. */

import { useEffect, useRef, useState } from 'react';
import { eventosApi } from '../../../api/eventos.js';

/* El eslabón del logo, normalizado a la caja de la pieza. */
const ESLABON = 'polygon(50% 0%, 100% 21%, 100% 79%, 50% 100%, 0% 79%, 0% 21%)';

/* Repartidas a mano, no generadas: quería controlar que el centro quede
   despejado para el titular y que las esquinas no queden vacías.
   izq/arr en % del hero · w en px · giro en grados · op = opacidad ·
   dur = segundos que tarda el vaivén. */
const FIGURAS = [
  { izq:  3, arr:  6, w: 132, giro: -14, op: 0.34, dur: 17 },
  { izq: 12, arr: 52, w:  92, giro:  11, op: 0.26, dur: 21 },
  { izq: 21, arr: 18, w:  68, giro:  -6, op: 0.18, dur: 14 },
  { izq: 30, arr: 74, w: 110, giro:  17, op: 0.22, dur: 24 },
  { izq: 44, arr:  3, w:  74, giro: -10, op: 0.14, dur: 19 },
  { izq: 56, arr: 80, w:  86, giro:   8, op: 0.16, dur: 16 },
  { izq: 67, arr: 30, w:  64, giro: -13, op: 0.15, dur: 22 },
  { izq: 74, arr: 66, w: 104, giro:  15, op: 0.24, dur: 18 },
  { izq: 83, arr: 12, w: 122, giro:  -9, op: 0.30, dur: 20 },
  { izq: 90, arr: 58, w:  88, giro:  12, op: 0.27, dur: 15 },
  { izq: 37, arr: 40, w:  56, giro:   5, op: 0.10, dur: 26 },
];

const STYLE_ID = 'gestek-figuras-fondo';
const CSS = `
@keyframes gestek-flota {
  0%, 100% { transform: translate3d(0, 0, 0) }
  50%      { transform: translate3d(0, -22px, 0) }
}
.gestek-figura { animation: gestek-flota var(--dur) ease-in-out infinite; will-change: transform }
@media (prefers-reduced-motion: reduce) { .gestek-figura { animation: none } }
`;

export default function FigurasFondo() {
  const [eventos, setEventos] = useState([]);
  const inyectado = useRef(false);

  useEffect(() => {
    if (inyectado.current || document.getElementById(STYLE_ID)) return;
    inyectado.current = true;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    eventosApi.publicos({ limit: 20 })
      .then((d) => setEventos((d.eventos || []).filter(e => e.cover_url || e.gallery?.[0])))
      .catch(() => { /* sin eventos, todas las piezas se quedan apagadas */ });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {FIGURAS.map((f, i) => {
        /* Cada evento ocupa UNA pieza. Repetir el mismo cuatro veces se nota;
           una pieza apagada se lee como sitio reservado. */
        const ev = eventos[i] || null;
        const imagen = ev?.cover_url || ev?.gallery?.[0];
        return (
          <div
            key={i}
            className="gestek-figura absolute"
            style={{
              left: `${f.izq}%`, top: `${f.arr}%`,
              width: f.w, height: f.w * 1.44,
              opacity: f.op,
              '--dur': `${f.dur}s`,
              animationDelay: `${-i * 1.7}s`,   // que no respiren todas a la vez
            }}
          >
            <div
              className="w-full h-full"
              style={{ transform: `rotate(${f.giro}deg)`, clipPath: ESLABON, WebkitClipPath: ESLABON }}
            >
              {imagen ? (
                <img src={imagen} alt="" loading="lazy" decoding="async"
                     className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-surface-3 via-surface-2 to-surface" />
              )}
            </div>
          </div>
        );
      })}

      {/* El velo. Se oscurece hacia el centro, que es por donde pasa el
          titular, y deja respirar las esquinas. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(46rem 26rem at 50% 32%, rgb(var(--color-bg) / 0.92), rgb(var(--color-bg) / 0.55) 62%, transparent 100%)',
        }}
      />
    </div>
  );
}
