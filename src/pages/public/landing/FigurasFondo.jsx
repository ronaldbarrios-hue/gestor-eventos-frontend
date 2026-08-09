/* Las figuras del fondo del hero.

   Van DETRÁS de "GESTEK / Personaliza, organiza y crece", repartidas por todo
   el ancho, cada una a su altura, a su tamaño y con su giro. No es una tira ni
   una cuadrícula: es un puñado de piezas sueltas. Una fila ordenada se lee
   como carrusel de catálogo; esto se lee como fondo.

   Se llenan con las PORTADAS DE LOS EVENTOS ACTIVOS de toda la plataforma, y
   van ROTANDO: cada pocos segundos algunas piezas cambian de evento. Así, por
   muchos eventos que haya publicados, todos acaban pasando por la portada en
   vez de quedarse los diez primeros para siempre. Es el escaparate de GESTEK,
   y tiene que repartir.

   Cuatro cosas mandan sobre lo bonito:

   · El texto va primero. En reposo ninguna pieza pasa del 34% de opacidad y
     llevan un velo encima que se cierra hacia el centro, que es por donde va
     el titular. Un fondo que compite con el titular es un fondo mal puesto.

   · Al pasar el puntero por una pieza con evento, esa se enciende: sube a
     opacidad plena, se agranda un poco, se le pone filo de latón y sale el
     nombre. Las demás no se tocan. Hasta que no la señalas no promete nada,
     y cuando la señalas queda claro que es pulsable.

   · Solo las que TIENEN evento capturan el puntero. Las grises son
     decoración y dejan pasar el clic; si no, se comerían clics del CTA.

   · Las piezas que caen sobre la columna del texto se marcan `alFondo` y no
     son pulsables aunque tengan evento: por ahí pasan "Crear mi cuenta" y
     "Ver cómo funciona", y un enlace invisible por debajo de un botón es una
     trampa. */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventosApi } from '../../../api/eventos.js';

/* El eslabón del logo, normalizado a la caja de la pieza. */
const ESLABON = 'polygon(50% 0%, 100% 21%, 100% 79%, 50% 100%, 0% 79%, 0% 21%)';

/* Repartidas a mano, no generadas: quería controlar que el centro quede
   despejado para el titular y que las esquinas no queden vacías.
   izq/arr en % del hero · w en px · giro en grados · op = opacidad en reposo
   dur = segundos del vaivén · alFondo = cae sobre la columna del texto. */
const FIGURAS = [
  { izq:  2, arr:  4, w: 138, giro: -14, op: 0.34, dur: 17 },
  { izq:  9, arr: 30, w:  74, giro:   9, op: 0.22, dur: 23 },
  { izq: 13, arr: 58, w:  98, giro:  11, op: 0.28, dur: 21 },
  { izq: 21, arr: 12, w:  66, giro:  -6, op: 0.20, dur: 14 },
  { izq: 24, arr: 78, w:  84, giro: -17, op: 0.24, dur: 26 },
  { izq: 31, arr: 44, w:  58, giro:  17, op: 0.14, dur: 19, alFondo: true },
  { izq: 37, arr:  6, w:  70, giro: -10, op: 0.15, dur: 24, alFondo: true },
  { izq: 44, arr: 72, w:  62, giro:   7, op: 0.13, dur: 16, alFondo: true },
  { izq: 52, arr: 34, w:  54, giro: -12, op: 0.10, dur: 27, alFondo: true },
  { izq: 58, arr:  8, w:  68, giro:   5, op: 0.14, dur: 18, alFondo: true },
  { izq: 63, arr: 76, w:  92, giro:   8, op: 0.20, dur: 15 },
  { izq: 70, arr: 26, w:  72, giro: -13, op: 0.18, dur: 22 },
  { izq: 77, arr: 60, w: 106, giro:  15, op: 0.26, dur: 18 },
  { izq: 84, arr:  8, w: 126, giro:  -9, op: 0.32, dur: 20 },
  { izq: 91, arr: 40, w:  66, giro:  13, op: 0.19, dur: 25 },
  { izq: 94, arr: 70, w:  90, giro:  -7, op: 0.27, dur: 15 },
];

/* Cada cuántos segundos rota el reparto de eventos entre las piezas. Ni tan
   rápido que parpadee ni tan lento que nadie llegue a ver el cambio. */
const SEGUNDOS_ENTRE_TURNOS = 6;

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
  const [turno, setTurno] = useState(0);
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
    /* Se piden bastantes más de los que caben para que la rotación tenga de
       dónde tirar. Si solo hay tres eventos publicados, se ven tres y ya. */
    eventosApi.publicos({ limit: 60 })
      .then((d) => setEventos((d.eventos || []).filter(e => e.cover_url || e.gallery?.[0])))
      .catch(() => { /* sin eventos, todas las piezas se quedan apagadas */ });
  }, []);

  /* La rotación solo tiene sentido si hay más eventos que piezas. Con menos,
     cada uno ya tiene su sitio fijo y moverlos sería parpadeo gratis. */
  const rota = eventos.length > FIGURAS.length;
  useEffect(() => {
    if (!rota) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setTurno(t => t + 1), SEGUNDOS_ENTRE_TURNOS * 1000);
    return () => clearInterval(id);
  }, [rota]);

  return (
    <div className="absolute inset-0 overflow-hidden select-none">
      {FIGURAS.map((f, i) => {
        /* Con MÁS eventos que piezas, cada pieza toma uno distinto y en cada
           turno el reparto se desplaza uno: van entrando de a poco en vez de
           cambiar todas a la vez.

           Con MENOS, cada evento ocupa una pieza y las demás se quedan
           grises. Rellenar dando la vuelta repetiría el mismo evento cuatro
           veces, y eso se nota y se lee como relleno; una pieza apagada se
           lee como sitio reservado. */
        const ev = rota
          ? eventos[(i + turno) % eventos.length]
          : (eventos[i] || null);
        return <Pieza key={i} figura={f} evento={ev} />;
      })}

      {/* El velo. Se oscurece hacia el centro, que es por donde pasa el
          titular, y deja respirar las esquinas. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(46rem 26rem at 50% 32%, rgb(var(--color-bg) / 0.92), rgb(var(--color-bg) / 0.55) 62%, transparent 100%)',
        }}
      />
    </div>
  );
}

function Pieza({ figura: f, evento: ev }) {
  const imagen = ev?.cover_url || ev?.gallery?.[0];
  /* Pulsable solo si tiene evento Y no cae sobre la columna del texto. */
  const pulsable = !!(imagen && ev?.slug && !f.alFondo);

  const cuerpo = (
    <div
      className="w-full h-full transition-[transform,filter] duration-300 group-hover:scale-[1.06]"
      style={{ transform: `rotate(${f.giro}deg)`, clipPath: ESLABON, WebkitClipPath: ESLABON }}
    >
      {imagen ? (
        <img src={imagen} alt="" loading="lazy" decoding="async"
             className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-surface-3 via-surface-2 to-surface" />
      )}
    </div>
  );

  return (
    <div
      className={`gestek-figura absolute group transition-opacity duration-300
                  ${pulsable ? 'pointer-events-auto cursor-pointer hover:!opacity-100' : 'pointer-events-none'}`}
      style={{
        left: `${f.izq}%`, top: `${f.arr}%`,
        width: f.w, height: f.w * 1.44,
        opacity: f.op,
        '--dur': `${f.dur}s`,
        animationDelay: `${-f.izq * 0.11}s`,   // que no respiren todas a la vez
      }}
      aria-hidden={!pulsable}
    >
      {pulsable ? (
        <Link to={`/explorar/${ev.slug}`} className="block w-full h-full" title={ev.titulo}>
          {cuerpo}
          {/* El nombre solo al señalar. En reposo sería ruido encima del
              titular; al señalar es lo que dice a dónde lleva el clic. */}
          <span
            className="absolute inset-x-0 bottom-[14%] px-3 text-center text-[11px] font-semibold
                       text-white leading-tight opacity-0 group-hover:opacity-100
                       transition-opacity duration-300 pointer-events-none
                       [text-shadow:0_1px_6px_rgb(18_16_11)]"
          >
            {ev.titulo}
          </span>
        </Link>
      ) : cuerpo}
    </div>
  );
}
