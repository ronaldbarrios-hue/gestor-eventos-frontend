/* Mosaico de eventos reales.

   Las figuras son las que pidió el usuario: hexágonos alargados y ligeramente
   girados, agrupados con aire entre ellos. Se llenan con las PORTADAS DE LOS
   EVENTOS PUBLICADOS de verdad, no con fotos de archivo — así la sección se
   actualiza sola y lo que enseña es comprobable: son los eventos que están
   ahora mismo en Explorar.

   Si todavía no hay eventos con portada, las figuras se quedan como formas de
   latón. Prefiero eso a inventar un evento que no existe. */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventosApi } from '../../../api/eventos.js';
import { useI18n } from '../../../context/I18nContext.jsx';

/* Hexágono alargado, con las puntas arriba y abajo. Cada figura lo usa con
   una rotación y un tamaño distintos, que es lo que hace que el grupo se lea
   como esquirlas sueltas y no como una rejilla. */
const HEXAGONO = 'polygon(50% 0%, 100% 23%, 100% 77%, 50% 100%, 0% 77%, 0% 23%)';

const FIGURAS = [
  { w: 190, h: 290, giro: -14, x: 34,  y: 0,   demora: 0   },
  { w: 165, h: 255, giro: -10, x: 0,   y: 300, demora: 120 },
  { w: 175, h: 268, giro: 8,   x: 205, y: 288, demora: 240 },
];

export default function Mosaico() {
  const { t } = useI18n();
  const [eventos, setEventos] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    eventosApi.publicos({ limit: 12 })
      .then((d) => setEventos((d.eventos || []).filter(e => e.cover_url || e.gallery?.[0])))
      .catch(() => { /* sin eventos, las figuras se quedan en latón */ });
  }, []);

  useEffect(() => {
    const el = document.getElementById('mosaico-eventos');
    if (!el) return undefined;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="mosaico-eventos" className="px-5 sm:px-8 py-24 sm:py-28 overflow-hidden">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

        {/* ── Las figuras ── */}
        <div className="relative mx-auto lg:mx-0" style={{ width: 400, height: 580, maxWidth: '100%' }}>
          {FIGURAS.map((f, i) => {
            const ev = eventos[i];
            const imagen = ev?.cover_url || ev?.gallery?.[0];
            const contenido = (
              <div
                className="w-full h-full relative"
                style={{ clipPath: HEXAGONO, WebkitClipPath: HEXAGONO }}
              >
                {imagen ? (
                  <>
                    <img
                      src={imagen} alt={ev.titulo} loading="lazy" decoding="async"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* Un velo de latón para que las tres fotos, vengan de donde
                        vengan, se lean como una sola pieza de la página. */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#12100B]/85 via-[#12100B]/10 to-transparent" />
                    <div className="absolute inset-0 bg-primary/12 mix-blend-overlay" />
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/25 via-primary/10 to-surface-2" />
                )}
              </div>
            );

            return (
              <div
                key={i}
                className={`group absolute transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]
                            ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{
                  left: f.x, top: f.y, width: f.w, height: f.h,
                  transform: `rotate(${f.giro}deg)`,
                  transitionDelay: `${f.demora}ms`,
                }}
              >
                {ev ? (
                  <Link to={`/explorar/${ev.slug}`} className="block w-full h-full" title={ev.titulo}>
                    {contenido}
                  </Link>
                ) : contenido}

                {/* El nombre del evento, enderezado: la figura va girada pero
                    el texto no, porque leer en diagonal es incómodo. */}
                {ev && (
                  <span
                    className="absolute bottom-7 left-1/2 -translate-x-1/2 w-[78%] text-center
                               text-[11px] font-semibold text-white/90 leading-tight pointer-events-none"
                    style={{ transform: `translateX(-50%) rotate(${-f.giro}deg)` }}
                  >
                    {ev.titulo}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── El texto ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary mb-4">
            {t('Hecho con GESTEK')}
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 leading-tight">
            {t('Esto no es una maqueta')}
          </h2>
          <p className="mt-5 text-base sm:text-lg text-text-2 leading-relaxed">
            {eventos.length > 0
              ? t('Son eventos que están publicados ahora mismo, con su boletería, su equipo y su página. Pulsa cualquiera para verlo por dentro.')
              : t('Aquí van a aparecer los eventos que se publiquen con GESTEK. Cuando el primero tenga portada, entra solo.')}
          </p>

          <Link
            to="/explorar"
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full border border-border-2
                       text-sm font-medium text-text-1 hover:bg-surface-2 hover:border-primary/40 transition-all"
          >
            {t('Ver todos los eventos')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
