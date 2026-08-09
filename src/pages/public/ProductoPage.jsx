import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import CierrePublico from './landing/CierrePublico.jsx';
import { useI18n } from '../../context/I18nContext.jsx';

function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* Lo que trae GESTEK. Sin planes: la marca blanca no es un nivel que se
   compra, es el producto — la plataforma desaparece detrás de la marca del
   organizador desde el primer evento y sin pagar nada.

   Lo que sí se paga va aparte, al final, y se dice qué se cobra de verdad
   hoy y qué todavía no. */
const SECCIONES = [
      {
        cat: 'Eventos',
        ancla: 'eventos',
        icon: 'calendar',
        items: [
          'Asistentes ilimitados',
          'Wizard de creación de 4 pasos',
          'Presencial, virtual o híbrido',
          'Categorías, etiquetas, visibilidad pública o privada',
          'Página pública individual por evento',
          'Subpath gestek.io/tu-marca para tu organización',
        ],
      },
      {
        cat: 'Asistencia y boletas',
        ancla: 'asistencia',
        icon: 'qr',
        items: [
          'QR único de check-in / check-out',
          'Inscripciones e invitaciones masivas',
          'Cupos limitados con lista de espera',
          'Importar y exportar asistentes en CSV',
          'Página de compra con BRE-B',
        ],
      },
      {
        cat: 'Comunicación',
        ancla: 'comunicacion',
        icon: 'mail',
        items: [
          'Recordatorios automáticos por email',
          'Notificaciones de eventos in-app',
          'Confirmaciones de inscripción',
          'Recuperación de cuenta por correo',
        ],
      },
      {
        cat: 'Gamificación',
        ancla: 'gamificacion',
        icon: 'trophy',
        items: [
          'Puntos por asistencia y participación',
          'Badges desbloqueables',
          'Ranking entre asistentes en tiempo real',
          'Misiones configurables por evento',
        ],
      },
      {
        cat: 'Pagos BRE-B',
        ancla: 'pagos',
        icon: 'wallet',
        items: [
          'El organizador pega su llave o QR',
          'Cobro directo a la cuenta del organizador',
          'Sin comisión de plataforma',
          'Recibos automáticos al asistente',
          'Gestión manual de reembolsos',
        ],
      },
      {
        cat: 'Cuentas y equipo',
        ancla: 'equipo',
        icon: 'users',
        items: [
          'Multi-usuario con roles granulares',
          'Roles: admin, editor, lector',
          'Asignar permisos por evento',
          'Auth con Supabase + recuperación por correo',
        ],
      },
      {
        cat: 'API y webhooks',
        ancla: 'api',
        icon: 'code',
        items: [
          'API REST de solo lectura con token Bearer',
          'Webhooks: evento publicado, boleta pagada y check-in',
          'Firma HMAC-SHA256 y reintento automático',
          { texto: 'OpenAPI / Postman con ejemplos', proximamente: true },
          { texto: 'Límite de peticiones por token', proximamente: true },
        ],
      },
      {
        cat: 'Agente IA',
        ancla: 'gestbot',
        icon: 'sparkles',
        items: [
          'Crea bloques iniciales de evento por contexto',
          'Sugiere agenda, copy y configuración',
          'Asistencia conversacional para editar eventos',
          'Análisis automático de feedback post-evento',
        ],
      },
      {
        cat: 'White-label y branding',
        ancla: 'white-label',
        icon: 'paint',
        items: [
          'Removible: sin marca GESTEK en tus páginas',
          'Tu propio logo en lugar del nuestro',
          'Personalización de colores y tipografía',
          'Plantillas de página pública premium',
          { texto: 'Dominio personalizado (tudominio.com)', proximamente: true },
        ],
      },
      {
        cat: 'Analítica avanzada',
        ancla: 'analitica',
        icon: 'chart',
        items: [
          { texto: 'Cohortes de asistentes', proximamente: true },
          { texto: 'Atribución (fuente de inscripción)', proximamente: true },
          { texto: 'Retención entre ediciones', proximamente: true },
          { texto: 'Export programado a Google Sheets', proximamente: true },
        ],
      },
      {
        cat: 'Operaciones',
        ancla: 'operaciones',
        icon: 'shield',
        items: [
          'Auditoría completa del equipo',
          'Soporte prioritario con SLA de 4h',
          'Onboarding 1:1',
          'Acuerdo DPA bajo solicitud',
        ],
      },
      {
        cat: 'Comunicación avanzada',
        ancla: 'comunicacion-avanzada',
        icon: 'bell',
        items: [
          'Web push notifications',
          'Personalizar plantillas de email',
          'Notificaciones segmentadas por audiencia',
        ],
      },
];

/* Una frase por módulo, para que cada sección diga QUÉ resuelve antes de
   soltar la lista de lo que trae. Una lista de viñetas sin encabezado se lee
   como un inventario; la frase es lo que la convierte en una promesa.

   Van en un mapa aparte y no dentro de SECCIONES para no reescribir la lista
   de funciones, que es la que se mantiene cuando se añade algo. */
const RESUMENES = {
  'eventos':              'Un evento único o una convención con decenas de actividades dentro. El wizard de cuatro pasos no te deja saltarte lo que después echarías de menos.',
  'asistencia':           'Cada inscrito recibe su QR. Se escanea al entrar, se escanea al salir, y las cifras se mueven mientras la puerta sigue funcionando.',
  'comunicacion':         'El asistente recibe lo que necesita cuando lo necesita, sin que tengas que acordarte de mandarlo.',
  'gamificacion':         'Puntos, misiones y ranking para que la gente recorra el evento en vez de quedarse sentada en una sala.',
  'pagos':                'El dinero va directo a tu cuenta. GESTEK no toca el flujo de pago ni se queda una comisión sobre tus boletas.',
  'equipo':               'Quien monta el evento casi nunca es quien lo opera el día de la puerta. Cada quien entra a lo suyo y a nada más.',
  'api':                  'Si ya tienes sistemas funcionando, el evento se conecta a ellos en vez de vivir aparte y obligarte a copiar datos a mano.',
  'gestbot':              'Gestbot arranca el evento a partir de una frase tuya, y se queda para editarlo cuando le hables.',
  'white-label':          'La plataforma desaparece detrás de tu marca. No es un nivel que se compra: viene puesto desde el primer evento.',
  'analitica':            'Lo que pasó, puesto al lado de lo que pasó la vez anterior. Sin eso, cada edición empieza de cero.',
  'operaciones':          'Lo que hace falta cuando el evento deja de ser tuyo solo y pasa a ser de un equipo que responde ante alguien.',
  'comunicacion-avanzada':'Para cuando el correo ya no alcanza y hay que llegar a un grupo concreto en el momento justo.',
};

/* Las capturas de cada módulo.

   Está vacío a propósito. Cuando haya capturas reales del producto se dejan
   en `public/producto/` y se apuntan aquí por ancla:

       'eventos': '/producto/eventos.png',

   Mientras no las haya, cada sección dibuja un marco abstracto con el color
   de la marca. Es deliberado que se vea abstracto y no una captura falsa: una
   pantalla inventada promete algo que el producto todavía no enseña, y eso se
   descubre justo cuando alguien se decide a probarlo. */
const IMAGENES = {};

/* Cobros dentro del evento. No es un plan: es lo que se paga por uso, y un
   evento se opera de principio a fin sin tocar nada de aquí. */
const SECCIONES_PAGOS = [
      {
        cat: 'Cómo funciona',
        ancla: 'pagos-como',
        icon: 'wallet',
        items: [
          'Sin suscripción ni mensualidad: pagas solo lo que uses',
          'El precio se ve antes de confirmar, nunca después',
          'Cada cobro queda registrado y consultable en tu panel',
          'Si no usas nada de aquí, no pagas nada',
        ],
      },
      {
        cat: 'Contratación de personal',
        ancla: 'pagos-vacantes',
        icon: 'users',
        items: [
          'Publicar vacantes y recibir postulaciones: sin costo',
          'Comisión sobre el contrato al contratar a alguien',
          { texto: 'Destacar una vacante para que aparezca primero', proximamente: true },
          { texto: 'Verificación de identidad del candidato', proximamente: true },
        ],
      },
      {
        cat: 'Asistente y envíos',
        ancla: 'pagos-agente',
        icon: 'sparkles',
        items: [
          'Gestbot responde y ejecuta acciones en tu evento',
          { texto: 'Paquetes de uso del asistente', proximamente: true },
          { texto: 'Envíos masivos por encima del cupo incluido', proximamente: true },
        ],
      },
];

export default function ProductoPage() {
  /* Al llegar con #ancla desde la portada hay que desplazar después de
     pintar. Se resalta un momento porque caer a media página sin más deja
     al lector sin saber qué vino a ver. */
  useEffect(() => {
    let id;
    const ir = () => {
      const ancla = window.location.hash.slice(1);
      if (!ancla) return;
      id = setTimeout(() => {
        const el = document.getElementById(ancla);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-primary/60');
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary/60'), 2400);
      }, 260);
    };

    ir();
    /* También al cambiar el hash estando ya aquí. Antes solo corría al montar,
       así que un enlace a otra sección desde dentro de la propia página
       cambiaba la barra de direcciones y no movía nada. */
    window.addEventListener('hashchange', ir);
    return () => { clearTimeout(id); window.removeEventListener('hashchange', ir); };
  }, []);

  return (
    <>
      <Hero />
      <Modulos />
      <Pagos />
      <CierrePublico />
    </>
  );
}

function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative px-5 sm:px-8 pt-6 pb-14 max-w-5xl mx-auto text-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/8 blur-[160px] rounded-full" />
      </div>

      <p className="relative text-sm uppercase tracking-widest text-primary font-semibold mb-4">{t('Producto')}</p>
      <h1 className="relative text-5xl sm:text-6xl font-bold font-display tracking-tight text-text-1 leading-[1.05] mb-6">
        {t('Todo lo que GESTEK ofrece')}
      </h1>
      <p className="relative text-lg text-text-2 max-w-2xl mx-auto leading-relaxed">
        {t('Un solo plan, gratuito. La marca blanca no es un nivel que se compra: desde tu primer evento la plataforma desaparece detrás de tu marca, con tu logo, tus colores y tu dominio.')}
      </p>

      <div className="relative mt-9 inline-flex flex-wrap justify-center items-center gap-2">
        {[
          ['Sin mensualidad', 'wallet'],
          ['Sin límite de asistentes', 'users'],
          ['Con tu marca desde el día uno', 'paint'],
        ].map(([texto, icono]) => (
          <span key={texto} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/25
                                       bg-primary/8 text-sm font-medium text-text-1">
            <span className="text-primary"><FeatureIcon name={icono} /></span>
            {t(texto)}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ─────────── Lo que se paga por uso ─────────── */
function Pagos() {
  const { t } = useI18n();
  return (
    <section id="pagos-internos" className="px-5 sm:px-8 py-20 border-t border-border bg-surface/25">
      <div className="max-w-6xl mx-auto">
        <header className="max-w-2xl mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary mb-4">
            {t('Lo único que se paga')}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-text-1 leading-tight">
            {t('Cobros dentro del evento')}
          </h2>
          <p className="mt-4 text-base text-text-2 leading-relaxed">
            {t('Se cobra por uso, nunca por mes. Un evento se opera de principio a fin sin tocar nada de esto: aquí solo está lo que a nosotros nos cuesta cada vez que se usa y lo que le da ventaja a un organizador sobre otro.')}
          </p>
        </header>

        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/8 px-5 py-4 max-w-3xl">
          <p className="text-sm text-text-1 font-semibold mb-1">{t('Todavía no cobramos nada de esto')}</p>
          <p className="text-sm text-text-2 leading-relaxed">
            {t('El modelo está construido y cada cobro se registra, pero la pasarela aún no está conectada. Preferimos decirlo a que te enteres cuando te llegue una factura que no esperabas.')}
          </p>
        </div>

        <Rejilla secciones={SECCIONES_PAGOS} sinMargen />
      </div>
    </section>
  );
}

/* ─────────── Los módulos, uno por sección ───────────

   Antes esto era una rejilla de doce tarjetas iguales. Doce cosas del mismo
   tamaño y con el mismo peso no se leen: se hojean, y nadie se detiene en
   ninguna. Ahora cada módulo tiene su franja, su frase y su visual, y el lado
   por el que entra el visual va alternando para que el ojo tenga que cruzar
   la página en vez de bajar por un carril.

   El número grande de cada sección no es adorno: da idea de cuánto queda y
   convierte una lista larga en un recorrido con principio y final. */
function Modulos() {
  return (
    <div className="pb-4">
      {SECCIONES.map((s, i) => (
        <Modulo key={s.ancla} seccion={s} indice={i} />
      ))}
    </div>
  );
}

function Modulo({ seccion, indice }) {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.12);
  const derecha = indice % 2 === 1;       // el visual alterna de lado
  const resumen = RESUMENES[seccion.ancla];
  const imagen = IMAGENES[seccion.ancla];

  return (
    <section
      id={seccion.ancla}
      ref={ref}
      className={`px-5 sm:px-8 py-14 sm:py-20 scroll-mt-24 rounded-3xl transition-all duration-700
                  ${indice % 2 === 1 ? 'bg-surface/25' : ''}
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className={`max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center
                       ${derecha ? 'lg:[&>*:first-child]:order-2' : ''}`}>
        {/* ── El texto ── */}
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex-shrink-0 w-11 h-11 rounded-2xl border border-primary/30 bg-primary/10
                             flex items-center justify-center text-primary">
              <FeatureIcon name={seccion.icon} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-3 tabular-nums">
              {String(indice + 1).padStart(2, '0')} / {String(SECCIONES.length).padStart(2, '0')}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-text-1 leading-tight">
            {t(seccion.cat)}
          </h2>

          {resumen && (
            <p className="mt-4 text-base sm:text-lg text-text-2 leading-relaxed max-w-xl">
              {t(resumen)}
            </p>
          )}

          <ul className="mt-7 space-y-2.5">
            {seccion.items.map((item, k) => {
              const texto = typeof item === 'string' ? item : item.texto;
              const proximamente = typeof item === 'object' && item.proximamente;
              return (
                <li key={k} className="flex items-start gap-3">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                       className={`mt-1 flex-shrink-0 ${proximamente ? 'text-text-3' : 'text-primary'}`}
                       aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className={`text-[15px] leading-snug ${proximamente ? 'text-text-3' : 'text-text-1'}`}>
                    {t(texto)}
                    {/* Lo que aún no existe se dice, no se disimula. Descubrir
                        que una función prometida no está es lo que rompe la
                        confianza en todo lo demás de la página. */}
                    {proximamente && (
                      <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wider
                                       px-1.5 py-0.5 rounded border border-border text-text-3">
                        {t('Próximamente')}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── El visual ── */}
        <Lienzo imagen={imagen} titulo={t(seccion.cat)} icono={seccion.icon} />
      </div>
    </section>
  );
}

/* El hueco de la captura.

   Con imagen, la enseña dentro de un marco de ventana. Sin imagen, dibuja una
   composición abstracta con el latón de la marca: una barra de ventana y unos
   bloques que sugieren una pantalla sin fingir ser ninguna.

   Es a propósito que se vea abstracto. Dibujar una interfaz de mentira aquí
   sería prometer una pantalla que el producto todavía no enseña, y eso se
   descubre justo cuando alguien se decide a probarlo. */
function Lienzo({ imagen, titulo, icono }) {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-primary/8 blur-3xl rounded-full pointer-events-none" />

      <div className="relative rounded-2xl border border-border-2 bg-surface/70 backdrop-blur overflow-hidden shadow-card">
        {/* La barra de la ventana, en los dos casos: es lo que hace que el
            contenido se lea como "pantalla de producto" y no como ilustración. */}
        <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-border bg-surface-2/60">
          <span className="w-2.5 h-2.5 rounded-full bg-text-3/30" />
          <span className="w-2.5 h-2.5 rounded-full bg-text-3/30" />
          <span className="w-2.5 h-2.5 rounded-full bg-text-3/30" />
          <span className="ml-2 text-[10px] text-text-3 tracking-wide truncate">{titulo}</span>
        </div>

        {imagen ? (
          <img src={imagen} alt={titulo} loading="lazy" decoding="async"
               className="w-full block" />
        ) : (
          <div className="aspect-[16/11] p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25
                               flex items-center justify-center text-primary flex-shrink-0">
                <FeatureIcon name={icono} />
              </span>
              <span className="h-2.5 rounded-full bg-text-3/20 flex-1 max-w-[45%]" />
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2.5 mt-1">
              <div className="rounded-xl bg-gradient-to-br from-primary/12 to-transparent border border-border" />
              <div className="rounded-xl bg-surface-2/70 border border-border" />
              <div className="rounded-xl bg-surface-2/40 border border-border" />
            </div>
            <div className="space-y-2">
              <span className="block h-2 rounded-full bg-text-3/15 w-[70%]" />
              <span className="block h-2 rounded-full bg-text-3/10 w-[45%]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Rejilla({ secciones, sinMargen = false }) {
  return (
    <section className={sinMargen ? '' : 'px-5 sm:px-8 pb-20 max-w-6xl mx-auto'}>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-[fadeUp_0.5s_ease_both]">
        {secciones.map((s, i) => <FeatureCard key={s.cat} section={s} index={i} accent="primary" />)}
      </div>
    </section>
  );
}

function FeatureCard({ section, index, accent }) {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.1);
  const accentClass = accent === 'accent' ? 'text-accent-light' : 'text-primary-light';
  const accentBg = accent === 'accent' ? 'bg-accent/15 border-accent/25' : 'bg-primary/15 border-primary/25';
  const accentGlow = accent === 'accent' ? 'bg-accent/10' : 'bg-primary/10';
  return (
    <div
      ref={ref}
      id={section.ancla}
      style={{ transitionDelay: `${index * 60}ms` }}
      className={`group relative p-6 rounded-3xl border border-border bg-surface/40 hover:bg-surface/70 hover:border-border-2 hover:-translate-y-1 transition-all duration-700 overflow-hidden
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl ${accentGlow} opacity-50 group-hover:opacity-100 transition-opacity`} />

      <div className={`relative w-11 h-11 rounded-2xl border flex items-center justify-center mb-5 ${accentBg} ${accentClass}`}>
        <FeatureIcon name={section.icon} />
      </div>
      <h3 className="relative text-lg font-bold font-display text-text-1 mb-4 flex items-center justify-between gap-3">
        <span>{t(section.cat)}</span>
        {(() => {
          /* El contador cuenta solo lo que ya funciona. Si un área todavía
             no tiene nada construido, decirlo — "0 funciones" se lee como
             un error, no como una etapa del plan. */
          const listas = section.items.filter(i => typeof i === 'string').length;
          return (
            <span className={`text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap ${listas ? accentClass : 'text-text-3'}`}>
              {!listas ? t('En construcción') : listas === 1 ? t('1 función') : t('{n} funciones', { n: listas })}
            </span>
          );
        })()}
      </h3>
      <ul className="relative space-y-2.5">
        {section.items.map(item => {
          /* Un item puede ser texto (ya funciona) u objeto con
             `proximamente` (está en el plan pero todavía no existe). Se
             marca en vez de anunciarlo como si estuviera listo. */
          const texto = typeof item === 'string' ? item : item.texto;
          const pendiente = typeof item !== 'string' && item.proximamente;
          return (
            <li key={texto} className={`flex items-start gap-2.5 text-sm ${pendiente ? 'text-text-3' : 'text-text-1'}`}>
              {pendiente ? (
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7.5V12l3 2" />
                </svg>
              ) : (
                <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${accentClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span>
                {t(texto)}
                {pendiente && (
                  <span className="ml-2 text-[10px] uppercase tracking-widest text-text-3 whitespace-nowrap">
                    {t('Próximamente')}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FeatureIcon({ name }) {
  const props = { className: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.8 };
  switch (name) {
    case 'calendar': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    case 'qr':       return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" /></svg>;
    case 'mail':     return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
    case 'trophy':   return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5 4h14v4a5 5 0 01-10 0M9 8a5 5 0 01-5-5V3h4M15 8a5 5 0 005-5V3h-4M12 13v4M8 21h8M10 17h4" /></svg>;
    case 'wallet':   return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8zM3 8l3-4h12l3 4M16 13h2" /></svg>;
    case 'users':    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
    case 'code':     return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
    case 'sparkles': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
    case 'paint':    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>;
    case 'chart':    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
    case 'shield':   return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
    case 'bell':     return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
    default:         return null;
  }
}

