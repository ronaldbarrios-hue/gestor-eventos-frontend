/* El acompañante — el bot trabajando en su escritorio, abajo a la izquierda.

   Qué cambió y por qué:
   - EL CORDÓN, tercer intento. Primero colgaba del bombillo. Luego se movió a
     una cajita en la junta del brazo, que sonaba bien pero seguía viéndose
     mal, y el motivo no era estético: la caja y el arranque del cordón caían
     DENTRO del cono de la pantalla, y como se pintan después de ella,
     aparecían encima, pegados al bombillo. Parecía un hilo saliendo del
     vidrio porque, dibujado, eso es lo que era.
     Ahora hay una regla y está en las constantes: la pantalla acaba en
     APEX_X, y el interruptor y el cordón empiezan a la derecha de ahí. Nunca
     se pueden solapar, aunque alguien mueva las alturas. Medido: 16,5px
     libres entre el halo del bombillo y el borde de la caja.
   - Antes era una lámpara flotando sobre un bot en el aire. Ahora hay
     escritorio, portátil encendido y una lámpara de trabajo: el bot está
     trabajando, y por eso tiene una luz que apagar.
   - El idioma salió de aquí. Estaba también en la navbar — dos controles
     para lo mismo. Vive en el botón de configuración, abajo a la derecha.
   - La escena se fue a la izquierda para no chocar con ese botón.

   Geometría: el SVG cubre el mismo recuadro que el contenedor con viewBox
   1:1, así que sus unidades SON píxeles del contenedor. Eso deja clavar la
   punta del cordón donde queda la mano levantada del bot: con size=112 la
   mano vive en (114/140·112, 32/140·112) = (91.2, 25.6) desde su esquina,
   y el bot arranca en (18, 42) → mano en (109, 68). */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Criatura from './Criatura.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { alCambiarCarga } from '../../lib/cargaGlobal.js';

/* Se encogió ~30%: a 250x190 el escritorio se comía la esquina de la barra
   lateral y empujaba los atajos hacia arriba. El personaje sigue
   reconociéndose a este tamaño; el mueble era lo que sobraba. */
const ANCHO = 176;
const ALTO  = 134;
const BOT   = 79;
const BOT_X = 13;
const BOT_Y = 30;
const MANO_X = Math.round(BOT_X + (114 / 140) * BOT);   // 109
const MANO_Y = Math.round(BOT_Y + (32 / 140) * BOT);    // 68

const MESA_Y = 158;   // superficie del escritorio

/* ── Geometría de la lámpara ────────────────────────────────────────────
   Va toda en constantes porque las tres veces que esto se rompió fue por lo
   mismo: se movía una pieza a ojo y se olvidaba otra, y acababan solapadas.

   La regla que manda: la PANTALLA queda enteramente a la izquierda de
   APEX_X, y el interruptor y el cordón enteramente a la derecha. Mientras se
   respete eso, el cordón no puede cruzar el bombillo aunque se muevan las
   alturas. Antes no había regla: la caja del interruptor y el arranque del
   cordón caían DENTRO del cono, y como se pintan después de la pantalla,
   aparecían encima de ella pegados al bombillo. Eso es lo que se veía.

   El cordón cae a plomo sobre MANO_X, que es donde el bot tiene la mano
   levantada: la punta le queda justo en la mano y por eso el gesto de tirar
   se lee. */
const APEX_X   = 100;             // punta de la pantalla; también el fin del brazo
const APEX_Y   = 20;
const BOCA_IZQ = [63, 40];        // boca de la pantalla
const BOCA_DER = [91, 52];
const BOMBILLO = [77, 45];        // asomando por la boca
const SW_X     = MANO_X;          // interruptor: sobre el brazo, a plomo de la mano
const SW_Y     = 21;
const SW_ALTO  = 13;

const LATON       = '#C9A227';
const LATON_CLARO = '#F2D66B';

const STYLE_ID = 'gestek-acompanante-v3';
const CSS = `
@keyframes ac-entrar {from{opacity:0;transform:translateY(20px) scale(.94)}to{opacity:1;transform:none}}
@keyframes ac-cordon {0%,100%{transform:translateY(0)}22%{transform:translateY(8px)}42%{transform:translateY(-2px)}64%{transform:translateY(5px)}84%{transform:translateY(1px)}}
@keyframes ac-lampara{0%,100%{transform:rotate(0)}24%{transform:rotate(1.6deg)}58%{transform:rotate(-1.1deg)}}
.ac-raiz{animation:ac-entrar .6s cubic-bezier(.16,1,.3,1) both}
.ac-tirando .ac-cordon{animation:ac-cordon 1.15s cubic-bezier(.36,.07,.19,.97)}
.ac-tirando .ac-lampara{animation:ac-lampara 1.7s cubic-bezier(.36,.07,.19,.97)}
.ac-lampara{transform-box:view-box;transform-origin:210px ${MESA_Y}px}
.ac-cono{transition:opacity .55s ease}
@media (prefers-reduced-motion:reduce){.ac-raiz,.ac-raiz *{animation:none!important}}
`;

function useCss() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

export default function Acompanante({ lado = 'izquierda', alAbrir = null }) {
  useCss();
  const navegar = useNavigate();
  const { theme, toggle } = useTheme();
  const { t, recargando } = useI18n();
  const [tirando, setTirando] = useState(false);
  /* Mientras la aplicación está en su primera carga, el acompañante lo dice.
     Antes ese mensaje lo llevaba la pantalla de carga junto a un robot grande
     en el centro; ahora esa pantalla enseña el logo y el personaje —que ya
     estaba aquí— es quien acompaña la espera. */
  const [cargando, setCargando] = useState(false);
  useEffect(() => alCambiarCarga(setCargando), []);

  const [dormido, setDormido] = useState(false);
  const [encima, setEncima]   = useState(false);
  const temporizadores = useRef([]);
  const sueno = useRef(null);

  const encendida = theme === 'light';

  useEffect(() => () => temporizadores.current.forEach(clearTimeout), []);

  /* Se duerme tras un rato sin señales de vida y despierta con el primer
     movimiento. No es un adorno: da a entender que hay alguien ahí que
     responde, en vez de un dibujo tecleando en bucle para siempre — que a los
     dos minutos se lee como un GIF pegado en la esquina. */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const INACTIVIDAD = 50000;
    const rearmar = () => {
      setDormido(false);
      clearTimeout(sueno.current);
      sueno.current = setTimeout(() => setDormido(true), INACTIVIDAD);
    };
    rearmar();
    const eventos = ['pointermove', 'keydown', 'scroll', 'pointerdown'];
    eventos.forEach(e => window.addEventListener(e, rearmar, { passive: true }));
    return () => {
      clearTimeout(sueno.current);
      eventos.forEach(e => window.removeEventListener(e, rearmar));
    };
  }, []);

  function jalarCordon() {
    if (tirando) return;
    setTirando(true);
    // el tema cambia a mitad del tirón, cuando la cuerda llega abajo
    temporizadores.current.push(setTimeout(toggle, 320));
    temporizadores.current.push(setTimeout(() => setTirando(false), 1160));
  }

  /* Orden de prioridad, de lo más inmediato a lo más pasivo: lo que el
     usuario acaba de hacer con la mano manda sobre todo lo demás. */
  const mood = tirando ? 'cordon'
    : (recargando || cargando) ? 'recargando'
    : encima ? 'atento'
    : dormido ? 'durmiendo'
    : 'thinking';

  return (
    <div
      className={`ac-raiz ${tirando ? 'ac-tirando' : ''} hidden lg:block fixed z-40 select-none pointer-events-none`}
      /* Pegado al borde, sin margen: así la mesa hace de remate de la
         pantalla en vez de flotar sobre ella con un hueco debajo. */
      style={{ [lado === 'derecha' ? 'right' : 'left']: 0, bottom: 0, width: ANCHO, height: ALTO }}
    >
      {/* Lo que dice mientras se carga. Va por ENCIMA del alto del escritorio
          (`bottom: ALTO`) para no taparle la cara, y sin `pointer-events` como
          el resto: es un aviso, no un control.
          `whitespace-nowrap` no: el texto traducido al inglés es más largo y
          aquí el ancho es el del mueble, así que se deja envolver. */}
      {cargando && (
        <div className="absolute left-1 right-0 animate-[fadeUp_0.35s_ease_both]"
             style={{ bottom: ALTO - 12 }}>
          <p className="text-[10px] leading-tight text-text-3 bg-surface/85 backdrop-blur
                        border border-border/60 rounded-lg px-2 py-1.5">
            {t('Poniéndote en línea…')}
          </p>
        </div>
      )}

      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`} width={ANCHO} height={ALTO}
        className="absolute inset-0 overflow-visible"
        role="img"
        aria-label={t('El asistente de GESTEK en su escritorio')}
      >
        <defs>
          <linearGradient id="ac-pantallaLampara" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#E9D485" />
            <stop offset="45%"  stopColor={LATON} />
            <stop offset="100%" stopColor="#8A6E19" />
          </linearGradient>
          <radialGradient id="ac-bombillo" cx="50%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#FFF6D6" />
            <stop offset="60%"  stopColor="#FFE08A" />
            <stop offset="100%" stopColor="#E0B12B" />
          </radialGradient>
          <linearGradient id="ac-luz" x1="0.5" y1="0" x2="0.35" y2="1">
            <stop offset="0%"   stopColor="#FFE9A8" stopOpacity="0.45" />
            <stop offset="60%"  stopColor="#FFE9A8" stopOpacity="0.11" />
            <stop offset="100%" stopColor="#FFE9A8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ac-mesa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3A414E" />
            <stop offset="100%" stopColor="#232935" />
          </linearGradient>
        </defs>

        {/* ── El haz cae de la boca de la pantalla sobre el bot y la mesa ── */}
        <path
          className="ac-cono"
          d={`M${BOCA_IZQ[0]} ${BOCA_IZQ[1]} L${BOCA_DER[0]} ${BOCA_DER[1]} L131 ${MESA_Y} L19 ${MESA_Y} Z`}
          fill="url(#ac-luz)"
          opacity={encendida ? 1 : 0}
        />

        {/* ── La lámpara ─────────────────────────────────────────────
             Orden de dibujo: primero brazo y poste, luego la pantalla,
             y el interruptor de último para que quede por encima. */}
        <g className="ac-lampara">
          {/* Base: ancha y con peso. Un pie estrecho hace que una lámpara
              parezca un alambre clavado en la mesa. */}
          <ellipse cx="210" cy={MESA_Y - 1} rx="24" ry="6.2" fill="#2A303B" />
          <ellipse cx="210" cy={MESA_Y - 4} rx="24" ry="6.2" fill="url(#ac-pantallaLampara)" opacity="0.85" />
          <ellipse cx="210" cy={MESA_Y - 7} rx="13" ry="3.4" fill="#3A414E" />

          {/* Brazo ARTICULADO, y aquí está el cambio que importa.

              Antes era una sola curva suave del poste a la pantalla, y una
              curva suave no lee como una lámpara: lee como un cable. Lo que
              hace reconocible a una lámpara de escritorio es el codo — dos
              tramos rectos con una bisagra visible, la silueta de flexo de
              toda la vida.

              El codo va en el punto más alto para que la pantalla quede
              colgando por debajo, que es como cuelgan. Y el antebrazo sigue
              pasando por el interruptor (109, ~19), que va montado sobre él. */}
          <path d={`M210 ${MESA_Y - 7} L210 92`} stroke="#4A5260" strokeWidth="5.5" strokeLinecap="round" />
          <circle cx="210" cy="92" r="5.5" fill={LATON} />
          <circle cx="210" cy="92" r="2.2" fill="#2A303B" opacity="0.55" />

          {/* brazo alto: del hombro al codo */}
          <path d="M210 92 L165 14" stroke="#4A5260" strokeWidth="5" strokeLinecap="round" />
          {/* bisagra del codo */}
          <circle cx="165" cy="14" r="5" fill={LATON} />
          <circle cx="165" cy="14" r="2" fill="#2A303B" opacity="0.55" />
          {/* antebrazo: del codo a la punta de la pantalla */}
          <path d={`M165 14 L${APEX_X} ${APEX_Y}`}
                stroke="#4A5260" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* rótula donde engancha la pantalla */}
          <circle cx={APEX_X} cy={APEX_Y} r="4" fill={LATON} />

          {/* pantalla cónica. Cuelga del final del brazo y se abre hacia
              abajo-izquierda, sobre el bot. Su punto más a la derecha es el
              ápice: de ahí para allá no hay pantalla. */}
          <path d={`M${APEX_X} ${APEX_Y} L${BOCA_IZQ[0]} ${BOCA_IZQ[1]} L${BOCA_DER[0]} ${BOCA_DER[1]} Z`}
                fill="url(#ac-pantallaLampara)" />
          {/* El borde de la boca como elipse y no como línea: es lo que
              convierte un triángulo plano en un cono con volumen. Va ANTES del
              bombillo para que éste quede asomando por delante.

              Centro y giro salen de la propia boca (63,40)→(91,52), así que si
              se mueve la pantalla el aro la sigue. Su extremo derecho queda en
              x≈91: dentro de APEX_X, que es la regla de esta figura. */}
          <ellipse cx="77" cy="46" rx="15.2" ry="4.6"
                   transform="rotate(23.2 77 46)"
                   fill="#241F12" stroke="#8A6E19" strokeWidth="2.2" />

          {/* bombillo, asomando por la boca */}
          <circle
            cx={BOMBILLO[0]} cy={BOMBILLO[1]} r="5.5"
            fill={encendida ? 'url(#ac-bombillo)' : '#3A3526'}
            style={{ transition: 'fill .45s ease' }}
          />
          {encendida && (
            <circle cx={BOMBILLO[0]} cy={BOMBILLO[1]} r="11" fill="#FFE9A8" opacity="0.3">
              <animate attributeName="opacity" values="0.22;0.4;0.22" dur="3.2s" repeatCount="indefinite" />
            </circle>
          )}

          {/* La caja del interruptor, montada SOBRE EL BRAZO y a la derecha
              del ápice. Aquí es donde estaba el fallo: antes caía dentro del
              cono, y como se pinta después de la pantalla, aparecía encima
              de ella pegada al bombillo. */}
          <rect x={SW_X - 4.5} y={SW_Y} width="9" height={SW_ALTO} rx="2.5"
                fill="#3A414E" stroke={LATON} strokeWidth="1" strokeOpacity="0.7" />
          <line x1={SW_X - 2} y1={SW_Y + 4} x2={SW_X + 2} y2={SW_Y + 4}
                stroke={LATON_CLARO} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        </g>

        {/* ── El cordón: cae a plomo del interruptor hasta la mano ── */}
        <g className="ac-cordon">
          <line x1={SW_X} y1={SW_Y + SW_ALTO} x2={SW_X} y2={MANO_Y - 4}
                stroke="#6B6355" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx={SW_X} cy={MANO_Y} r="4" fill={LATON} />
        </g>

        {/* zona de clic del cordón — invisible y generosa */}
        <rect
          className="pointer-events-auto cursor-pointer"
          x={SW_X - 15} y={SW_Y} width="30" height={MANO_Y - SW_Y + 8}
          fill="transparent"
          onClick={jalarCordon}
        >
          <title>{encendida ? t('Cambiar a modo oscuro') : t('Cambiar a modo claro')}</title>
        </rect>

        {/* ── El escritorio, por encima de las patas del bot ── */}
        <rect x="0" y={MESA_Y} width={ANCHO} height="7" rx="2" fill="url(#ac-mesa)" />
        <rect x="0" y={MESA_Y + 7} width={ANCHO} height="3" fill="#12161C" opacity="0.5" />
      </svg>

      {/* ── El bot, tecleando en su portátil sobre la mesa ── */}
      {alAbrir === false ? (
        <div
          className="pointer-events-none absolute"
          style={{ left: BOT_X, top: BOT_Y, width: BOT, height: BOT * (150 / 140) }}
        >
          <Criatura mood={mood} size={BOT} seguirCursor />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => (alAbrir ? alAbrir() : navegar('/gestbot'))}
          onPointerEnter={() => setEncima(true)}
          onPointerLeave={() => setEncima(false)}
          onFocus={() => setEncima(true)}
          onBlur={() => setEncima(false)}
          aria-label={t('Abrir Gestbot')}
          title={t('Abrir Gestbot')}
          className="pointer-events-auto absolute cursor-pointer bg-transparent border-0 p-0"
          style={{ left: BOT_X, top: BOT_Y, width: BOT, height: BOT * (150 / 140) }}
        >
          <Criatura mood={mood} size={BOT} seguirCursor />
        </button>
      )}

    </div>
  );
}
