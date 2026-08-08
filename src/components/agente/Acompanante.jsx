/* El acompañante — vive fijo abajo a la derecha en todo el sitio público.

   Lo que hace:
   - Cuelga de una lámpara. Al jalar el cordón (clic en el cordón, en la
     lámpara o en el propio bot) se enciende o se apaga la luz, y eso ES el
     cambio de tema claro/oscuro. La animación va primero, el tema cambia a
     mitad del tirón: se siente causal, no simultáneo.
   - Cuando el usuario cambia de idioma, su cara —que es una pantalla— se
     reinicia con un barrido y una barra de progreso.

   Nota de coordenadas: la lámpara se dibuja en un SVG que cubre el mismo
   recuadro que el contenedor (150×212 px, viewBox 1:1), así que las
   coordenadas del SVG SON píxeles del contenedor. Eso permite hacer que la
   punta del cordón caiga exactamente donde queda la mano levantada del bot:
   con size=118 la mano vive en (114/140·118, 32/140·118) ≈ (96, 27) desde
   su esquina, y el bot arranca en (16, 86). */

import { useEffect, useRef, useState } from 'react';
import Criatura from './Criatura.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';

const ANCHO = 150;
const ALTO  = 212;
const BOT   = 118;          // tamaño del bot
const BOT_X = 16;           // desplazamiento del bot dentro del contenedor
const BOT_Y = 86;
const MANO_X = BOT_X + (114 / 140) * BOT;   // ≈ 112
const MANO_Y = BOT_Y + (32 / 140) * BOT;    // ≈ 113

const LATON       = '#C9A227';
const LATON_CLARO = '#F2D66B';

const STYLE_ID = 'gestek-acompanante';
const CSS = `
@keyframes ac-entrar {from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:none}}
@keyframes ac-cordon {0%,100%{transform:translateY(0)}22%{transform:translateY(7px)}40%{transform:translateY(-2px)}62%{transform:translateY(5px)}82%{transform:translateY(1px)}}
@keyframes ac-lampara{0%,100%{transform:rotate(0)}25%{transform:rotate(2.2deg)}60%{transform:rotate(-1.6deg)}}
@keyframes ac-globo  {from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}
.ac-raiz{animation:ac-entrar .6s cubic-bezier(.16,1,.3,1) both}
.ac-tirando .ac-cordon{animation:ac-cordon 1.15s cubic-bezier(.36,.07,.19,.97)}
.ac-tirando .ac-lampara{animation:ac-lampara 1.6s cubic-bezier(.36,.07,.19,.97)}
.ac-lampara{transform-box:view-box;transform-origin:${MANO_X}px 0px}
.ac-globo{animation:ac-globo .3s cubic-bezier(.16,1,.3,1) both}
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

export default function Acompanante() {
  useCss();
  const { theme, toggle } = useTheme();
  const { t, lang, setLang, recargando } = useI18n();
  const [tirando, setTirando]   = useState(false);
  const [abierto, setAbierto]   = useState(false);
  const [oculto,  setOculto]    = useState(false);
  const temporizadores = useRef([]);

  const encendida = theme === 'light';

  useEffect(() => () => temporizadores.current.forEach(clearTimeout), []);

  function jalarCordon() {
    if (tirando) return;
    setTirando(true);
    // el tema cambia a mitad del tirón, cuando la cuerda llega abajo
    temporizadores.current.push(setTimeout(toggle, 320));
    temporizadores.current.push(setTimeout(() => setTirando(false), 1160));
  }

  /* Prioridad de gesto: jalar el cordón manda sobre recargar el idioma,
     porque el tirón es lo que el usuario acaba de hacer con la mano. */
  const mood = tirando ? 'cordon' : recargando ? 'recargando' : abierto ? 'happy' : 'idle';

  if (oculto) {
    return (
      <button
        onClick={() => setOculto(false)}
        aria-label={t('Mostrar el acompañante')}
        className="fixed bottom-5 right-5 z-40 h-11 w-11 rounded-full border border-primary/40
                   bg-surface/90 backdrop-blur shadow-card flex items-center justify-center
                   hover:border-primary transition-colors"
      >
        <span className="block h-2.5 w-2.5 rounded-full bg-primary" />
      </button>
    );
  }

  return (
    <div
      className={`ac-raiz ${tirando ? 'ac-tirando' : ''} fixed z-40 select-none pointer-events-none`}
      style={{ right: 12, bottom: 12, width: ANCHO, height: ALTO }}
    >
      {/* ── Globo de ayuda ───────────────────────────────────────── */}
      {abierto && (
        <div className="ac-globo pointer-events-auto absolute bottom-[calc(100%-8px)] right-0 w-[248px]
                        rounded-2xl border border-border bg-surface/95 backdrop-blur-xl shadow-card-hover p-3.5">
          <p className="text-[13px] leading-snug text-text-2">
            {t('Jala el cordón para cambiar la luz')}
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-widest text-text-3 mr-auto">
              {t('Cambiar idioma')}
            </span>
            {[['es', 'ES'], ['en', 'EN']].map(([code, corto]) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold border transition-colors ${
                  lang === code
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-text-2 hover:text-text-1 hover:bg-surface-2'
                }`}
              >
                {corto}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setAbierto(false); setOculto(true); }}
            className="mt-3 text-[11px] text-text-3 hover:text-text-2 transition-colors"
          >
            {t('Ocultar acompañante')}
          </button>
        </div>
      )}

      {/* ── Lámpara + cordón ─────────────────────────────────────── */}
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`} width={ANCHO} height={ALTO}
        className="absolute inset-0 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ac-pantalla" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#E9D485" />
            <stop offset="45%"  stopColor={LATON} />
            <stop offset="100%" stopColor="#8A6E19" />
          </linearGradient>
          <radialGradient id="ac-bombillo" cx="50%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#FFF6D6" />
            <stop offset="60%"  stopColor="#FFE08A" />
            <stop offset="100%" stopColor="#E0B12B" />
          </radialGradient>
          <linearGradient id="ac-cono" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#FFE9A8" stopOpacity="0.55" />
            <stop offset="55%"  stopColor="#FFE9A8" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#FFE9A8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* El cono de luz: solo cuando la lámpara está encendida */}
        <path
          className="ac-cono"
          d={`M${MANO_X - 22} 74 L${MANO_X + 22} 74 L${MANO_X + 62} ${ALTO} L${MANO_X - 62} ${ALTO} Z`}
          fill="url(#ac-cono)"
          opacity={encendida ? 1 : 0}
        />

        <g className="ac-lampara">
          {/* cable de suspensión — sube más allá del recuadro, como si
              colgara del techo de la página */}
          <line x1={MANO_X} y1={-260} x2={MANO_X} y2={34} stroke="#6B6355" strokeWidth="2" strokeLinecap="round" />

          {/* pantalla cónica de latón */}
          <path d={`M${MANO_X} 32 L${MANO_X - 21} 68 L${MANO_X + 21} 68 Z`} fill="url(#ac-pantalla)" />
          <ellipse cx={MANO_X} cy="68" rx="21" ry="5.2" fill="#8A6E19" />
          <ellipse cx={MANO_X} cy="67" rx="21" ry="5.2" fill="none" stroke={LATON_CLARO} strokeWidth="1" strokeOpacity="0.5" />

          {/* bombillo */}
          <circle
            cx={MANO_X} cy="72" r="6.5"
            fill={encendida ? 'url(#ac-bombillo)' : '#3A3526'}
            style={{ transition: 'fill .45s ease' }}
          />
          {encendida && (
            <circle cx={MANO_X} cy="72" r="13" fill="#FFE9A8" opacity="0.35">
              <animate attributeName="opacity" values="0.28;0.45;0.28" dur="3.2s" repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* cordón que el bot agarra */}
        <g className="ac-cordon">
          <line x1={MANO_X} y1="74" x2={MANO_X} y2={MANO_Y - 4} stroke="#6B6355" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx={MANO_X} cy={MANO_Y} r="4" fill={LATON} />
        </g>

        {/* zona de clic del cordón — invisible y generosa */}
        <rect
          className="pointer-events-auto cursor-pointer"
          x={MANO_X - 16} y="30" width="32" height={MANO_Y - 20}
          fill="transparent"
          onClick={jalarCordon}
        >
          <title>{encendida ? t('Cambiar a modo oscuro') : t('Cambiar a modo claro')}</title>
        </rect>
      </svg>

      {/* ── El bot ───────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={t('Abrir el acompañante')}
        aria-expanded={abierto}
        className="pointer-events-auto absolute cursor-pointer bg-transparent border-0 p-0"
        style={{ left: BOT_X, top: BOT_Y, width: BOT, height: BOT * (150 / 140) }}
      >
        <Criatura mood={mood} size={BOT} />
      </button>
    </div>
  );
}
