/* Secciones de la portada pedidas en el rediseño:
   1. PasoAPaso        — cómo funciona, del primer boleto al último informe
   2. IncrustarEnTuWeb — el eFrame explicado y con el snippet real
   3. CasosDeUso       — para quién es
   4. VideoDemo        — el recorrido en video

   Sin emojis: cada tarjeta lleva un icono SVG trazado, que además hereda
   el color del texto y se ve igual de nítido en claro y en oscuro. */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { embedSnippet } from '../../../lib/embed.js';
import { useI18n } from '../../../context/I18nContext.jsx';

/* Aparecer al entrar en pantalla. Local a este módulo para no acoplarlo
   al archivo de la portada. */
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

const Icono = ({ d, className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
       strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {d}
  </svg>
);

/* ══════════════════════════════════════════════════════════════════
   1 · CÓMO FUNCIONA, PASO A PASO
   ══════════════════════════════════════════════════════════════════ */
const PASOS = [
  {
    titulo: 'Crea el evento',
    desc: 'Nombre, fechas, sede y tipos de boleta. En cinco minutos tienes una página pública lista para vender.',
    icono: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M12 14v4M10 16h4" /></>,
  },
  {
    titulo: 'Vende y cobra',
    desc: 'Pasarela integrada, cupones, cortesías y control de aforo. Cada compra genera su código QR al instante.',
    icono: <><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><path d="M2.5 10h19" /><path d="M6.5 14.5h4" /></>,
  },
  {
    titulo: 'Controla el ingreso',
    desc: 'Escanea desde cualquier celular, incluso sin internet. Escarapelas, zonas y reingreso bajo tus reglas.',
    icono: <><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M4 12h16" /></>,
  },
  {
    titulo: 'Mide y repite',
    desc: 'Asistencia real, ventas por canal y ranking de expositores. Duplica el evento y arranca el siguiente.',
    icono: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  },
];

export function PasoAPaso() {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.1);

  return (
    <section id="como-funciona" className="px-5 sm:px-8 py-24 sm:py-28">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <header className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary mb-4">
            {t('Cómo funciona')}
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 leading-tight">
            {t('Del primer boleto al último informe')}
          </h2>
          <p className="mt-5 text-base sm:text-lg text-text-2">
            {t('Cuatro pasos. El resto lo hace la plataforma.')}
          </p>
        </header>

        <ol className="relative grid gap-8 lg:grid-cols-4 lg:gap-6">
          {/* El hilo que une los cuatro pasos — solo en escritorio */}
          <span
            aria-hidden="true"
            className="hidden lg:block absolute top-[34px] left-[12.5%] right-[12.5%] h-px
                       bg-gradient-to-r from-transparent via-primary/45 to-transparent"
          />

          {PASOS.map((p, i) => (
            <li
              key={p.titulo}
              className={`relative transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 110}ms` }}
            >
              <div className="flex lg:flex-col items-start lg:items-center gap-5 lg:gap-0 lg:text-center">
                {/* Número + icono */}
                <div className="relative flex-shrink-0 lg:mx-auto">
                  <div className="h-[68px] w-[68px] rounded-2xl border border-primary/30 bg-surface
                                  shadow-card flex items-center justify-center text-primary">
                    <Icono d={p.icono} className="h-7 w-7" />
                  </div>
                  <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gradient-primary
                                   text-[#15171C] text-[13px] font-bold flex items-center justify-center shadow-glow-sm">
                    {i + 1}
                  </span>
                </div>

                <div className="lg:mt-6">
                  <h3 className="text-lg font-semibold text-text-1">{t(p.titulo)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-2 lg:px-1">{t(p.desc)}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   2 · INCRUSTAR EN TU WEB (eFrame)
   ══════════════════════════════════════════════════════════════════ */
export function IncrustarEnTuWeb() {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.12);
  const [copiado, setCopiado] = useState(false);
  const timer = useRef(null);

  /* El snippet sale del mismo generador que usa el editor: si allí cambia
     el formato, aquí cambia solo. Nada de código de ejemplo inventado. */
  const snippet = embedSnippet({
    origin: typeof window !== 'undefined' ? window.location.origin : 'https://gestek.co',
    slug: 'mi-evento',
    seccion: 'boletas',
    titulo: 'Boletas · Mi evento',
    alto: 620,
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // Navegador sin permiso de portapapeles: seleccionar a mano sigue funcionando
      return;
    }
    setCopiado(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiado(false), 2200);
  }

  const ventajas = [
    'Se adapta al ancho disponible',
    'Hereda los colores de tu marca',
    'El cobro nunca sale de tu página',
  ];

  return (
    <section className="px-5 sm:px-8 py-24 sm:py-28 border-y border-border bg-surface/25">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center" ref={ref}>
        {/* Copia */}
        <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary mb-4">eFrame</p>
          <h2 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 leading-tight">
            {t('Incrústalo en tu propia web')}
          </h2>
          <p className="mt-5 text-base sm:text-lg text-text-2 leading-relaxed">
            {t('Tu página, tu dominio, tu marca. GESTEK va por debajo.')}
          </p>
          <p className="mt-4 text-sm text-text-2 leading-relaxed">
            {t('Pega este bloque donde quieras que aparezca la venta de boletas. Funciona en WordPress, Wix, Squarespace, Shopify y en cualquier HTML.')}
          </p>

          <ul className="mt-8 space-y-3">
            {ventajas.map((v) => (
              <li key={v} className="flex items-start gap-3 text-sm text-text-1">
                <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-primary/15 text-primary
                                 flex items-center justify-center">
                  <Icono d={<path d="M4 12.5l5 5L20 6.5" />} className="h-3 w-3" />
                </span>
                {t(v)}
              </li>
            ))}
          </ul>
        </div>

        {/* Código */}
        <div className={`transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}`}>
          <div className="rounded-3xl border border-border-2 bg-sidebar overflow-hidden shadow-card-hover">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="ml-3 text-[11px] font-mono text-white/45">index.html</span>
              </div>
              <button
                onClick={copiar}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white
                           hover:bg-white/20 transition-colors"
              >
                {copiado ? t('¡Copiado!') : t('Copiar código')}
              </button>
            </div>
            <pre className="p-4 text-[11.5px] leading-relaxed font-mono text-[#E9D485] overflow-x-auto max-h-[340px]">
              <code>{snippet}</code>
            </pre>
          </div>

          {/* Vista de cómo queda dentro de una web ajena */}
          <div className="mt-4 rounded-2xl border border-border bg-surface p-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-[11px] font-mono text-text-3">tuempresa.com/eventos</span>
            </div>
            <div className="space-y-2">
              <div className="h-2.5 w-2/3 rounded-full bg-surface-3" />
              <div className="h-2.5 w-1/2 rounded-full bg-surface-3" />
            </div>
            <div className="mt-3 rounded-xl border-2 border-dashed border-primary/45 bg-primary/5 px-3 py-5 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                eFrame · GESTEK
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-2.5 w-3/4 rounded-full bg-surface-3" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   3 · CASOS DE USO
   ══════════════════════════════════════════════════════════════════ */
const CASOS = [
  {
    titulo: 'Ferias y expo-ferias',
    desc: 'Stands, expositores, mapa navegable y rueda de negocios. El expositor gestiona su propio espacio.',
    icono: <><path d="M3 21h18M5 21V9l7-5 7 5v12" /><rect x="9" y="13" width="6" height="8" /></>,
  },
  {
    titulo: 'Congresos y académicos',
    desc: 'Agenda por salas, ponentes, certificados de asistencia y control de cupo por charla.',
    icono: <><path d="M12 3L2 8l10 5 10-5-10-5z" /><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" /></>,
  },
  {
    titulo: 'Conciertos y festivales',
    desc: 'Aforo por zona, manillas, reingreso y alertas en vivo cuando una zona se llena.',
    icono: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  },
  {
    titulo: 'Eventos corporativos',
    desc: 'Invitaciones nominadas, registro cerrado, escarapelas con cargo y reportes para dirección.',
    icono: <><rect x="2.5" y="7" width="19" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M2.5 12h19" /></>,
  },
  {
    titulo: 'Eventos de eventos',
    desc: 'Un evento paraguas con sub-eventos: cada uno con su boletería, su equipo y su propio informe.',
    icono: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  },
];

export function CasosDeUso() {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.1);

  return (
    <section className="px-5 sm:px-8 py-24 sm:py-28">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <header className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary mb-4">
            {t('Para quién es')}
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 leading-tight">
            {t('Todo esto en una sola herramienta')}
          </h2>
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CASOS.map((c, i) => (
            <article
              key={c.titulo}
              className={`group card-hover p-7 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${
                i === CASOS.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''
              }`}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="h-12 w-12 rounded-2xl bg-primary/12 border border-primary/25 text-primary
                              flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Icono d={c.icono} className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-text-1">{t(c.titulo)}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-text-2">{t(c.desc)}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/explorar"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border-2
                       text-sm font-medium text-text-1 hover:bg-surface-2 hover:border-primary/40 transition-all"
          >
            {t('Ver un evento de ejemplo')}
            <Icono d={<path d="M5 12h14M13 6l6 6-6 6" />} className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   4 · VIDEO DE DEMOSTRACIÓN
   Cuando exista el video, basta con poner su URL de incrustación aquí
   (YouTube /embed/…, Vimeo /video/…) y la sección lo reproduce sola.
   ══════════════════════════════════════════════════════════════════ */
const VIDEO_DEMO_URL = '';

export function VideoDemo() {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.12);
  const [reproduciendo, setReproduciendo] = useState(false);

  return (
    <section className="px-5 sm:px-8 py-24 sm:py-28 border-y border-border bg-surface/25">
      <div className="max-w-4xl mx-auto" ref={ref}>
        <header className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary mb-4">Demo</p>
          <h2 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 leading-tight">
            {t('Míralo en dos minutos')}
          </h2>
          <p className="mt-5 text-base sm:text-lg text-text-2">
            {t('Un recorrido corto por la creación de un evento, la venta y el control de ingreso.')}
          </p>
        </header>

        <div
          className={`relative aspect-video rounded-3xl overflow-hidden border border-border-2
                      bg-sidebar shadow-card-hover transition-all duration-700
                      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {VIDEO_DEMO_URL && reproduciendo ? (
            <iframe
              src={`${VIDEO_DEMO_URL}${VIDEO_DEMO_URL.includes('?') ? '&' : '?'}autoplay=1`}
              title={t('Míralo en dos minutos')}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              {/* Resplandor de latón detrás del botón */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(30rem 18rem at 50% 45%, rgba(224,177,43,0.20), transparent 65%)',
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <button
                  type="button"
                  onClick={() => VIDEO_DEMO_URL && setReproduciendo(true)}
                  disabled={!VIDEO_DEMO_URL}
                  aria-label={t('Míralo en dos minutos')}
                  className="h-20 w-20 rounded-full bg-gradient-primary text-[#15171C] flex items-center
                             justify-center shadow-glow transition-transform enabled:hover:scale-105
                             disabled:opacity-70 disabled:cursor-default"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 ml-1" aria-hidden="true">
                    <path d="M8 5.5v13l11-6.5z" />
                  </svg>
                </button>

                {!VIDEO_DEMO_URL && (
                  <>
                    <p className="mt-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#F2D66B]">
                      {t('Video en camino')}
                    </p>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
                      {t('Estamos grabando el recorrido completo. Mientras tanto puedes crear tu evento y probarlo tú mismo.')}
                    </p>
                    <Link
                      to="/register"
                      className="mt-6 px-6 py-3 rounded-full text-sm font-semibold text-[#15171C]
                                 bg-gradient-primary shadow-glow-sm hover:shadow-glow transition-all"
                    >
                      {t('Empezar gratis')}
                    </Link>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   5 · INVENTARIO DE MÓDULOS
   La web contaba seis funciones cuando la plataforma tiene más de
   treinta construidas. Esta sección las lista agrupadas igual que el
   panel del evento, para que lo que se promete y lo que se abre al
   entrar sean la misma cosa.

   ⚠️ REGLA: aquí solo va lo que EXISTE y funciona. Lo que está en el
   plan pero no construido va en /producto con su marca de "Próximamente",
   nunca aquí.
   ══════════════════════════════════════════════════════════════════ */
const AREAS = [
  {
    area: 'Boletería y dinero',
    icono: <><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><path d="M2.5 10h19M6.5 14.5h4" /></>,
    items: [
      'Tipos de boleta, cupos y cortesías',
      'Proceso de compra configurable',
      'Cupones y promociones',
      'Pagos y conciliación',
      'Facturación',
      'Analítica de ventas por canal',
      'Lista de espera automática',
    ],
  },
  {
    area: 'Ingreso y acreditación',
    icono: <><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M4 12h16" /></>,
    items: [
      'Escaneo de QR desde el celular',
      'Escarapelas con campos e impresión propia',
      'Tarjeta del asistente en el teléfono',
      'Accesos, zonas y reingreso',
      'Puntos de control en stands',
      'Invitaciones nominadas',
    ],
  },
  {
    area: 'Experiencia del asistente',
    icono: <><path d="M12 3L2 8l10 5 10-5-10-5z" /><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" /></>,
    items: [
      'Editor de la página del evento',
      'Cualquier sección incrustable (eFrame)',
      'Mapa navegable del recinto',
      'Agenda por salas y horarios',
      'Rueda de negocios',
      'Torneos con llaves en vivo',
      'Ranking y puntos',
    ],
  },
  {
    area: 'Equipo y operación',
    icono: <><path d="M12 4.35a4 4 0 110 5.3M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.2M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></>,
    items: [
      'Roles con permisos por evento',
      'Tareas y seguimiento',
      'Sugerencias y solicitudes del equipo',
      'Documentos compartidos',
      'Chat por canales y anuncios',
      'Vacantes y contratación de personal',
      'Reporte post-evento',
    ],
  },
  {
    area: 'Marca y automatización',
    icono: <><path d="M4 20h16M6 16l4-8 4 8M8.5 13.5h3" /><path d="M16 8h4M18 6v4" /></>,
    items: [
      'Marca blanca: logo, colores y tipografía',
      'Correos del evento editables',
      'SEO de la página pública',
      'Automatizaciones por evento',
      'API de lectura y webhooks firmados',
      'Auditoría de acciones del equipo',
    ],
  },
];

export function InventarioModulos() {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.08);
  const total = AREAS.reduce((n, a) => n + a.items.length, 0);

  return (
    <section className="px-5 sm:px-8 py-24 sm:py-28 border-y border-border bg-surface/25">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <header className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary mb-4">
            {t('Lo que ya está construido')}
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 leading-tight">
            {t('{n} funciones, no una promesa', { n: total })}
          </h2>
          <p className="mt-5 text-base sm:text-lg text-text-2">
            {t('Todo lo de esta lista existe hoy y se abre al entrar. Lo que todavía está en el plan lo marcamos como tal en la página de producto.')}
          </p>
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {AREAS.map((a, i) => (
            <article
              key={a.area}
              className={`card p-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="h-10 w-10 flex-shrink-0 rounded-xl bg-primary/12 border border-primary/25
                                 text-primary flex items-center justify-center">
                  <Icono d={a.icono} className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold text-text-1 leading-snug">{t(a.area)}</h3>
              </div>
              <ul className="space-y-2.5">
                {a.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5 text-sm text-text-2">
                    <Icono d={<path d="M4 12.5l5 5L20 6.5" />} className="h-3.5 w-3.5 mt-1 flex-shrink-0 text-primary" />
                    {t(it)}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
