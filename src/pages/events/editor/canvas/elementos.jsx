import { useState, useEffect } from 'react';
import { BLOCKS } from '../blocks.jsx';

/* ──────────────────────────────────────────────────────────────────
   Lienzo libre · catálogo de elementos (Rework Event Experience)
   Cada elemento: { id, type, x, y, w, h, z, props }
   Coordenadas en el espacio de diseño (ANCHO_DISENO px); el render
   público escala proporcionalmente al viewport.
   ────────────────────────────────────────────────────────────────── */

export const ANCHO_DISENO = 1200;

export const FUENTES_CANVAS = [
  { value: '',        label: 'Del White Label' },
  { value: "'Space Grotesk', sans-serif", label: 'Space Grotesk' },
  { value: "'Inter', sans-serif",         label: 'Inter' },
  { value: "Georgia, serif",              label: 'Georgia' },
  { value: "'JetBrains Mono', monospace", label: 'Mono' },
];

export const ANIMACIONES = [
  { value: '',         label: 'Sin animación' },
  { value: 'aparecer', label: 'Aparecer (fade)' },
  { value: 'subir',    label: 'Subir suave' },
  { value: 'zoom',     label: 'Zoom' },
  { value: 'izq',      label: 'Desde la izquierda' },
  { value: 'der',      label: 'Desde la derecha' },
  { value: 'maquina',  label: 'Máquina de escribir (solo texto)' },
  { value: 'flotar',   label: 'Flotar (bucle)' },
  { value: 'pulso',    label: 'Pulso (bucle)' },
];

const ANIM_CSS = {
  aparecer: 'gk-anim-fade',
  subir   : 'gk-anim-up',
  zoom    : 'gk-anim-zoom',
  izq     : 'gk-anim-left',
  der     : 'gk-anim-right',
  flotar  : 'gk-anim-float',
  pulso   : 'gk-anim-pulse',
};

export const ELEMENTOS = {
  titulo: {
    label: 'Título', icon: IcTexto,
    defaults: { w: 560, h: 90, props: { texto: 'Tu título aquí', fontSize: 48, bold: true, align: 'left', color: '' } },
  },
  texto: {
    label: 'Texto', icon: IcParrafo,
    defaults: { w: 480, h: 120, props: { texto: 'Escribe aquí el contenido de tu evento…', fontSize: 17, bold: false, align: 'left', color: '' } },
  },
  imagen: {
    label: 'Imagen', icon: IcImagen,
    defaults: { w: 420, h: 260, props: { url: '', radio: 20, ajuste: 'cover' } },
  },
  boton: {
    label: 'Botón', icon: IcBoton,
    defaults: { w: 210, h: 52, props: { texto: 'Comprar boleta', link: '', fontSize: 16, color: '', fondo: '' } },
  },
  countdown: {
    label: 'Cronómetro', icon: IcReloj,
    defaults: { w: 460, h: 110, props: { fontSize: 40, color: '' } },
  },
  caja: {
    label: 'Caja / Fondo', icon: IcCaja,
    defaults: { w: 500, h: 300, props: { fondo: 'rgba(139,92,246,0.12)', radio: 24, borde: '' } },
  },
  divisor: {
    label: 'Línea', icon: IcLinea,
    defaults: { w: 400, h: 4, props: { color: '' } },
  },
  boletas: {
    label: 'Boletas (funcional)', icon: IcTicket,
    defaults: { w: 700, h: 380, props: {} },
  },
  video: {
    label: 'Video', icon: IcVideo,
    defaults: { w: 560, h: 320, props: { url: '' } },
  },
  bloque: {
    label: 'Sección del evento', icon: IcBloque,
    defaults: { w: 760, h: 420, props: { bloque: 'agenda' } },
  },
};

/* Bloques funcionales que se pueden incrustar en el lienzo */
export const BLOQUES_INCRUSTABLES = Object.keys(BLOCKS)
  .filter(k => !['portada', 'titulo'].includes(k))
  .map(k => ({ value: k, label: BLOCKS[k].label }));

/* ── Render de un elemento (compartido editor ↔ público) ── */
export function ElementoRender({ el, evento, publico = false, onReservar, animar = false, animKey = 0 }) {
  const p = el.props || {};
  const anim = p.anim || '';
  const activarAnim = (animar || animKey > 0) && anim;
  const wrapStyle = activarAnim && ANIM_CSS[anim]
    ? { animationDuration: `${p.animDur || 0.8}s`, animationDelay: `${p.animDelay || 0}s` }
    : undefined;
  const wrapClass = activarAnim && ANIM_CSS[anim] ? ANIM_CSS[anim] : '';
  const contenido = renderInner(el, p, evento, publico, onReservar, activarAnim, animKey);
  return wrapClass
    ? <div key={animKey} className={`w-full h-full ${wrapClass}`} style={wrapStyle}>{contenido}</div>
    : contenido;
}

function renderInner(el, p, evento, publico, onReservar, activarAnim, animKey) {
  const estiloTexto = {
    fontSize: p.fontSize, fontWeight: p.bold ? 700 : 400, textAlign: p.align,
    color: p.color || 'inherit', fontFamily: p.fuente || 'inherit',
    lineHeight: 1.25, width: '100%', height: '100%', overflow: 'hidden',
  };
  switch (el.type) {
    case 'titulo':
    case 'texto': {
      if (p.anim === 'maquina' && activarAnim) {
        return <TextoMaquina key={animKey} texto={p.texto || ''} estilo={estiloTexto} display={el.type === 'titulo'} dur={p.animDur || 2} delay={p.animDelay || 0} />;
      }
      return <div style={estiloTexto} className={el.type === 'titulo' ? 'font-display' : ''}>{p.texto}</div>;
    }
    case 'imagen':
      return p.url
        ? <img src={p.url} alt="" draggable={false} className="w-full h-full select-none" style={{ objectFit: p.ajuste || 'cover', borderRadius: p.radio ?? 20 }} />
        : <div className="w-full h-full flex items-center justify-center text-xs text-text-3 border-2 border-dashed border-border-2 rounded-2xl">Sin imagen — edítala a la derecha</div>;
    case 'boton': {
      const inner = (
        <span className="w-full h-full flex items-center justify-center font-semibold transition-transform hover:scale-[1.02]"
          style={{ fontSize: p.fontSize || 16, color: p.color || '#fff', background: p.fondo || 'var(--brand-primary, #3B82F6)', borderRadius: 14 }}>
          {p.texto || 'Botón'}
        </span>
      );
      return publico && p.link
        ? <a href={p.link} target={p.link.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="block w-full h-full">{inner}</a>
        : inner;
    }
    case 'countdown':
      return <Countdown evento={evento} p={p} />;
    case 'caja':
      return <div className="w-full h-full" style={{ background: p.fondo, borderRadius: p.radio ?? 24, border: p.borde ? `1px solid ${p.borde}` : undefined }} />;
    case 'divisor':
      return <div className="w-full h-full" style={{ background: p.color || 'var(--brand-primary, #3B82F6)', borderRadius: 999 }} />;
    case 'video': {
      const embed = urlEmbed(p.url);
      return embed
        ? <iframe src={embed} className="w-full h-full rounded-2xl" style={{ pointerEvents: publico ? 'auto' : 'none' }} allowFullScreen title="video" />
        : <div className="w-full h-full flex items-center justify-center text-xs text-text-3 border-2 border-dashed border-border-2 rounded-2xl">Pega un link de YouTube/Vimeo</div>;
    }
    case 'bloque': {
      const B = BLOCKS[p.bloque];
      if (!B) return <div className="w-full h-full flex items-center justify-center text-xs text-text-3 border-2 border-dashed border-border-2 rounded-2xl">Elige la sección a la derecha</div>;
      const Pv = B.Preview;
      return (
        <div className="w-full h-full overflow-y-auto no-scrollbar" style={{ pointerEvents: publico ? 'auto' : 'none' }}>
          <Pv data={{}} evento={evento} isEditor={!publico} />
        </div>
      );
    }
    case 'boletas':
      return (
        <div className="w-full h-full overflow-y-auto no-scrollbar rounded-2xl border border-border bg-surface/40 p-4">
          <p className="text-sm font-semibold text-text-1 mb-2">Boletas del evento</p>
          <p className="text-xs text-text-3 mb-3">Este bloque muestra las boletas reales con su botón de compra/reserva.</p>
          {publico && onReservar ? onReservar : (
            <div className="space-y-2">
              <div className="h-14 rounded-xl bg-surface-2 animate-pulse" />
              <div className="h-14 rounded-xl bg-surface-2/60 animate-pulse" />
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

function Countdown({ evento, p }) {
  const target = evento?.fecha_inicio ? new Date(evento.fecha_inicio) : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!target) return <p className="text-sm text-text-3">Configura la fecha del evento</p>;
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000) % 24,
        m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
  return (
    <div className="w-full h-full flex items-center justify-center gap-4">
      {[[d, 'días'], [h, 'hrs'], [m, 'min'], [s, 'seg']].map(([v, l]) => (
        <div key={l} className="text-center">
          <p className="font-display font-bold tabular-nums" style={{ fontSize: p.fontSize || 40, color: p.color || 'inherit', lineHeight: 1 }}>
            {String(v).padStart(2, '0')}
          </p>
          <p className="text-[10px] uppercase tracking-widest opacity-60 mt-1">{l}</p>
        </div>
      ))}
    </div>
  );
}

function urlEmbed(url = '') {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

/* Máquina de escribir: revela el texto carácter a carácter */
function TextoMaquina({ texto, estilo, display, dur, delay }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const chars = [...texto];
    if (chars.length === 0) return;
    const paso = Math.max(18, (dur * 1000) / chars.length);
    let i = 0, intId;
    const t = setTimeout(() => {
      intId = setInterval(() => {
        i += 1; setN(i);
        if (i >= chars.length) clearInterval(intId);
      }, paso);
    }, (delay || 0) * 1000);
    return () => { clearTimeout(t); clearInterval(intId); };
  }, [texto, dur, delay]);
  return (
    <div style={estilo} className={display ? 'font-display' : ''}>
      {[...texto].slice(0, n).join('')}
      <span className="opacity-60 animate-pulse">▍</span>
    </div>
  );
}

/* icons */
function IcTexto({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" d="M4 6h16M4 6v2m16-2v2M12 6v14m-3 0h6" /></svg>; }
function IcParrafo({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" d="M4 6h16M4 10h16M4 14h10M4 18h7" /></svg>; }
function IcImagen({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zM14 8h.01" /></svg>; }
function IcBoton({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="8" width="18" height="8" rx="4" /><path strokeLinecap="round" d="M8 12h8" /></svg>; }
function IcReloj({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>; }
function IcCaja({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="4" y="4" width="16" height="16" rx="3" /></svg>; }
function IcLinea({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 12h16" /></svg>; }
function IcTicket({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>; }
function IcBloque({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>; }
function IcVideo({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>; }
