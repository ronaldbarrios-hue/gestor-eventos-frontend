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

  /* Se calculan TODOS los estados antes de pintar, porque el tramo que sale
     de un eslabón tiene que terminar exactamente en el siguiente: hace falta
     saber dónde estará el de abajo antes de dibujar el de arriba. Esto es lo
     que faltaba: el hilo salía recto hacia abajo y el eslabón siguiente ya se
     había ido a otra X, así que la cadena no llegaba a tocarse. */
  const estados = pasos.map((paso, i) => {
    const angulo = i * DESFASE + avance * VUELTAS * Math.PI * 2;
    const sen = Math.sin(angulo);
    const cos = Math.cos(angulo);
    const alFrente = (cos + 1) / 2;                       // 0 … 1
    return {
      paso,
      alFrente,
      x: quieta ? 0 : sen * RADIO,
      escala: quieta ? 1 : 0.72 + alFrente * 0.38,
      opacidad: quieta ? 1 : 0.42 + alFrente * 0.58,
      desenfoque: quieta ? 0 : (1 - alFrente) * 1.6,
      aplastado: quieta ? 1 : Math.abs(cos),
      inclinacion: quieta ? 0 : sen * 14,
    };
  });

  return (
    <div ref={raiz} className="relative">
      {estados.map((e, i) => (
        <div key={e.paso.n} className="flex gap-5 lg:gap-8 items-stretch"
             style={{ marginBottom: SEPARACION_FILAS }}>
          {/* ── El carril: el eslabón y el tramo que lo une con el de abajo ── */}
          <Carril
            estado={e}
            siguiente={estados[i + 1] || null}
            numero={e.paso.n}
          />

          {/* ── La información, que no gira ──

              El texto NO gira ni se encoge, pero sí aparece: se enciende
              cuando su lazada se pone de frente y se apaga cuando se va
              detrás. Así el scroll no mueve adornos, va destapando pasos.

              No baja del 45% de opacidad a propósito. Que el texto llegue a
              ser ilegible sería un efecto bonito un segundo y un problema el
              resto del rato: aquí hay contenido que la gente entra a leer. */}
          <div
            className="flex-1 min-w-0"
            style={quieta ? undefined : {
              opacity: 0.45 + e.alFrente * 0.55,
              transform: `translateY(${(1 - e.alFrente) * 10}px)`,
              willChange: 'opacity, transform',
            }}
          >
            {children(e.paso, i)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* El carril de un paso.

   Mide su propio alto —que lo decide la tarjeta de al lado, no él— y con ese
   número dibuja una curva desde el centro de SU eslabón hasta el centro del
   SIGUIENTE. Sin medir no hay manera: la altura de cada tarjeta depende del
   texto, y una constante a ojo deja el hilo colgando en el aire, que es
   justo lo que pasaba. */
const ANCHO_CARRIL = 190;
const CENTRO_ESLABON = 66;   // a qué altura de la fila va el eslabón

/* El hueco entre filas. Va como constante y no como clase de Tailwind porque
   el tramo de cadena TIENE que sumarlo para llegar al eslabón de abajo: el
   margen no entra en offsetHeight, y con `mb-4` a un lado y el cálculo al
   otro, el hilo se quedaba 17px corto en los seis tramos. Un solo número
   manda sobre los dos. */
const SEPARACION_FILAS = 16;

function Carril({ estado, siguiente, numero }) {
  const caja = useRef(null);
  const [alto, setAlto] = useState(0);

  useEffect(() => {
    const el = caja.current;
    if (!el) return undefined;
    const medir = () => setAlto(el.offsetHeight);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cx = ANCHO_CARRIL / 2;
  const x1 = cx + estado.x;
  const x2 = siguiente ? cx + siguiente.x : x1;
  /* El siguiente eslabón está una fila más abajo: el alto de esta fila, más
     el hueco entre filas, más su propia altura dentro de la suya. */
  const y1 = CENTRO_ESLABON;
  const y2 = alto + SEPARACION_FILAS + CENTRO_ESLABON;

  return (
    <div ref={caja} className="relative hidden lg:block w-[190px] flex-shrink-0" aria-hidden="true">
      {siguiente && alto > 0 && (
        <svg
          className="absolute left-0 top-0 overflow-visible pointer-events-none"
          width={ANCHO_CARRIL} height={alto}
        >
          {/* Curva en S: sale del eslabón hacia abajo y entra en el siguiente
              también por arriba. Una recta diagonal se leería como un palo
              cruzado; la curva se lee como cuerda que cuelga y acompaña el
              giro de la hélice. */}
          <path
            d={`M ${x1} ${y1} C ${x1} ${y1 + (y2 - y1) * 0.45}, ${x2} ${y2 - (y2 - y1) * 0.45}, ${x2} ${y2}`}
            fill="none"
            stroke="rgb(var(--color-primary))"
            strokeWidth="3"
            strokeLinecap="round"
            /* La opacidad del tramo sigue a la MENOR de las dos puntas: si
               uno de los dos eslabones está detrás, el tramo también. */
            opacity={Math.min(estado.opacidad, siguiente.opacidad) * 0.75}
          />
        </svg>
      )}

      {/* El eslabón va encima del tramo, y como tiene el hueco calado, el
          hilo se ve pasar por dentro. Eso es lo que lo convierte en cadena
          y no en figuras sueltas con una raya al lado. */}
      <span
        className="absolute left-1/2 z-10 block"
        style={{
          top: CENTRO_ESLABON,
          transform: `translate(calc(-50% + ${estado.x}px), -50%) scale(${estado.escala})`,
          opacity: estado.opacidad,
          filter: estado.desenfoque > 0.05 ? `blur(${estado.desenfoque.toFixed(2)}px)` : 'none',
          willChange: 'transform, opacity',
        }}
      >
        <Eslabon n={numero} aplastado={estado.aplastado} inclinacion={estado.inclinacion} />
      </span>
    </div>
  );
}

/* El eslabon, con la forma del logo.

   El nudo de GESTEK son dos lazadas OVALADAS entrelazadas. Antes esto era un
   hexagono de seis lados, y no habia coherencia posible: la marca es curva y
   el eslabon era un diamante. Ahora es la lazada: un anillo alargado, de
   esquinas redondas, como las del propio nudo.

   El giro es 3D de verdad, no un dibujo plano que se desliza: el anillo se
   ESTRECHA con el coseno del angulo, de ancho de frente a casi una linea de
   canto, que es lo que hace un cuerpo rotando sobre su eje vertical. Como se
   dibuja con un trazo grueso y no con dos contornos, el ojo se cierra solo al
   estrecharse, igual que un eslabon de verdad visto de lado.

   La caja es FIJA aunque el anillo se estreche, para que el centro de la
   pieza no se mueva: de ahi sale y ahi llega el tramo de cadena.

   `aplastado` va de 0 (de canto) a 1 (de frente). */
const RADIO_Y   = 40;   // media altura del anillo
const RADIO_X   = 26;   // media anchura, de frente
const RADIO_MIN = 3.5;  // media anchura, de canto
const GROSOR    = 8;

function Eslabon({ n, aplastado, inclinacion = 0 }) {
  const rx = RADIO_MIN + aplastado * (RADIO_X - RADIO_MIN);
  const w = (RADIO_X + GROSOR) * 2;
  const h = (RADIO_Y + GROSOR) * 2;

  return (
    <svg
      width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible drop-shadow-[0_3px_6px_rgba(43,35,18,0.45)]"
      style={{ transform: `rotate(${inclinacion}deg)` }}
    >
      <defs>
        {/* El laton no es plano: de un lado le da la luz y del otro no. Eso es
            lo que termina de vender el volumen. */}
        <linearGradient id={`laton-${n}`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%"   stopColor="#8A6E19" />
          <stop offset="42%"  stopColor="#F2D66B" />
          <stop offset="100%" stopColor="#A5811A" />
        </linearGradient>
      </defs>

      {/* La lazada. Un trazo grueso sobre una elipse: al encoger el radio
          horizontal, el ojo se cierra solo y la pieza se ve de perfil sin
          tener que dibujar dos contornos y restarlos. */}
      <ellipse
        cx={w / 2} cy={h / 2} rx={rx} ry={RADIO_Y}
        fill="none"
        stroke={`url(#laton-${n})`}
        strokeWidth={GROSOR}
        strokeLinejoin="round"
      />

      {/* El numero solo cuando la lazada esta lo bastante de frente para que
          quepa dentro del ojo. */}
      {aplastado > 0.62 && (
        <text
          x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="central"
          className="fill-text-1 font-bold"
          style={{ fontSize: 16, transform: `rotate(${-inclinacion}deg)`, transformOrigin: `${w / 2}px ${h / 2}px` }}
        >
          {n}
        </text>
      )}
    </svg>
  );
}
