import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

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

const STEPS = [
  {
    n: '01',
    title: 'Crea tu cuenta gratis',
    desc: 'Registro en 2 pasos. Datos básicos + perfil del organizador. Sin tarjeta de crédito, sin demos, sin esperas.',
    detail: 'Confirmas el email con un enlace de Supabase y entras directo al panel de organizador. Todo lo principal queda activado desde el segundo uno.',
  },
  {
    n: '02',
    title: 'Configura tu entorno de trabajo',
    desc: 'Cuéntanos en lenguaje natural qué tipo de eventos organizas. La IA Pro propone bloques iniciales según tu contexto; el plan gratis te lleva al wizard estándar.',
    detail: 'Industria, frecuencia, tamaño promedio, modalidad — el agente prepara plantillas, agenda base y copy de invitación. Tú ajustas, no empiezas en blanco.',
  },
  {
    n: '03',
    title: 'Crea el evento (wizard 4 pasos)',
    desc: 'Información general → Espacios y accesos → Identidad y marca → Revisión y publicar. Diseñado para no saltarse pasos críticos.',
    detail: 'Cada paso valida campos obligatorios y muestra preview de la card pública en tiempo real. Puedes guardar como borrador y volver cuando quieras.',
  },
  {
    n: '04',
    title: 'Comparte y vende boletas',
    desc: 'Tu evento tiene página pública propia (gestek.io/explorar/tu-evento). Botón de compra con BRE-B usando tu llave o QR de organizador.',
    detail: 'El dinero va directo a tu cuenta. GESTEK no toca el flujo de pago en el plan gratis. Recibos automáticos por email al asistente.',
  },
  {
    n: '05',
    title: 'Gestiona la asistencia con QR',
    desc: 'Cada inscrito recibe un QR único. Escanea en la entrada para check-in, escanea de nuevo para check-out. Métricas en tiempo real.',
    detail: 'Opción de check-in por estación si tienes varios accesos. Lista de espera automática cuando el cupo se llena.',
  },
  {
    n: '06',
    title: 'Activa gamificación y notificaciones',
    desc: 'Asigna puntos por asistencia, talleres, networking. Crea misiones. Manda recordatorios automáticos por email antes y durante el evento.',
    detail: 'Ranking visible en tiempo real, badges desbloqueables, recordatorios programados a T-7d, T-1d, T-1h. Todo configurable por evento.',
  },
  {
    n: '07',
    title: 'Mide, mejora, repite',
    desc: 'Panel con asistencia, ocupación, conversión, ingresos. Exporta a CSV. Conecta tu CRM con la API + webhooks.',
    detail: 'Analytics avanzados (cohortes, retención de asistentes, fuente de inscripción) llegan en plan Pro. El plan gratis trae lo esencial.',
  },
];

const USE_CASES = [
  {
    tag: 'Empresas y corporativos',
    title: 'Kick-off anual de 500 empleados con transporte y catering',
    points: [
      'Lista de inscritos por sede con QR único',
      'Encuesta previa al evento por email',
      'Check-in por sede con tablet o móvil del coordinador',
      'Gamificación entre equipos durante el evento',
    ],
    profile: 'Multinacional · 6 sedes · evento híbrido',
  },
  {
    tag: 'Universidades',
    title: 'Semana de innovación con 20 talleres simultáneos',
    points: [
      'Inscripción por taller con cupos limitados',
      'Check-in por sala con QR escaneado por el profesor',
      'Asistencia consolidada por estudiante (puntaje académico)',
      'Certificado descargable post-evento',
    ],
    profile: 'Universidad pública · 3.000 estudiantes · 5 días',
  },
  {
    tag: 'Comunidad / Meetups',
    title: 'Encuentro tech mensual con cobro simbólico de boleta',
    points: [
      'Página pública con agenda + speakers',
      'Cobro por BRE-B directo al organizador',
      'Recordatorio automático 24h antes',
      'Ranking de asistentes recurrentes (gamificación)',
    ],
    profile: 'Comunidad · 200 asistentes · mensual',
  },
  {
    tag: 'Festivales y conciertos',
    title: 'Festival de música con boletería propia y control de acceso',
    points: [
      'Venta de boletas con QR único por persona',
      'Control de acceso en varias puertas en simultáneo',
      'Webhook a tu CRM con cada venta',
      'White-label completo en plan Pro (sin logo GESTEK)',
    ],
    profile: 'Productora · 3.000 asistentes · 2 días',
  },
];

const FAQ_FLOW = [
  { q: '¿Cuánto tiempo tarda crear un evento desde cero?', a: 'Entre 5 y 10 minutos con el wizard. Con el agente IA Pro, baja a 1-2 minutos porque te genera la estructura base.' },
  { q: '¿Necesito instalar algo?', a: 'No. Todo corre en el navegador. El escáner de QR funciona desde la cámara del móvil de tu coordinador.' },
  { q: '¿Puedo importar asistentes de un Excel?', a: 'Sí — desde el panel del evento subes un CSV con nombre y email y la plataforma genera los QR e invitaciones.' },
];

export default function ComoFuncionaPage() {
  return (
    <>
      <Hero />
      <Flow />
      <UseCases />
      <Integrations />
      <MiniFAQ />
      <CTA />
    </>
  );
}

function Hero() {
  return (
    <section className="relative px-5 sm:px-8 pt-8 pb-16 max-w-5xl mx-auto text-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/10 blur-[140px] rounded-full animate-[glowPulse_6s_ease-in-out_infinite]" />
      </div>
      <p className="relative text-sm uppercase tracking-widest text-primary-light font-semibold mb-4">Cómo funciona</p>
      <h1 className="relative text-5xl sm:text-6xl font-bold font-display tracking-tight text-text-1 leading-[1.05] mb-6">
        De idea a evento publicado,<br />en <span className="bg-gradient-to-br from-primary-light to-accent-light bg-clip-text text-transparent">menos de una tarde</span>
      </h1>
      <p className="relative text-lg text-text-2 max-w-2xl mx-auto leading-relaxed">
        GESTEK guía cada paso del ciclo de vida del evento — desde la creación
        hasta el análisis post-evento — sin que tengas que ensamblar 5 herramientas distintas.
      </p>
      <div className="relative mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to="/register" className="px-7 py-3.5 rounded-full text-base font-semibold text-bg bg-text-1 hover:bg-white transition-all shadow-[0_0_40px_rgba(241,245,249,0.18)]">
          Probar gratis
        </Link>
        <Link to="/producto" className="px-7 py-3.5 rounded-full text-base font-medium text-text-1 border border-border-2 hover:bg-surface-2 transition-colors">
          Ver todas las funciones
        </Link>
      </div>
    </section>
  );
}

function Flow() {
  return (
    <section className="px-5 sm:px-8 py-20 max-w-5xl mx-auto">
      <div className="text-center mb-14">
        <p className="text-sm uppercase tracking-widest text-primary-light font-semibold mb-4">El flujo, paso a paso</p>
        <h2 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 leading-tight">
          7 pasos. Ninguno opcional, todos importan.
        </h2>
      </div>

      <div className="space-y-5">
        {STEPS.map((s, i) => <FlowStep key={s.n} step={s} index={i} />)}
      </div>
    </section>
  );
}

function FlowStep({ step, index }) {
  const [ref, visible] = useReveal(0.2);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 50}ms` }}
      className={`relative rounded-3xl border border-border bg-surface/40 hover:bg-surface/70 hover:border-border-2 transition-all duration-700 overflow-hidden
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className="grid lg:grid-cols-[auto_1fr_auto] gap-6 lg:gap-10 p-6 sm:p-8 items-start">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3 flex-shrink-0">
          <div className="text-5xl sm:text-6xl font-bold font-display bg-gradient-to-br from-primary-light to-accent-light bg-clip-text text-transparent leading-none">
            {step.n}
          </div>
          <div className="hidden lg:block w-10 h-px bg-border-2" />
        </div>
        <div>
          <h3 className="text-2xl font-bold font-display text-text-1 mb-3">{step.title}</h3>
          <p className="text-base text-text-2 leading-relaxed mb-3">{step.desc}</p>
          <p className="text-sm text-text-3 leading-relaxed">{step.detail}</p>
        </div>
        <span className="hidden lg:inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary-light tracking-wider uppercase whitespace-nowrap self-center">
          Plan gratis
        </span>
      </div>
    </div>
  );
}

function UseCases() {
  const [ref, visible] = useReveal();
  return (
    <section className="px-5 sm:px-8 py-24 bg-surface/20 border-y border-border">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <div className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-sm uppercase tracking-widest text-primary-light font-semibold mb-4">Casos de uso reales</p>
          <h2 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 leading-tight mb-4">
            Cómo lo usan en producción
          </h2>
          <p className="text-base sm:text-lg text-text-2 max-w-2xl mx-auto">
            Cuatro escenarios típicos donde GESTEK reemplaza la combinación habitual de Eventbrite + Mailchimp + Google Forms + Excel + Stripe.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {USE_CASES.map((c, i) => (
            <div
              key={c.title}
              style={{ transitionDelay: `${i * 100}ms` }}
              className={`p-7 rounded-3xl border border-border bg-bg/60 hover:bg-bg/80 hover:border-border-2 hover:-translate-y-1 transition-all duration-700
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            >
              <span className="inline-block text-xs uppercase tracking-widest text-accent-light font-semibold mb-3 px-3 py-1 rounded-full border border-accent/25 bg-accent/10">
                {c.tag}
              </span>
              <h3 className="text-xl font-semibold text-text-1 leading-snug mb-4">{c.title}</h3>
              <ul className="space-y-2.5 mb-5">
                {c.points.map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-text-2">
                    <svg className="w-4 h-4 mt-0.5 text-primary-light flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-3 pt-4 border-t border-border">{c.profile}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Integrations() {
  return (
    <section className="px-5 sm:px-8 py-24 max-w-5xl mx-auto text-center">
      <p className="text-sm uppercase tracking-widest text-primary-light font-semibold mb-4">Conecta con tu stack</p>
      <h2 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 leading-tight mb-5">
        Funciona con lo que ya usas
      </h2>
      <p className="text-base sm:text-lg text-text-2 max-w-xl mx-auto mb-12">
        API REST con autenticación por key y webhooks para todos los eventos. Sin reinventar tu CRM, tu correo o tu ERP.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['HubSpot', 'CRM'],
          ['Salesforce', 'CRM'],
          ['Mailchimp', 'Email'],
          ['Zapier', 'Automation'],
          ['n8n', 'Automation'],
          ['Make', 'Automation'],
          ['Slack', 'Notificaciones'],
          ['Google Sheets', 'Datos'],
        ].map(([name, cat]) => (
          <div key={name} className="p-5 rounded-2xl border border-border bg-surface/40 hover:bg-surface/70 transition-colors">
            <p className="text-base font-semibold text-text-1">{name}</p>
            <p className="text-xs text-text-3 mt-1 uppercase tracking-widest">{cat}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-text-3 mt-6">
        + cualquier herramienta que reciba webhooks HTTP. <Link to="/producto" className="underline hover:text-text-1">Ver docs de API</Link>
      </p>
    </section>
  );
}

function MiniFAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="px-5 sm:px-8 py-20 max-w-3xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-bold font-display text-text-1 text-center mb-10">
        Preguntas sobre el flujo
      </h2>
      <div className="space-y-3">
        {FAQ_FLOW.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
              <button onClick={() => setOpen(isOpen ? -1 : i)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface/60 transition-colors">
                <span className="text-base font-medium text-text-1">{f.q}</span>
                <svg className={`w-4 h-4 text-text-2 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                <p className="px-5 pb-5 text-base text-text-2 leading-relaxed">{f.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-5 sm:px-8 pb-28 pt-12">
      <div className="relative max-w-3xl mx-auto text-center rounded-3xl border border-border-2 bg-gradient-to-br from-surface/80 to-surface/30 p-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/15 blur-[120px] rounded-full" />
        </div>
        <h2 className="relative text-3xl sm:text-4xl font-bold font-display tracking-tight text-text-1 mb-4">
          Suficiente teoría
        </h2>
        <p className="relative text-base sm:text-lg text-text-2 max-w-lg mx-auto mb-8">
          Crea tu cuenta gratis y prueba el flujo con un evento de demo en menos de 5 minutos.
        </p>
        <Link to="/register" className="relative inline-block px-8 py-4 rounded-full text-base font-semibold text-bg bg-text-1 hover:bg-white transition-all">
          Crear cuenta gratis
        </Link>
      </div>
    </section>
  );
}
