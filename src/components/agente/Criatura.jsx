/* Gestbot — el acompañante de GESTEK.
   Carcasa de noche con filo de latón: se lee igual sobre fondo claro que
   sobre fondo oscuro, y lleva el nudo de la marca en el pecho.

   Estados:
   - idle       : flota, parpadea y saluda con la mano derecha
   - thinking   : baja ambos brazos a un portátil y teclea
   - talking    : boca animada + leve bob
   - happy      : ojos felices, saludo rápido + rebote
   - error      : visor rojizo, ojos en X, se sacude
   - cordon     : estira el brazo hacia arriba y jala el cordón de la lámpara
   - recargando : la cara (que es una pantalla) se reinicia — barrido,
                  parpadeo y barra de progreso. Se usa al cambiar de idioma.
   - durmiendo  : ojos cerrados y respiración lenta. Entra solo tras un rato
                  sin actividad; despierta al primer movimiento.
   - atento     : levanta la mirada y se endereza. Es la reacción al pasar el
                  puntero por encima: da a entender que se le puede hablar. */

import { useEffect, useRef, useState } from 'react';
import { NUDO_PATH, NUDO_VIEWBOX, NUDO_TRANSFORM } from '../layout/GestekMark';

const STYLE_ID = 'gestbot-anim-v4';
const CSS = `
@keyframes gb-float  {0%,100%{transform:translateY(0)}50%{transform:translateY(-5%)}}
@keyframes gb-bob    {0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-2.4%) rotate(1deg)}}
@keyframes gb-bounce {0%,100%{transform:translateY(0) scale(1,1)}28%{transform:translateY(-9%) scale(.98,1.03)}58%{transform:translateY(0) scale(1.03,.97)}}
@keyframes gb-shake  {0%,100%{transform:translateX(0) rotate(0)}20%{transform:translateX(-4%) rotate(-2deg)}40%{transform:translateX(4%) rotate(2deg)}60%{transform:translateX(-3%) rotate(-1deg)}80%{transform:translateX(3%) rotate(1deg)}}
@keyframes gb-blink  {0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes gb-wave   {0%,100%{transform:rotate(8deg)}50%{transform:rotate(-24deg)}}
@keyframes gb-wavef  {0%,100%{transform:rotate(10deg)}50%{transform:rotate(-32deg)}}
@keyframes gb-sway   {0%,100%{transform:rotate(-4deg)}50%{transform:rotate(5deg)}}
@keyframes gb-typeA  {0%,100%{transform:translateY(0)}50%{transform:translateY(6%)}}
@keyframes gb-typeB  {0%,100%{transform:translateY(6%)}50%{transform:translateY(0)}}
@keyframes gb-scan   {0%{opacity:.25}50%{opacity:1}100%{opacity:.25}}
@keyframes gb-ping   {0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
@keyframes gb-aura   {0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.7;transform:scale(1.06)}}
/* jalar el cordón: el brazo tira hacia abajo y suelta */
@keyframes gb-tug    {0%,100%{transform:rotate(0)}22%{transform:rotate(-9deg)}40%{transform:rotate(4deg)}62%{transform:rotate(-6deg)}82%{transform:rotate(1deg)}}
@keyframes gb-tugc   {0%,100%{transform:translateY(0)}22%{transform:translateY(7%)}40%{transform:translateY(-2%)}62%{transform:translateY(5%)}}
/* la cara reiniciándose */
@keyframes gb-sweep  {0%{transform:translateY(-16px);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateY(50px);opacity:0}}
@keyframes gb-flick  {0%,100%{opacity:.12}10%{opacity:1}26%{opacity:.3}48%{opacity:1}62%{opacity:.18}84%{opacity:.9}}
@keyframes gb-glitch {0%,100%{transform:translateX(0)}23%{transform:translateX(-1.5px)}47%{transform:translateX(1.5px)}71%{transform:translateX(-.8px)}}
/* dormido: respira despacio y se hunde un poco */
@keyframes gb-dormir {0%,100%{transform:translateY(2%) scale(1,.985)}50%{transform:translateY(4%) scale(1.008,1)}}
/* atento: se endereza de golpe y se queda alerta */
@keyframes gb-atento {0%{transform:translateY(0)}40%{transform:translateY(-7%)}100%{transform:translateY(-4%)}}
/* la antena avisa que está despierto */
@keyframes gb-senal {0%,100%{opacity:.25;transform:scale(.85)}50%{opacity:1;transform:scale(1.25)}}
.gb-wrap{will-change:transform}
.gb-idle       .gb-body{animation:gb-float 3.6s ease-in-out infinite}
.gb-talking    .gb-body{animation:gb-bob 1s ease-in-out infinite}
.gb-happy      .gb-body{animation:gb-bounce .7s ease-in-out infinite}
.gb-error      .gb-body{animation:gb-shake .5s ease-in-out infinite}
.gb-thinking   .gb-body{animation:gb-bob 2.2s ease-in-out infinite}
.gb-cordon     .gb-body{animation:gb-tugc 1.15s cubic-bezier(.36,.07,.19,.97) infinite}
.gb-recargando .gb-body{animation:gb-float 3.6s ease-in-out infinite}
.gb-durmiendo  .gb-body{animation:gb-dormir 4.6s ease-in-out infinite}
.gb-atento     .gb-body{animation:gb-atento .45s cubic-bezier(.34,1.56,.64,1) both}
.gb-atento     .gb-armR{animation:gb-wavef .6s ease-in-out infinite}
.gb-senal{transform-box:fill-box;transform-origin:center;animation:gb-senal 1.1s ease-in-out infinite}
.gb-eyelid{transform-box:fill-box;transform-origin:center;animation:gb-blink 5s ease-in-out infinite}
.gb-armR{transform-box:view-box;transform-origin:96px 96px}
.gb-armL{transform-box:view-box;transform-origin:44px 98px}
.gb-idle       .gb-armR{animation:gb-wave 2.4s ease-in-out infinite}
.gb-talking    .gb-armR{animation:gb-wave 3s ease-in-out infinite}
.gb-happy      .gb-armR{animation:gb-wavef .5s ease-in-out infinite}
.gb-recargando .gb-armR{animation:gb-wave 3.4s ease-in-out infinite}
.gb-cordon     .gb-armR{animation:gb-tug 1.15s cubic-bezier(.36,.07,.19,.97) infinite}
.gb-idle       .gb-armL{animation:gb-sway 4s ease-in-out infinite}
.gb-talking    .gb-armL{animation:gb-sway 5s ease-in-out infinite}
.gb-recargando .gb-armL{animation:gb-sway 4.6s ease-in-out infinite}
.gb-handA{transform-box:fill-box;transform-origin:center;animation:gb-typeA .42s ease-in-out infinite}
.gb-handB{transform-box:fill-box;transform-origin:center;animation:gb-typeB .42s ease-in-out infinite}
.gb-scanl{animation:gb-scan 1.1s ease-in-out infinite}
.gb-scanl2{animation-delay:.22s}
.gb-scanl3{animation-delay:.44s}
.gb-ping{transform-box:fill-box;transform-origin:center;animation:gb-ping 1.7s ease-in-out infinite}
.gb-aura{animation:gb-aura 3.2s ease-in-out infinite}
.gb-sweep{animation:gb-sweep 1.05s linear infinite}
.gb-flick{animation:gb-flick 1.05s steps(1,end) infinite}
.gb-glitch{animation:gb-glitch .28s steps(1,end) infinite}
@media (prefers-reduced-motion:reduce){.gb-wrap *{animation:none!important}}
`;

function useInjectCss() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

/* El halo. Latón para casi todo; solo cambia cuando el estado tiene
   significado propio (verde = salió bien, rojo = algo falló). */
const AURA = {
  idle: '#C9A227', thinking: '#E0B12B', talking: '#E0B12B',
  happy: '#39D38C', error: '#D9705E', cordon: '#F2D66B',
  recargando: '#E0B12B', durmiendo: '#6B5F3A', atento: '#F2D66B',
};

const LATON      = '#C9A227';
const LATON_CLARO = '#F2D66B';

export default function Criatura({ mood = 'idle', size = 96, seguirCursor = false, conPortatil = true }) {
  useInjectCss();
  /* La mirada persigue el puntero un par de píxeles. Es lo que separa un
     dibujo de algo que parece estar mirándote. */
  const raiz = useRef(null);
  const [mirada, setMirada] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!seguirCursor) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const mover = (e) => {
      const el = raiz.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * 0.38);
      const d = Math.hypot(dx, dy) || 1;
      const alcance = 2.6;                       // en unidades del viewBox
      setMirada({ x: (dx / d) * alcance, y: (dy / d) * alcance * 0.7 });
    };
    window.addEventListener('pointermove', mover, { passive: true });
    return () => window.removeEventListener('pointermove', mover);
  }, [seguirCursor]);
  const m = AURA[mood] ? mood : 'idle';
  const aura = AURA[m];
  const working  = m === 'thinking';
  const dormido  = m === 'durmiendo';
  const jalando  = m === 'cordon';
  const cargando = m === 'recargando';
  const eye = m === 'error' ? '#F0A99A' : LATON_CLARO;
  const eyeY = working ? 56 : 53;

  return (
    <div ref={raiz} className={`gb-wrap gb-${m}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 150" width={size} height={size * (150 / 140)} aria-hidden="true">
        <defs>
          {/* Carcasa: grafito cálido, no gris azulado */}
          <linearGradient id="gb-shell" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%"   stopColor="#3A414E" />
            <stop offset="55%"  stopColor="#232935" />
            <stop offset="100%" stopColor="#12161C" />
          </linearGradient>
          {/* Piezas de latón (orejas, acento del pecho) */}
          <linearGradient id="gb-accent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={LATON_CLARO} />
            <stop offset="100%" stopColor="#A5811A" />
          </linearGradient>
          {/* El visor es una pantalla apagada con un rescoldo ámbar */}
          <radialGradient id="gb-visor" cx="50%" cy="38%" r="78%">
            <stop offset="0%"   stopColor={m === 'error' ? '#4A1A14' : '#3A2E12'} />
            <stop offset="65%"  stopColor={m === 'error' ? '#26100C' : '#161307'} />
            <stop offset="100%" stopColor="#080A0D" />
          </radialGradient>
          <linearGradient id="gb-barrido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={LATON_CLARO} stopOpacity="0" />
            <stop offset="50%"  stopColor={LATON_CLARO} stopOpacity="0.75" />
            <stop offset="100%" stopColor={LATON_CLARO} stopOpacity="0" />
          </linearGradient>
          <clipPath id="gb-visorClip">
            <rect x="40" y="36" width="60" height="46" rx="20" />
          </clipPath>
        </defs>

        {/* aura + sombra */}
        <ellipse className="gb-aura" cx="70" cy="68" rx="52" ry="52" fill={aura} opacity="0.4" />
        <ellipse cx="70" cy="142" rx="30" ry="6.5" fill="#000" opacity="0.25" />

        <g className="gb-body">
          {/* antena */}
          <path d="M70 24 Q72 16 69 11" stroke="#5A6270" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle className={dormido ? 'gb-senal' : 'gb-ping'} cx="68" cy="9" r={dormido ? 3.5 : 5} fill={aura} />

          {/* ── Brazo izquierdo (pivote hombro 44,98) ── */}
          {working ? (
            <g>
              <path d="M48 100 Q40 112 56 120" stroke="url(#gb-shell)" strokeWidth="13"
                    fill="none" strokeLinecap="round" />
              <circle className="gb-handA" cx="58" cy="121" r="9"
                      fill="url(#gb-shell)" stroke={LATON} strokeWidth="1.2" strokeOpacity="0.5" />
            </g>
          ) : (
            <g className="gb-armL">
              <path d="M46 99 Q36 112 39 124" stroke="url(#gb-shell)" strokeWidth="13"
                    fill="none" strokeLinecap="round" />
              <circle cx="40" cy="126" r="8.5" fill="url(#gb-shell)" stroke={LATON} strokeWidth="1.2" strokeOpacity="0.5" />
            </g>
          )}

          {/* ── Brazo derecho (pivote hombro 96,96) ── */}
          {working ? (
            <g>
              <path d="M92 100 Q100 112 84 120" stroke="url(#gb-shell)" strokeWidth="13"
                    fill="none" strokeLinecap="round" />
              <circle className="gb-handB" cx="82" cy="121" r="9"
                      fill="url(#gb-shell)" stroke={LATON} strokeWidth="1.2" strokeOpacity="0.5" />
            </g>
          ) : jalando ? (
            /* estirado hacia arriba, agarrando el cordón */
            <g className="gb-armR">
              <path d="M94 96 Q106 66 113 38" stroke="url(#gb-shell)" strokeWidth="13"
                    fill="none" strokeLinecap="round" />
              <circle cx="114" cy="32" r="9" fill="url(#gb-shell)" stroke={LATON} strokeWidth="1.4" strokeOpacity="0.7" />
            </g>
          ) : (
            <g className="gb-armR">
              <path d="M94 96 Q108 80 110 60" stroke="url(#gb-shell)" strokeWidth="13"
                    fill="none" strokeLinecap="round" />
              <circle cx="110" cy="54" r="9" fill="url(#gb-shell)" stroke={LATON} strokeWidth="1.2" strokeOpacity="0.5" />
            </g>
          )}

          {/* cuerpo (cubre los hombros → brazos pegados) */}
          <path d="M44 96 Q44 132 70 132 Q96 132 96 96 Z"
                fill="url(#gb-shell)" stroke={LATON} strokeWidth="1.3" strokeOpacity="0.45" />

          {/* ── La marca en el pecho ──
             Es el nudo real del logo, incrustado con su propio viewBox para
             no tener que reescalar el trazado a mano. */}
          <ellipse cx="70" cy="112" rx="14" ry="12" fill="#0B0E12" opacity="0.65" />
          <svg x="58" y="101" width="24" height="24" viewBox={NUDO_VIEWBOX} overflow="visible">
            <g transform={NUDO_TRANSFORM} fill={m === 'error' ? '#8A6E19' : LATON_CLARO}>
              <path d={NUDO_PATH} />
            </g>
          </svg>

          {/* cuello */}
          <rect x="62" y="86" width="16" height="12" rx="4" fill="#2A303B" />

          {/* cabeza */}
          <rect x="30" y="26" width="80" height="66" rx="26"
                fill="url(#gb-shell)" stroke={LATON} strokeWidth="1.4" strokeOpacity="0.5" />
          {/* orejas de latón */}
          <rect x="22"  y="48" width="11" height="22" rx="5.5" fill="url(#gb-accent)" />
          <rect x="107" y="48" width="11" height="22" rx="5.5" fill="url(#gb-accent)" />

          {/* visor */}
          <rect x="40" y="36" width="60" height="46" rx="20" fill="url(#gb-visor)" />
          <rect x="40" y="36" width="60" height="46" rx="20" fill="none" stroke={LATON} strokeWidth="1.6" strokeOpacity="0.35" />
          <ellipse cx="56" cy="48" rx="11" ry="6" fill="#FFFFFF" opacity="0.07" />

          {/* ── La cara ── */}
          {cargando ? (
            /* Reiniciando: la pantalla se barre, la cara titila y una barra
               marca el progreso. Todo recortado al visor. */
            <g clipPath="url(#gb-visorClip)">
              <g className="gb-flick">
                <g className="gb-glitch">
                  <ellipse cx="58" cy="53" rx="6" ry="8" fill={eye} />
                  <ellipse cx="82" cy="53" rx="6" ry="8" fill={eye} />
                  <path d="M60 69 q10 7 20 0" stroke={eye} strokeWidth="3.5" fill="none" strokeLinecap="round" />
                </g>
              </g>
              {/* líneas de pantalla */}
              <g opacity="0.22">
                {[40, 46, 52, 58, 64, 70, 76].map((y) => (
                  <rect key={y} x="40" y={y} width="60" height="1" fill={LATON_CLARO} />
                ))}
              </g>
              {/* barrido */}
              <rect className="gb-sweep" x="40" y="30" width="60" height="14" fill="url(#gb-barrido)" />
              {/* barra de progreso */}
              <rect x="53" y="76" width="34" height="3.4" rx="1.7" fill={LATON_CLARO} opacity="0.18" />
              <rect x="53" y="76" width="0" height="3.4" rx="1.7" fill={LATON_CLARO}>
                <animate attributeName="width" values="0;34" dur="1.05s" repeatCount="indefinite" />
              </rect>
            </g>
          ) : (
            <>
              {/* ojos */}
              {dormido ? (
                /* Dos rayas: los párpados cerrados. Nada de "Z" flotando —
                   sería un emoji disfrazado de dibujo. */
                <>
                  <path d="M50 54 q8 6 16 0" stroke={eye} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.75" />
                  <path d="M74 54 q8 6 16 0" stroke={eye} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.75" />
                </>
              ) : m === 'happy' ? (
                <>
                  <path d="M52 58 q6 -8 12 0" stroke={eye} strokeWidth="4.5" fill="none" strokeLinecap="round" />
                  <path d="M76 58 q6 -8 12 0" stroke={eye} strokeWidth="4.5" fill="none" strokeLinecap="round" />
                </>
              ) : m === 'error' ? (
                <>
                  <line x1="52" y1="52" x2="62" y2="62" stroke={eye} strokeWidth="4.5" strokeLinecap="round" />
                  <line x1="62" y1="52" x2="52" y2="62" stroke={eye} strokeWidth="4.5" strokeLinecap="round" />
                  <line x1="78" y1="52" x2="88" y2="62" stroke={eye} strokeWidth="4.5" strokeLinecap="round" />
                  <line x1="88" y1="52" x2="78" y2="62" stroke={eye} strokeWidth="4.5" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <g style={{ transform: `translate(${mirada.x}px, ${mirada.y}px)`, transition: 'transform .18s ease-out' }}>
                    <g>
                      <ellipse className="gb-eyelid" cx="58" cy={eyeY} rx="6" ry="8" fill={eye} />
                      <circle cx="60" cy={eyeY - 2} r="2" fill="#FFF8E1" opacity="0.9" />
                    </g>
                    <g>
                      <ellipse className="gb-eyelid" cx="82" cy={eyeY} rx="6" ry="8" fill={eye} />
                      <circle cx="84" cy={eyeY - 2} r="2" fill="#FFF8E1" opacity="0.9" />
                    </g>
                  </g>
                </>
              )}

              {/* boca */}
              {dormido ? (
                <ellipse cx="70" cy="71" rx="4" ry="3" fill={eye} opacity="0.5" />
              ) : m === 'talking' ? (
                <rect x="62" y="68" width="16" height="6" rx="3" fill={eye}>
                  <animate attributeName="height" values="3;8;3" dur="0.3s" repeatCount="indefinite" />
                  <animate attributeName="y" values="69;66;69" dur="0.3s" repeatCount="indefinite" />
                </rect>
              ) : m === 'error' ? (
                <path d="M60 74 q10 -7 20 0" stroke={eye} strokeWidth="3.5" fill="none" strokeLinecap="round" />
              ) : (
                <path d={m === 'happy' ? 'M58 68 q12 11 24 0' : 'M60 69 q10 7 20 0'}
                  stroke={eye} strokeWidth="3.5" fill="none" strokeLinecap="round" />
              )}
            </>
          )}
        </g>

        {/* MODO TRABAJANDO: su portátil, visto POR DETRÁS.

            Antes se veía la pantalla de frente con líneas de código
            moviéndose, y eso es imposible: si él lo está mirando, nosotros
            estamos detrás. Lo que se ve desde aquí es la tapa —su cara
            exterior, con el nudo de la marca— y nada más. Lo que hay en su
            pantalla es asunto suyo.

            Lo que sí mira al usuario es el otro monitor, el de al lado, que
            lleva idioma y tema y está en MonitorGestbot.jsx. Dos pantallas,
            cada una girada hacia quien le corresponde. */}
        {working && conPortatil && (
          <g>
            {/* Base y teclado, en escorzo: se ve el canto, no las teclas. */}
            <path d="M40 132 L100 132 L108 144 L32 144 Z" fill="#2A303B" stroke={LATON} strokeWidth="1.1" strokeOpacity="0.4" />
            <path d="M44 136 L96 136 L100 141 L40 141 Z" fill="#1A1F28" opacity="0.85" />
            {/* La tapa por fuera. Sin contenido: es la parte de atrás. */}
            <rect x="46" y="104" width="48" height="30" rx="4" fill="#232833" stroke={LATON} strokeWidth="1.1" strokeOpacity="0.45" />
            <rect x="49.5" y="107.5" width="41" height="23" rx="2.5" fill="none" stroke={LATON} strokeWidth="0.7" strokeOpacity="0.18" />
            {/* El nudo de la marca en la tapa, del tamaño de una pegatina.
                Anidado con su propio viewBox, igual que el del pecho: así no
                hay que reescalar el trazado a mano. */}
            <svg x="63" y="112" width="14" height="14" viewBox={NUDO_VIEWBOX} overflow="visible" opacity="0.5">
              <g transform={NUDO_TRANSFORM} fill={LATON_CLARO}>
                <path d={NUDO_PATH} />
              </g>
            </svg>
            {/* El resplandor que se escapa por los lados delata que está
                encendida sin enseñar qué hay dentro. */}
            <ellipse className="gb-scanl" cx="70" cy="134" rx="26" ry="2.6" fill={LATON_CLARO} opacity="0.22" />
          </g>
        )}
      </svg>
    </div>
  );
}
