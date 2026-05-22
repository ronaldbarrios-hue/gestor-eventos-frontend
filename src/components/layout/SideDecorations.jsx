import { useLocation } from 'react-router-dom';

/* Decoraciones que llenan los márgenes laterales vacíos de las rutas públicas.
   Se muestran solo en pantallas grandes (xl+) para no estorbar en mobile/tablet.
   El estilo varía sutilmente por ruta. */
export default function SideDecorations() {
  const { pathname } = useLocation();
  const variant = getVariant(pathname);

  return (
    <>
      {/* LEFT side */}
      <div className="hidden xl:block fixed inset-y-0 left-0 w-[calc((100vw-72rem)/2)] pointer-events-none z-0 overflow-hidden">
        <VerticalLine side="left" color={variant.primary} />
        <ConstellationLeft color={variant.primary} />
        <FloatingDots side="left" color={variant.primary} count={8} />
        <BlurredGlow position="top-left" color={variant.primary} />
        <BlurredGlow position="bottom-left" color={variant.secondary} delay="3s" />
      </div>

      {/* RIGHT side */}
      <div className="hidden xl:block fixed inset-y-0 right-0 w-[calc((100vw-72rem)/2)] pointer-events-none z-0 overflow-hidden">
        <VerticalLine side="right" color={variant.secondary} />
        <ConstellationRight color={variant.secondary} />
        <FloatingDots side="right" color={variant.secondary} count={8} />
        <RotatingRing color={variant.primary} />
        <BlurredGlow position="top-right" color={variant.secondary} />
        <BlurredGlow position="bottom-right" color={variant.primary} delay="5s" />
      </div>
    </>
  );
}

function getVariant(pathname) {
  if (pathname === '/')                          return { primary: 'primary', secondary: 'accent' };
  if (pathname.startsWith('/como-funciona'))     return { primary: 'primary', secondary: 'success' };
  if (pathname.startsWith('/producto'))          return { primary: 'accent',  secondary: 'primary' };
  if (pathname.startsWith('/explorar'))          return { primary: 'success', secondary: 'primary' };
  if (pathname.startsWith('/planes'))            return { primary: 'accent',  secondary: 'primary' };
  if (pathname.startsWith('/faq'))               return { primary: 'primary', secondary: 'accent' };
  return { primary: 'primary', secondary: 'accent' };
}

/* Color helpers */
const COLOR_MAP = {
  primary: { fill: 'bg-primary',     ring: 'border-primary',     glow: 'bg-primary',     stroke: 'stroke-primary'     },
  accent:  { fill: 'bg-accent',      ring: 'border-accent',      glow: 'bg-accent',      stroke: 'stroke-accent'      },
  success: { fill: 'bg-success',     ring: 'border-success',     glow: 'bg-success',     stroke: 'stroke-success'     },
};

/* ─────────── Components ─────────── */

function VerticalLine({ side, color }) {
  const c = COLOR_MAP[color];
  return (
    <div className={`absolute ${side === 'left' ? 'left-12' : 'right-12'} top-0 bottom-0 w-px ${c.fill} opacity-10`}>
      <div className={`absolute inset-x-0 top-1/4 h-32 ${c.fill} opacity-50 animate-[pulseSoft_4s_ease-in-out_infinite]`} />
      <div className={`absolute inset-x-0 top-2/3 h-24 ${c.fill} opacity-30 animate-[pulseSoft_5s_ease-in-out_infinite_1s]`} />
    </div>
  );
}

function FloatingDots({ side, color, count }) {
  const c = COLOR_MAP[color];
  const positions = Array.from({ length: count }, (_, i) => ({
    top: `${10 + (i * 11) % 80}%`,
    [side]: `${20 + (i * 17) % 60}%`,
    size: 4 + (i % 3) * 2,
    delay: i * 0.6,
    duration: 4 + (i % 3),
  }));
  return (
    <>
      {positions.map((p, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${c.fill} animate-[float_4s_ease-in-out_infinite]`}
          style={{
            top: p.top,
            [side]: p.left || p.right,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: 0.3 + ((i % 4) * 0.15),
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            boxShadow: `0 0 12px var(--tw-shadow-color, currentColor)`,
          }}
        />
      ))}
    </>
  );
}

function BlurredGlow({ position, color, delay = '0s' }) {
  const c = COLOR_MAP[color];
  const positions = {
    'top-left':     'top-[10%] -left-20',
    'top-right':    'top-[10%] -right-20',
    'bottom-left':  'bottom-[15%] -left-20',
    'bottom-right': 'bottom-[15%] -right-20',
  };
  return (
    <div
      className={`absolute ${positions[position]} w-64 h-64 rounded-full ${c.glow} blur-[100px] opacity-30 animate-[glowPulse_8s_ease-in-out_infinite]`}
      style={{ animationDelay: delay }}
    />
  );
}

function ConstellationLeft({ color }) {
  const c = COLOR_MAP[color];
  /* Constelación tipo SVG con líneas conectando puntos */
  return (
    <svg
      className="absolute top-1/3 left-1/2 -translate-x-1/2 w-32 h-40 opacity-30"
      viewBox="0 0 100 120"
      fill="none"
    >
      <g className={c.stroke} stroke="currentColor" strokeWidth="0.5" opacity="0.5">
        <line x1="20" y1="20" x2="60" y2="40" />
        <line x1="60" y1="40" x2="40" y2="80" />
        <line x1="40" y1="80" x2="80" y2="100" />
        <line x1="60" y1="40" x2="80" y2="100" />
      </g>
      <g className={c.fill} fill="currentColor">
        <circle cx="20" cy="20" r="1.5"><animate attributeName="r" values="1.5;2.5;1.5" dur="3s" repeatCount="indefinite"/></circle>
        <circle cx="60" cy="40" r="2"><animate attributeName="r" values="2;3;2" dur="4s" repeatCount="indefinite"/></circle>
        <circle cx="40" cy="80" r="1.5"><animate attributeName="r" values="1.5;2.5;1.5" dur="3.5s" repeatCount="indefinite"/></circle>
        <circle cx="80" cy="100" r="2"><animate attributeName="r" values="2;3;2" dur="4.5s" repeatCount="indefinite"/></circle>
      </g>
    </svg>
  );
}

function ConstellationRight({ color }) {
  const c = COLOR_MAP[color];
  return (
    <svg
      className="absolute top-2/3 left-1/2 -translate-x-1/2 w-32 h-40 opacity-30"
      viewBox="0 0 100 120"
      fill="none"
    >
      <g className={c.stroke} stroke="currentColor" strokeWidth="0.5" opacity="0.5">
        <line x1="20" y1="40" x2="50" y2="20" />
        <line x1="50" y1="20" x2="80" y2="60" />
        <line x1="80" y1="60" x2="60" y2="100" />
        <line x1="20" y1="40" x2="60" y2="100" />
      </g>
      <g className={c.fill} fill="currentColor">
        <circle cx="20" cy="40" r="1.5"><animate attributeName="r" values="1.5;2.5;1.5" dur="3.2s" repeatCount="indefinite"/></circle>
        <circle cx="50" cy="20" r="2"><animate attributeName="r" values="2;3;2" dur="4.2s" repeatCount="indefinite"/></circle>
        <circle cx="80" cy="60" r="1.5"><animate attributeName="r" values="1.5;2.5;1.5" dur="3.7s" repeatCount="indefinite"/></circle>
        <circle cx="60" cy="100" r="2"><animate attributeName="r" values="2;3;2" dur="4.7s" repeatCount="indefinite"/></circle>
      </g>
    </svg>
  );
}

function RotatingRing({ color }) {
  const c = COLOR_MAP[color];
  return (
    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-48 h-48 opacity-20">
      <div className={`absolute inset-0 rounded-full border ${c.ring} animate-[spin-slow_40s_linear_infinite]`} style={{ borderStyle: 'dashed' }}>
        <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${c.fill}`} />
      </div>
      <div className={`absolute inset-4 rounded-full border ${c.ring} opacity-50 animate-[spin-slow_30s_linear_infinite_reverse]`}>
        <div className={`absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${c.fill}`} />
      </div>
    </div>
  );
}
