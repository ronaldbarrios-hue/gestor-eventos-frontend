/* La cadena en escalera circular.

   Los siete pasos van montados en una hélice: cada eslabón ocupa un ángulo
   distinto de la misma vuelta, y el scroll hace avanzar ese ángulo. El
   eslabón NO sube ni baja por su cuenta —eso lo hace el scroll de la página—
   sino que se desplaza en X según el seno del ángulo y cambia de tamaño y de
   opacidad según el coseno. Ese contraste es lo que vende la profundidad: el
   que está "al frente" se ve grande y nítido, el que está "detrás" se ve
   pequeño y apagado, y entre uno y otro la cadena parece girar sobre su eje
   vertical mientras trepa.

   Decisiones que importan:

   · El giro se calcula desde la posición de la sección en la ventana, no
     desde un temporizador. Así el usuario lo controla: si para de rodar, la
     cadena se queda quieta. Una animación que sigue girando sola mientras
     nadie hace nada delata que es decoración.

   · Se lee del scroll de la página, no con un IntersectionObserver por
     eslabón: los siete tienen que actualizarse a la vez y con el mismo
     valor, o se desincronizan y la hélice se rompe.

   · El texto NUNCA gira ni se encoge. Lo que gira es la cadena; la
     información se lee derecha, a tamaño constante. Girar el texto sería
     bonito un segundo e ilegible el resto.

   · Con prefers-reduced-motion la hélice se apaga entera y queda la lista
     vertical de siempre, que sigue contando lo mismo. */

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../context/I18nContext.jsx';

const RADIO = 120;          // amplitud del vaivén horizontal, en píxeles
const VUELTAS = 1.15;       // cuántas vueltas da la cadena de arriba a abajo
const DESFASE = 0.62;       // separación angular entre eslabones (radianes)

export default function CadenaHelice({ pasos, children }) {
  const { t } = useI18n();
  const raiz = useRef(null);
  const [avance, setAvance] = useState(0);      // 0 → 1 según el scroll
  const [quieta, setQuieta] = useState(false);  // prefers-reduced-motion

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => setQuieta(mq.matches);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);

  useEffect(() => {
    if (quieta) return undefined;
    let ultimo = 0;

    const medir = () => {
      const el = raiz.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      /* 0 cuando el bloque acaba de entrar por abajo, 1 cuando ya salió por
         arriba. Se recorta para que fuera de pantalla no siga acumulando. */
      const total = r.height + window.innerHeight;
      const recorrido = (window.innerHeight - r.top) / total;
      setAvance(Math.min(1, Math.max(0, recorrido)));
    };

    /* Limitador por tiempo en vez de requestAnimationFrame: el efecto tiene
       que seguir al dedo incluso donde rAF va estrangulado, y aquí solo se
       LEE la geometría (React escribe en su propio ciclo), así que no hay
       trasiego de layout que justifique esperar al cuadro. */
    const alRodar = () => {
      const ahora = performance.now();
      if (ahora - ultimo < 16) return;           // ~60 veces por segundo, no más
      ultimo = ahora;
      medir();
    };

    medir();
    window.addEventListener('scroll', alRodar, { passive: true });
    window.addEventListener('resize', alRodar);
    return () => {
      window.removeEventListener('scroll', alRodar);
      window.removeEventListener('resize', alRodar);
    };
  }, [quieta]);

  return (
    <div ref={raiz} className="relative">
      {pasos.map((paso, i) => {
        /* El ángulo de este eslabón: su sitio fijo en la hélice más lo que
           ha avanzado el scroll. */
        const angulo = i * DESFASE + avance * VUELTAS * Math.PI * 2;
        const sen = Math.sin(angulo);
        const cos = Math.cos(angulo);

        /* cos = +1 → al frente; cos = -1 → detrás. */
        const alFrente = (cos + 1) / 2;                       // 0 … 1
        const x = quieta ? 0 : sen * RADIO;
        const escala = quieta ? 1 : 0.72 + alFrente * 0.38;
        const opacidad = quieta ? 1 : 0.42 + alFrente * 0.58;
        const desenfoque = quieta ? 0 : (1 - alFrente) * 1.6;

        return (
          <div key={paso.n} className="flex gap-5 lg:gap-8 items-start mb-4">
            {/* ── El eslabón, que sí gira ── */}
            <div
              className="relative hidden lg:flex justify-center w-[190px] flex-shrink-0 h-[132px] items-center"
              aria-hidden="true"
            >
              {/* El hilo que une con el siguiente. Se mueve con el eslabón
                  para que la cadena no se despegue de sus propias piezas. */}
              {i < pasos.length - 1 && (
                <span
                  className="absolute left-1/2 top-1/2 w-[3px] rounded-full bg-gradient-to-b from-primary/45 to-primary/15"
                  style={{
                    height: 132,
                    transform: `translate(calc(-50% + ${x}px), 0)`,
                    opacity: opacidad * 0.7,
                    transition: 'none',
                  }}
                />
              )}

              <span
                className="relative z-10 block"
                style={{
                  transform: `translateX(${x}px) scale(${escala})`,
                  opacity: opacidad,
                  filter: desenfoque > 0.05 ? `blur(${desenfoque.toFixed(2)}px)` : 'none',
                  willChange: 'transform, opacity',
                }}
              >
                <Eslabon n={paso.n} aplastado={quieta ? 1 : Math.abs(cos)} inclinacion={quieta ? 0 : sen * 14} />
              </span>
            </div>

            {/* ── La información, que no gira ── */}
            <div className="flex-1 min-w-0">
              {children(paso, i)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* El eslabón, con la forma del logo.

   El nudo de GESTEK son dos lazadas entrelazadas: hexágonos alargados con las
   puntas arriba y abajo, inclinados, que se enganchan. Aquí se usa esa misma
   lazada como eslabón, en vez de un aro genérico, para que la cadena hable el
   idioma de la marca.

   El giro es 3D de verdad, no un dibujo plano que se desliza: la pieza se
   ESTRECHA con el coseno del ángulo, de ancha de frente a casi una línea de
   canto, que es lo que hace un cuerpo rotando sobre su eje vertical. Además
   el borde interior se separa del exterior según lo de frente que esté, así
   que de perfil el hueco casi desaparece — como pasa con un eslabón real.

   `aplastado` va de 0 (de canto) a 1 (de frente). */
function Eslabon({ n, aplastado, inclinacion = 0 }) {
  const ANCHO_MAX = 62;
  const ALTO = 84;
  const ancho = 8 + aplastado * (ANCHO_MAX - 8);
  const grosor = 6.5;

  /* El hexágono de la lazada, en coordenadas del propio eslabón. Al reducir
     `ancho` las diagonales se cierran solas y la pieza se ve de perfil. */
  const w = ancho, h = ALTO;
  const externo = `${w / 2},0 ${w},${h * 0.21} ${w},${h * 0.79} ${w / 2},${h} 0,${h * 0.79} 0,${h * 0.21}`;
  /* El hueco interior: se encoge más rápido que el contorno, así que de canto
     se cierra antes, igual que el ojo de un eslabón visto de lado. */
  const g = grosor * (0.45 + aplastado * 0.55);
  const iw = Math.max(0, w - g * 2);
  const ih = h - g * 2;
  const interno = iw > 1
    ? `${g + iw / 2},${g} ${g + iw},${g + ih * 0.21} ${g + iw},${g + ih * 0.79} ${g + iw / 2},${g + ih} ${g},${g + ih * 0.79} ${g},${g + ih * 0.21}`
    : null;

  return (
    <svg
      width={Math.max(w, 10)} height={h} viewBox={`0 0 ${Math.max(w, 10)} ${h}`}
      className="overflow-visible drop-shadow-[0_3px_6px_rgba(43,35,18,0.4)]"
      style={{ transform: `rotate(${inclinacion}deg)` }}
    >
      <defs>
        {/* El latón no es plano: de un lado le da la luz y del otro no. Eso es
            lo que termina de vender el volumen. */}
        <linearGradient id={`laton-${n}`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%"   stopColor="#8A6E19" />
          <stop offset="42%"  stopColor="#F2D66B" />
          <stop offset="100%" stopColor="#A5811A" />
        </linearGradient>
      </defs>

      {/* La pieza es el contorno menos el hueco: una sola figura con regla
          evenodd, para que se vea como metal macizo y no como dos trazos. */}
      <path
        d={`M${externo.split(' ').join(' L').replace(/,/g, ' ')} Z${interno ? ` M${interno.split(' ').join(' L').replace(/,/g, ' ')} Z` : ''}`}
        fill={`url(#laton-${n})`}
        fillRule="evenodd"
      />

      {/* El número solo cuando la pieza está lo bastante de frente para que
          quepa dentro del hueco. */}
      {aplastado > 0.5 && (
        <text
          x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="central"
          className="fill-[#12100B] font-bold"
          style={{ fontSize: 15, transform: `rotate(${-inclinacion}deg)`, transformOrigin: `${w / 2}px ${h / 2}px` }}
        >
          {n}
        </text>
      )}
    </svg>
  );
}
