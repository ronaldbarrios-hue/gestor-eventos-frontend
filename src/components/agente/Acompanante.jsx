/* El acompañante — el bot trabajando en su escritorio, abajo a la izquierda.

   Qué cambió y por qué:
   - Antes el cordón colgaba del BOMBILLO. En una lámpara real el interruptor
     de cadena está en el cuello, no en el vidrio. Ahora sale de una cajita de
     interruptor en la junta del brazo, y el bombillo queda ~16px a la
     izquierda: no se tocan ni se cruzan, que era lo que confundía.
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

const ANCHO = 250;
const ALTO  = 190;
const BOT   = 112;
const BOT_X = 18;
const BOT_Y = 42;
const MANO_X = Math.round(BOT_X + (114 / 140) * BOT);   // 109
const MANO_Y = Math.round(BOT_Y + (32 / 140) * BOT);    // 68

const MESA_Y = 158;   // superficie del escritorio
const CUELLO = 20;    // altura de la junta brazo–pantalla

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
  const [oculto, setOculto]   = useState(false);
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
    : recargando ? 'recargando'
    : encima ? 'atento'
    : dormido ? 'durmiendo'
    : 'thinking';

  if (oculto) {
    return (
      <button
        onClick={() => setOculto(false)}
        aria-label={t('Mostrar el acompañante')}
        className={`hidden lg:flex fixed bottom-5 ${lado === 'derecha' ? 'right-5' : 'left-5'} z-40 h-10 w-10 rounded-full border border-primary/40
                   bg-surface/90 backdrop-blur shadow-card items-center justify-center
                   hover:border-primary transition-colors`}
      >
        <span className="block h-2 w-2 rounded-full bg-primary" />
      </button>
    );
  }

  return (
    <div
      className={`ac-raiz ${tirando ? 'ac-tirando' : ''} hidden lg:block fixed z-40 select-none pointer-events-none`}
      style={{ [lado === 'derecha' ? 'right' : 'left']: 12, bottom: 10, width: ANCHO, height: ALTO }}
    >
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
          d={`M78 38 L106 50 L146 ${MESA_Y} L34 ${MESA_Y} Z`}
          fill="url(#ac-luz)"
          opacity={encendida ? 1 : 0}
        />

        {/* ── La lámpara ─────────────────────────────────────────────
             Orden de dibujo: primero brazo y poste, luego la pantalla,
             y el interruptor de último para que quede por encima. */}
        <g className="ac-lampara">
          {/* base sobre la mesa */}
          <ellipse cx="210" cy={MESA_Y - 1} rx="18" ry="4.8" fill="#2A303B" />
          <ellipse cx="210" cy={MESA_Y - 3} rx="18" ry="4.8" fill="url(#ac-pantallaLampara)" opacity="0.85" />

          {/* poste y brazo articulado, en arco hasta el cuello */}
          <path d={`M210 ${MESA_Y - 5} L210 86`} stroke="#4A5260" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="210" cy="86" r="4.5" fill={LATON} />
          <path d={`M210 86 Q206 34 ${MANO_X + 8} ${CUELLO + 4}`}
                stroke="#4A5260" strokeWidth="4.5" fill="none" strokeLinecap="round" />

          {/* pantalla cónica, apuntando abajo-izquierda sobre el bot */}
          <path d={`M${MANO_X + 6} ${CUELLO - 2} L78 38 L106 50 Z`} fill="url(#ac-pantallaLampara)" />
          <path d="M78 38 L106 50" stroke="#8A6E19" strokeWidth="2.6" strokeLinecap="round" />

          {/* bombillo asomando por la boca — a 16px del cordón, sin cruzarse */}
          <circle
            cx="90" cy="43" r="5.5"
            fill={encendida ? 'url(#ac-bombillo)' : '#3A3526'}
            style={{ transition: 'fill .45s ease' }}
          />
          {encendida && (
            <circle cx="90" cy="43" r="11" fill="#FFE9A8" opacity="0.3">
              <animate attributeName="opacity" values="0.22;0.4;0.22" dur="3.2s" repeatCount="indefinite" />
            </circle>
          )}

          {/* junta del brazo y CAJA DEL INTERRUPTOR: de aquí sale el cordón */}
          <circle cx={MANO_X + 8} cy={CUELLO + 4} r="4.5" fill={LATON} />
          <rect x={MANO_X - 4.5} y={CUELLO + 2} width="9" height="13" rx="2.5"
                fill="#3A414E" stroke={LATON} strokeWidth="1" strokeOpacity="0.7" />
          <line x1={MANO_X - 2} y1={CUELLO + 6} x2={MANO_X + 2} y2={CUELLO + 6}
                stroke={LATON_CLARO} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        </g>

        {/* ── El cordón, desde la caja del interruptor ── */}
        <g className="ac-cordon">
          <line x1={MANO_X} y1={CUELLO + 15} x2={MANO_X} y2={MANO_Y - 4}
                stroke="#6B6355" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx={MANO_X} cy={MANO_Y} r="4" fill={LATON} />
        </g>

        {/* zona de clic del cordón — invisible y generosa */}
        <rect
          className="pointer-events-auto cursor-pointer"
          x={MANO_X - 15} y={CUELLO + 2} width="30" height={MANO_Y - CUELLO + 4}
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

      {/* Salida discreta, por si estorba */}
      <button
        onClick={() => setOculto(true)}
        aria-label={t('Ocultar acompañante')}
        className="pointer-events-auto absolute bottom-0 left-0 text-[10px] text-text-3 hover:text-text-2
                   transition-colors px-1"
      >
        {t('Ocultar')}
      </button>
    </div>
  );
}
