/* Una acción en curso, con nombre propio.

   El cargador de siempre (GLoader) responde a "estoy trayendo datos". Esto
   responde a otra cosa: "estoy HACIENDO algo que pediste y que tarda" —
   publicar un evento, cobrar, generar escarapelas. Son momentos en los que
   la persona se queda mirando la pantalla y necesita saber que su clic
   llegó y qué está pasando.

   Regla que se respeta aquí: no se inventa progreso. Si quien llama sabe
   los pasos reales, los pasa y se van marcando; si no, se muestra una
   animación indeterminada y ya. Una barra que avanza sola mientras el
   servidor no ha contestado es mentirle al usuario. */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext.jsx';

const STYLE_ID = 'gestek-accion';
const CSS = `
@keyframes ac-fondo   {from{opacity:0}to{opacity:1}}
@keyframes ac-caja    {from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
/* publicar: el nudo emite anillos, como algo que sale al aire */
@keyframes ac-onda    {0%{transform:scale(.6);opacity:.55}100%{transform:scale(2.2);opacity:0}}
/* cobrar: latido corto, tenso */
@keyframes ac-latido  {0%,100%{transform:scale(1)}14%{transform:scale(1.07)}28%{transform:scale(1)}42%{transform:scale(1.05)}}
/* imprimir: una banda baja por encima, como el cabezal de una impresora */
@keyframes ac-banda   {0%{transform:translateY(-120%)}100%{transform:translateY(220%)}}
.ac-fondo{animation:ac-fondo .18s ease both}
.ac-caja{animation:ac-caja .3s cubic-bezier(.16,1,.3,1) both}
.ac-onda{animation:ac-onda 2s ease-out infinite}
.ac-onda2{animation-delay:.66s}
.ac-onda3{animation-delay:1.32s}
.ac-latido{animation:ac-latido 1.6s ease-in-out infinite}
.ac-banda{animation:ac-banda 1.4s linear infinite}
@media (prefers-reduced-motion:reduce){
  .ac-onda,.ac-latido,.ac-banda{animation:none;opacity:.35}
}
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

/* Cada acción tiene su gesto. No es adorno: hace que el usuario reconozca
   de un vistazo en qué está la plataforma sin leer el texto. */
export const ACCIONES = {
  publicar:   { titulo: 'Publicando el evento…',   nota: 'Queda visible en Explorar y su página empieza a recibir visitas.' },
  guardar:    { titulo: 'Guardando cambios…',      nota: null },
  cobrar:     { titulo: 'Procesando el pago…',     nota: 'No cierres esta ventana ni vuelvas atrás.' },
  escarapelas:{ titulo: 'Generando escarapelas…',  nota: 'Puede tardar según cuántos asistentes tengas.' },
  duplicar:   { titulo: 'Duplicando el evento…',   nota: null },
  importar:   { titulo: 'Importando asistentes…',  nota: 'Cada fila genera su código QR.' },
};

const Marca = ({ gesto }) => (
  <div className="relative" style={{ width: 72, height: 72 }}>
    {/* halo cálido detrás, común a todas */}
    <div
      className="absolute inset-0 rounded-full blur-2xl"
      style={{ background: 'radial-gradient(circle, rgba(224,177,43,.5), transparent 70%)' }}
    />

    {gesto === 'publicar' && [0, 1, 2].map((i) => (
      <span
        key={i}
        className={`ac-onda ${i === 1 ? 'ac-onda2' : i === 2 ? 'ac-onda3' : ''} absolute inset-0 rounded-full border border-primary/50`}
      />
    ))}

    <div className={`relative w-full h-full ${gesto === 'cobrar' ? 'ac-latido' : ''}`}>
      <div className="gk-nudo w-full h-full" role="img" aria-hidden="true" />
      {gesto === 'escarapelas' && (
        <span className="absolute inset-x-[-6px] h-3 bg-gradient-to-b from-transparent via-[#F2D66B]/80 to-transparent ac-banda" />
      )}
    </div>
  </div>
);

export default function AccionEnCurso({
  accion = 'guardar',
  titulo,
  nota,
  pasos = null,        // ['Validando…', 'Creando la página', …]
  pasoActual = -1,     // índice del que está corriendo; -1 = indeterminado
  abierto = true,
}) {
  useCss();
  const { t } = useI18n();

  /* Mientras esto está encima, el fondo no debe poder desplazarse. */
  useEffect(() => {
    if (!abierto) return undefined;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, [abierto]);

  if (!abierto) return null;

  const preset = ACCIONES[accion] || ACCIONES.guardar;
  const elTitulo = titulo || preset.titulo;
  const laNota = nota !== undefined ? nota : preset.nota;

  return createPortal(
    <div
      className="ac-fondo fixed inset-0 z-[9995] flex items-center justify-center bg-bg/85 backdrop-blur-sm px-5"
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
      aria-label={t(elTitulo)}
    >
      <div className="ac-caja w-full max-w-sm rounded-3xl border border-border-2 bg-surface shadow-card-hover p-8 text-center">
        <div className="flex justify-center mb-6">
          <Marca gesto={accion} />
        </div>

        <p className="text-base font-semibold text-text-1">{t(elTitulo)}</p>
        {laNota && <p className="text-sm text-text-2 mt-2 leading-relaxed">{t(laNota)}</p>}

        {Array.isArray(pasos) && pasos.length > 0 && (
          <ul className="mt-6 space-y-2.5 text-left">
            {pasos.map((p, i) => {
              const hecho = pasoActual > i;
              const enCurso = pasoActual === i;
              return (
                <li key={p} className="flex items-center gap-2.5 text-sm">
                  <span className={`h-5 w-5 flex-shrink-0 rounded-full flex items-center justify-center border ${
                    hecho ? 'bg-success/15 border-success/40 text-success'
                          : enCurso ? 'bg-primary/15 border-primary/40 text-primary'
                                    : 'border-border text-text-3'
                  }`}>
                    {hecho ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                           strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : enCurso ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-[pulseSoft_1.2s_ease-in-out_infinite]" />
                    ) : null}
                  </span>
                  <span className={hecho ? 'text-text-3 line-through' : enCurso ? 'text-text-1 font-medium' : 'text-text-3'}>
                    {t(p)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
