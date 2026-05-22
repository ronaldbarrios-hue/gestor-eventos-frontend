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

const GROUPS = {
  free: {
    label: 'Plan gratis',
    accent: 'primary',
    sections: [
      {
        cat: 'Eventos',
        icon: 'calendar',
        items: [
          'Eventos y asistentes ilimitados',
          'Wizard de creación de 4 pasos',
          'Presencial, virtual o híbrido',
          'Categorías, etiquetas, visibilidad pública o privada',
          'Página pública individual por evento',
          'Subpath gestek.io/tu-marca para tu organización',
        ],
      },
      {
        cat: 'Asistencia y boletas',
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
        icon: 'users',
        items: [
          'Multi-usuario con roles granulares',
          'Roles: admin, editor, lector',
          'Asignar permisos por evento',
          'Auth con Supabase + recuperación por correo',
        ],
      },
    ],
  },
  pro: {
    label: 'Plan Pro',
    accent: 'accent',
    sections: [
      {
        cat: 'API y webhooks',
        icon: 'code',
        items: [
          'API REST completa con API key',
          'Webhooks: inscripción, pago, check-in, cancelación',
          'Firmas HMAC + reintentos automáticos',
          'OpenAPI / Postman con ejemplos',
          'Rate limit 600 req/min',
        ],
      },
      {
        cat: 'Agente IA',
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
        icon: 'paint',
        items: [
          'Removible: sin marca GESTEK en tus páginas',
          'Tu propio logo en lugar del nuestro',
          'Personalización de colores y tipografía',
          'Plantillas de página pública premium',
          'Dominio personalizado (tudominio.com)',
        ],
      },
      {
        cat: 'Analítica avanzada',
        icon: 'chart',
        items: [
          'Cohortes de asistentes',
          'Atribución (fuente de inscripción)',
          'Retención entre ediciones',
          'Export programado a Google Sheets',
        ],
      },
      {
        cat: 'Operaciones',
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
        icon: 'bell',
        items: [
          'Web push notifications',
          'Personalizar plantillas de email',
          'Notificaciones segmentadas por audiencia',
        ],
      },
    ],
  },
};

export default function ProductoPage() {
  const [tab, setTab] = useState('free');
  const group = GROUPS[tab];
  return (
    <>
      <Hero tab={tab} setTab={setTab} />
      <Grid group={group} key={tab} />
      <Comparison />
      <CTA />
    </>
  );
}

function Hero({ tab, setTab }) {
  return (
    <section className="relative px-5 sm:px-8 pt-6 pb-12 max-w-5xl mx-auto text-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/8 blur-[160px] rounded-full" />
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/40 animate-[float_4s_ease-in-out_infinite]"
            style={{
              top: `${10 + (i * 7) % 80}%`,
              left: `${(i * 13) % 90}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <p className="relative text-sm uppercase tracking-widest text-primary-light font-semibold mb-4">Producto</p>
      <h1 className="relative text-5xl sm:text-6xl font-bold font-display tracking-tight text-text-1 leading-[1.05] mb-6">
        Todo lo que GESTEK ofrece
      </h1>
      <p className="relative text-lg text-text-2 max-w-2xl mx-auto leading-relaxed mb-10">
        Lo esencial siempre va incluido en el plan gratis. El plan Pro añade
        API, agente IA, white-label y dominio propio para los equipos que
        necesitan escalar y mantener su marca.
      </p>

      <div className="relative inline-flex items-center gap-1 p-1.5 rounded-full border border-border bg-surface/60 backdrop-blur">
        <button
          onClick={() => setTab('free')}
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
            tab === 'free' ? 'bg-text-1 text-bg shadow-card' : 'text-text-2 hover:text-text-1'
          }`}
        >
          Plan gratis
        </button>
        <button
          onClick={() => setTab('pro')}
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
            tab === 'pro' ? 'bg-gradient-to-r from-primary to-accent text-white shadow-card' : 'text-text-2 hover:text-text-1'
          }`}
        >
          Plan Pro
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${tab === 'pro' ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent-light'}`}>+IA · API</span>
        </button>
      </div>
    </section>
  );
}

function Grid({ group }) {
  return (
    <section className="px-5 sm:px-8 pb-20 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-[fadeUp_0.5s_ease_both]">
        {group.sections.map((s, i) => <FeatureCard key={s.cat} section={s} index={i} accent={group.accent} />)}
      </div>
    </section>
  );
}

function FeatureCard({ section, index, accent }) {
  const [ref, visible] = useReveal(0.1);
  const accentClass = accent === 'accent' ? 'text-accent-light' : 'text-primary-light';
  const accentBg = accent === 'accent' ? 'bg-accent/15 border-accent/25' : 'bg-primary/15 border-primary/25';
  const accentGlow = accent === 'accent' ? 'bg-accent/10' : 'bg-primary/10';
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 60}ms` }}
      className={`group relative p-6 rounded-3xl border border-border bg-surface/40 hover:bg-surface/70 hover:border-border-2 hover:-translate-y-1 transition-all duration-700 overflow-hidden
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl ${accentGlow} opacity-50 group-hover:opacity-100 transition-opacity`} />

      <div className={`relative w-11 h-11 rounded-2xl border flex items-center justify-center mb-5 ${accentBg} ${accentClass}`}>
        <FeatureIcon name={section.icon} />
      </div>
      <h3 className="relative text-lg font-bold font-display text-text-1 mb-4 flex items-center justify-between gap-3">
        <span>{section.cat}</span>
        <span className={`text-[10px] uppercase tracking-widest font-semibold ${accentClass} whitespace-nowrap`}>{section.items.length} funciones</span>
      </h3>
      <ul className="relative space-y-2.5">
        {section.items.map(item => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-text-1">
            <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${accentClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
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

function Comparison() {
  return (
    <section className="px-5 sm:px-8 py-20">
      <div className="relative max-w-4xl mx-auto rounded-3xl border border-border-2 bg-surface/40 backdrop-blur p-8 sm:p-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative text-center mb-10">
          <p className="text-sm uppercase tracking-widest text-accent-light font-semibold mb-3">Diferencia entre planes</p>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-text-1 leading-tight">
            ¿Cuándo deberías subir a Pro?
          </h2>
        </div>

        <div className="relative grid md:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl border border-border bg-bg/40">
            <p className="text-xs uppercase tracking-widest text-primary-light font-semibold mb-3">Quédate en Free si...</p>
            <ul className="space-y-2.5 text-sm text-text-1">
              {[
                'Manejas tus eventos sin integraciones externas',
                'No te molesta que tu URL sea gestek.io/tu-marca',
                'No necesitas el agente IA para crear eventos',
                'Tu equipo funciona bien con los roles incluidos',
              ].map(t => <li key={t} className="flex gap-2"><span className="text-primary-light mt-1">·</span>{t}</li>)}
            </ul>
          </div>
          <div className="p-6 rounded-2xl border border-accent/25 bg-accent/5">
            <p className="text-xs uppercase tracking-widest text-accent-light font-semibold mb-3">Sube a Pro si...</p>
            <ul className="space-y-2.5 text-sm text-text-1">
              {[
                'Necesitas conectar GESTEK con tu CRM, ERP o flujos automatizados',
                'Tu marca exige dominio propio sin referencias a GESTEK',
                'Quieres acelerar la creación de eventos con IA',
                'Necesitas analytics avanzados y auditoría del equipo',
              ].map(t => <li key={t} className="flex gap-2"><span className="text-accent-light mt-1">·</span>{t}</li>)}
            </ul>
          </div>
        </div>

        <p className="relative text-center text-sm text-text-3 mt-8">
          <Link to="/planes" className="underline underline-offset-2 hover:text-text-1 transition-colors">
            Ver comparativa completa con tabla detallada
          </Link>
        </p>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-5 sm:px-8 pb-24">
      <div className="relative max-w-3xl mx-auto text-center rounded-3xl border border-border-2 bg-gradient-to-br from-surface/80 to-surface/30 p-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/15 blur-[120px] rounded-full" />
        </div>
        <h2 className="relative text-3xl sm:text-4xl font-bold font-display tracking-tight text-text-1 mb-4">
          Pruébalo gratis hoy
        </h2>
        <p className="relative text-base sm:text-lg text-text-2 max-w-lg mx-auto mb-8">
          Sin tarjeta de crédito. Empieza con todo lo esencial activado.
        </p>
        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/register" className="px-8 py-4 rounded-full text-base font-semibold text-bg bg-text-1 hover:bg-white transition-all">
            Crear cuenta gratis
          </Link>
          <Link to="/planes" className="px-8 py-4 rounded-full text-base font-medium text-text-1 border border-border-2 hover:bg-surface-2 transition-colors">
            Ver planes
          </Link>
        </div>
      </div>
    </section>
  );
}
