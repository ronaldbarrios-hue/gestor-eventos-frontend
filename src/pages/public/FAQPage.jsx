import { useState } from 'react';

const FAQS = [
  { q: '¿Qué incluye el plan gratis?', a: 'Todo lo esencial para operar eventos: creación, página pública, QR de asistencia, recordatorios por email, gamificación, API + webhooks y pasarela BRE-B. Sin límite artificial en lo principal.' },
  { q: '¿Qué agrega el plan Pro?', a: 'Comodidades y branding: agente IA que arma tus eventos según contexto, personalización de colores y tipografía, white-label (tu logo en vez de GESTEK), analytics avanzados y soporte prioritario.' },
  { q: '¿Cómo funciona la pasarela BRE-B?', a: 'Tú pegas tu llave o subes tu código QR de BRE-B en tu cuenta de organizador. Los pagos van directo a ti — GESTEK no toca ese dinero ni cobra comisión en el plan gratis.' },
  { q: '¿Necesito tarjeta de crédito para registrarme?', a: 'No. El plan gratis no requiere tarjeta. Solo registras correo y contraseña.' },
  { q: '¿Cómo confirmo mi cuenta?', a: 'Te enviamos un correo desde Supabase con un enlace de confirmación. Si no lo recibes en 2 minutos, revisa spam o solicita reenvío desde la pantalla de login.' },
  { q: '¿Olvidé mi contraseña, qué hago?', a: 'En la pantalla de login hay un enlace de "olvidé mi contraseña". Recibirás un correo con un enlace para restablecerla.' },
  { q: '¿Puedo migrar de gratis a Pro o cancelar?', a: 'Sí. Subes a Pro cuando lo necesites y cancelas cuando quieras. Si cancelas, tus eventos y datos no se pierden.' },
  { q: '¿GESTEK tiene API?', a: 'Sí, hay API REST completa con autenticación por API key y webhooks para inscripción, pago y check-in. Documentación con ejemplos disponible.' },
];

export default function FAQPage() {
  const [open, setOpen] = useState(0);
  return (
    <section className="px-5 sm:px-8 py-12 max-w-3xl mx-auto">
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-primary-light font-semibold mb-3">FAQ</p>
        <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 mb-3">
          Preguntas frecuentes
        </h1>
        <p className="text-base text-text-2">Si no encuentras tu respuesta, escríbenos.</p>
      </header>

      <div className="space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface/60 transition-colors"
              >
                <span className="text-sm sm:text-base font-medium text-text-1">{f.q}</span>
                <svg className={`w-4 h-4 text-text-2 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                <p className="px-5 pb-5 text-sm text-text-2 leading-relaxed">{f.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
