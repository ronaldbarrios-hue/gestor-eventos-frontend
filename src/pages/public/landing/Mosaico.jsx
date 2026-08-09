/* Tira de eventos hechos con GESTEK.

   Las figuras son el eslabón del logo: el mismo hexágono alargado del nudo,
   girado, para que la sección hable el idioma de la marca en vez de traer
   formas prestadas.

   Corre de derecha a izquierda, en bucle continuo, con varias figuras a la
   vez. Se llenan con las PORTADAS DE LOS EVENTOS PUBLICADOS de verdad, así
   que la sección se actualiza sola y lo que enseña es comprobable.

   Cuando todavía no hay bastantes eventos, los huecos NO se dejan en blanco:
   se rellenan con figuras en tonos grises que siguen construyendo el patrón.
   Una tira medio vacía se lee como un error; una tira con piezas apagadas se
   lee como un diseño esperando contenido. Cada hueco se llenará con una
   imagen a medida que se publiquen eventos. */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventosApi } from '../../../api/eventos.js';
import { useI18n } from '../../../context/I18nContext.jsx';

/* El eslabón del logo, normalizado a una caja de 100×100. Las puntas van
   arriba y abajo, y los lados son rectos: es la lazada del nudo estirada. */
const ESLABON = 'polygon(50% 0%, 100% 21%, 100% 79%, 50% 100%, 0% 79%, 0% 21%)';

/* Cada pieza tiene su tamaño, su giro y su desnivel. La irregularidad es lo
   que hace que se lea como una cadena de eslabones sueltos y no como una
   fila de rectángulos con las esquinas cortadas. */
const PIEZAS = [
  { w: 148, h: 214, giro: -9,  arriba: 0   },
  { w: 124, h: 182, giro: 7,   arriba: 62  },
  { w: 162, h: 232, giro: -13, arriba: 18  },
  { w: 132, h: 190, giro: 10,  arriba: 78  },
  { w: 142, h: 206, giro: -6,  arriba: 6   },
  { w: 118, h: 172, giro: 12,  arriba: 88  },
  { w: 156, h: 224, giro: -11, arriba: 30  },
  { w: 128, h: 186, giro: 5,   arriba: 70  },
];

const STYLE_ID = 'gestek-tira-eventos';
const CSS = `
@keyframes tira-izquierda { from { transform: translateX(0) } to { transform: translateX(-50%) } }
.tira-eventos { animation: tira-izquierda 46s linear infinite; }
.tira-eventos:hover { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .tira-eventos { animation: none } }
`;

export default function Mosaico() {
  const { t } = useI18n();
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
      .catch(() => { /* sin eventos, la tira se queda en piezas apagadas */ });
  }, []);

  /* La tira se pinta DOS veces seguidas y se desplaza justo la mitad: al
     terminar, la copia queda exactamente donde empezó la primera y el bucle
     no da tirón. */
  /* Cada evento ocupa UNA pieza. Si hay menos eventos que piezas, el resto se
     quedan grises: repetir el mismo evento cuatro veces se nota y se lee como
     relleno, mientras que una pieza apagada se lee como sitio reservado. */
  const fila = PIEZAS.map((p, i) => ({ ...p, ev: eventos[i] || null, i }));

  return (
    <section className="py-20 sm:py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary mb-4">
          {t('Hecho con GESTEK')}
        </p>
        <h2 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 leading-tight max-w-2xl">
          {t('Esto no es una maqueta')}
        </h2>
        <p className="mt-5 text-base sm:text-lg text-text-2 max-w-2xl leading-relaxed">
          {eventos.length > 0
            ? t('Son eventos publicados ahora mismo, con su boletería, su equipo y su página. Pulsa cualquiera para verlo por dentro.')
            : t('Aquí van a ir los eventos que se publiquen con GESTEK. Cada pieza se llena con el suyo en cuanto exista.')}
        </p>
      </div>

      {/* La tira. Los degradados de los extremos la hacen aparecer y
          desaparecer en vez de cortarse a cuchillo contra el borde. */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-24 sm:w-40 z-10 pointer-events-none
                        bg-gradient-to-r from-bg to-transparent" />
        <div className="absolute inset-y-0 right-0 w-24 sm:w-40 z-10 pointer-events-none
                        bg-gradient-to-l from-bg to-transparent" />

        <div className="tira-eventos flex items-start gap-6 sm:gap-9 w-max" style={{ height: 330 }}>
          {[...fila, ...fila].map((p, idx) => (
            <Pieza key={idx} pieza={p} duplicada={idx >= fila.length} />
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 mt-12">
        <Link
          to="/explorar"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border-2
                     text-sm font-medium text-text-1 hover:bg-surface-2 hover:border-primary/40 transition-all"
        >
          {t('Ver todos los eventos')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

function Pieza({ pieza, duplicada }) {
  const { w, h, giro, arriba, ev } = pieza;
  const imagen = ev?.cover_url || ev?.gallery?.[0];

  const cuerpo = (
    <div className="w-full h-full relative" style={{ clipPath: ESLABON, WebkitClipPath: ESLABON }}>
      {imagen ? (
        <>
          <img
            src={imagen} alt={ev.titulo} loading="lazy" decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Un velo cálido para que fotos de orígenes distintos se lean como
              una sola pieza de la página. */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#12100B]/80 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
        </>
      ) : (
        /* Hueco a la espera: gris cálido con un filo de latón. Sigue siendo
           patrón, no un agujero. */
        <div className="w-full h-full bg-gradient-to-br from-surface-3 via-surface-2 to-surface
                        flex items-center justify-center">
          <span className="block w-8 h-8 rounded-full border border-primary/25" />
        </div>
      )}
    </div>
  );

  return (
    <div
      className="group relative flex-shrink-0"
      style={{ width: w, height: h, marginTop: arriba, transform: `rotate(${giro}deg)` }}
      aria-hidden={duplicada || undefined}
    >
      {ev && !duplicada ? (
        <Link to={`/explorar/${ev.slug}`} className="block w-full h-full" title={ev.titulo}>{cuerpo}</Link>
      ) : cuerpo}

      {/* El nombre se endereza: la pieza va girada, pero leer en diagonal
          es incómodo. */}
      {ev && (
        <span
          className="absolute bottom-6 left-1/2 w-[76%] text-center text-[11px] font-semibold
                     text-white/90 leading-tight pointer-events-none"
          style={{ transform: `translateX(-50%) rotate(${-giro}deg)` }}
        >
          {ev.titulo}
        </span>
      )}
    </div>
  );
}
