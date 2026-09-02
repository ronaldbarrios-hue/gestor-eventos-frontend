import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext.jsx';
import { CORREO_CONTACTO } from '../../lib/enlacesPublicos.js';

/* Preguntas frecuentes.

   Las preguntas se guardan en español porque son las claves del diccionario.
   Van agrupadas: quien entra buscando "¿cuánto cuesta?" no debería tener que
   leer las de la API para encontrarla.

   Las respuestas dicen también lo que NO hacemos. Una página de preguntas
   que solo vende no responde nada, y el que pregunta acaba enterándose tarde
   y molesto. */

const GRUPOS = [
  {
    grupo: 'Empezar',
    preguntas: [
      {
        q: '¿Qué incluye GESTEK?',
        a: 'Todo lo necesario para operar un evento: creación con asistente paso a paso, página pública propia, asistentes ilimitados, boletas con QR, control de ingreso desde el celular, escarapelas, mapa del recinto, agenda, equipo con roles, chat, vacantes y reportes. Son más de treinta funciones y todas están construidas, no anunciadas.',
      },
      {
        q: '¿Necesito tarjeta de crédito para registrarme?',
        a: 'No. Crear la cuenta y montar tu primer evento no pide tarjeta ni datos de facturación. Solo pedimos medio de pago cuando tú decidas cobrar boletas, y ahí el dinero va a tu cuenta, no a la nuestra.',
      },
      {
        q: '¿Cuánto tarda montar un evento desde cero?',
        a: 'Entre cinco y diez minutos con el asistente de cuatro pasos: información general, espacios y accesos, identidad y marca, revisar y publicar. Puedes guardar como borrador y volver cuando quieras. Con Gestbot baja a un par de minutos porque te genera la estructura base y tú solo ajustas.',
      },
      {
        q: '¿Necesito instalar algo?',
        a: 'No. Todo corre en el navegador, incluido el escáner de QR, que usa la cámara del celular de tu coordinador. No hay aplicación que descargar ni equipo que comprar.',
      },
    ],
  },
  {
    grupo: 'Dinero',
    preguntas: [
      {
        q: '¿Cuánto cuesta GESTEK?',
        a: 'El plan gratuito cubre lo esencial para operar tus eventos, sin límite de asistentes. Algunas funciones adicionales dentro del evento se pagan por uso, y hay un plan de marca blanca para quien quiera quitar nuestro logo. Lo que veas marcado como "Próximamente" en Producto todavía no existe: lo decimos en vez de anunciarlo.',
      },
      {
        q: '¿Cobran comisión por las ventas?',
        a: 'No sobre la boleta. El pago va directo del asistente a tu cuenta a través de tu propia llave o código QR: GESTEK no toca ese flujo ni retiene el dinero. La única plata que cobramos es la comisión cuando contratas personal por el módulo de vacantes, y está a la vista antes de que aceptes.',
      },
      {
        q: '¿Cuándo recibo el dinero de mis ventas?',
        a: 'Cuando lo defina tu pasarela, no nosotros. Como el cobro es contra tu cuenta, los tiempos de acreditación son los del banco o la pasarela que conectes. Nosotros no somos un intermediario que retiene y luego gira.',
      },
      {
        q: '¿Puedo pasarme a otro plan o cancelar?',
        a: 'Sí, cuando quieras y sin llamadas de retención. Si cancelas, tus eventos y tus datos no se borran: siguen ahí y puedes exportarlos.',
      },
    ],
  },
  {
    grupo: 'Mi página y mi marca',
    preguntas: [
      {
        q: 'Ya tengo página web. ¿Me sirve GESTEK?',
        a: 'Sí, y no tienes que rehacer nada. Cualquier sección del evento se puede incrustar en tu web como un bloque: las boletas, el mapa del recinto, las llaves del torneo, la agenda. Copias un código, lo pegas donde quieras y el cobro nunca saca al visitante de tu página. Lo llamamos iFrame y está en el plan gratuito.',
      },
      {
        q: '¿Puedo quitar la marca GESTEK de la página de mi evento?',
        a: 'Sí, con el plan de marca blanca. Pones tu logo, tus colores, tu tipografía y tu pie de página, y el asistente nunca ve nuestro nombre. En el plan gratuito la página ya usa tu logo y tus colores, pero conserva una mención discreta a GESTEK.',
      },
      {
        q: '¿Los datos de mis asistentes son míos?',
        a: 'Sí. Son tuyos y los puedes exportar en CSV cuando quieras. No los vendemos, no los usamos para publicidad y no los cruzamos con los de otros organizadores.',
      },
    ],
  },
  {
    grupo: 'El día del evento',
    preguntas: [
      {
        q: '¿Qué pasa si se cae el internet en la puerta?',
        a: 'El escáner sigue funcionando. Guarda los ingresos en el propio celular y los sincroniza cuando vuelve la señal, así que la fila no se detiene. Es la parte que más nos importa que aguante: un evento no se puede quedar quieto esperando a que vuelva el wifi.',
      },
      {
        q: '¿Puedo controlar el ingreso en varias puertas a la vez?',
        a: 'Sí. Puedes tener varios puntos de control funcionando en simultáneo, cada uno con su coordinador y su celular, y ver el aforo consolidado en tiempo real. También puedes definir zonas con su propio cupo y reglas de reingreso.',
      },
      {
        q: '¿Puedo importar asistentes desde un Excel?',
        a: 'Sí. Subes un CSV con nombre y correo desde el panel del evento y la plataforma genera los códigos QR y las invitaciones. Sirve tanto para invitados como para listas que ya tenías de ediciones anteriores.',
      },
    ],
  },
  {
    grupo: 'Cuenta y técnico',
    preguntas: [
      {
        q: '¿Cómo confirmo mi cuenta o recupero mi contraseña?',
        a: 'Al registrarte te llega un correo con un enlace de confirmación; si no aparece en un par de minutos, revisa spam o pide el reenvío desde la pantalla de acceso. Para la contraseña, el enlace de "olvidé mi contraseña" en esa misma pantalla te manda un correo para cambiarla.',
      },
      {
        q: '¿GESTEK tiene API?',
        a: 'Sí, de lectura. Un token por organización te deja consultar tus eventos, asistentes y resumen. Además hay webhooks firmados que avisan a tu sistema cuando publicas un evento, cuando se paga una boleta y en cada check-in. La documentación con ejemplos está en camino y lo decimos así, sin adornarlo.',
      },
      {
        q: '¿En qué idiomas está?',
        a: 'Español e inglés, con un interruptor manual: no adivinamos por tu ubicación. Los textos legales se quedan solo en español a propósito, porque una traducción sin revisión de un abogado no puede tener el mismo valor que el original.',
      },
    ],
  },
];

const Icono = ({ d, className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{d}</svg>
);

export default function FAQPage() {
  const { t } = useI18n();
  /* Una sola abierta a la vez, identificada por su pregunta: los índices se
     desordenan al cambiar de grupo. */
  const [abierta, setAbierta] = useState(GRUPOS[0].preguntas[0].q);

  return (
    <section className="px-5 sm:px-8 py-12 max-w-3xl mx-auto">
      <header className="text-center mb-14">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">FAQ</p>
        <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 mb-3">
          {t('Preguntas frecuentes')}
        </h1>
        <p className="text-base text-text-2">{t('Si no encuentras tu respuesta, escríbenos.')}</p>
      </header>

      <div className="space-y-10">
        {GRUPOS.map((g) => (
          <div key={g.grupo}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-text-3 mb-4 pl-1">
              {t(g.grupo)}
            </h2>
            <div className="space-y-2.5">
              {g.preguntas.map((f) => {
                const esta = abierta === f.q;
                return (
                  <div key={f.q} className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
                    <button
                      onClick={() => setAbierta(esta ? null : f.q)}
                      aria-expanded={esta}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface/60 transition-colors"
                    >
                      <span className="text-[15px] sm:text-base font-medium text-text-1">{t(f.q)}</span>
                      <Icono d={<path d="M19 9l-7 7-7-7" />}
                             className={`w-4 h-4 text-text-2 transition-transform flex-shrink-0 ${esta ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`grid transition-all duration-300 ${esta ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <p className="px-5 pb-5 text-[15px] text-text-2 leading-relaxed">{t(f.a)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Buzon />
    </section>
  );
}

/* ─────────── Buzón de preguntas ───────────
   Abre el correo del visitante con el mensaje ya escrito. No hay bandeja
   propia todavía: montarla pide una tabla y un endpoint, y prometer un
   formulario que en realidad no guarda nada sería peor que esto. */
function Buzon() {
  const { t } = useI18n();
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState('pregunta');

  const TIPOS = [
    ['pregunta', 'Tengo una pregunta'],
    ['sugerencia', 'Tengo una sugerencia'],
  ];

  const asunto = tipo === 'pregunta' ? 'Pregunta sobre GESTEK' : 'Sugerencia para GESTEK';
  const enlace = `mailto:${CORREO_CONTACTO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`;
  const listo = texto.trim().length > 8;

  return (
    <div className="mt-16 rounded-3xl border border-border bg-surface/40 p-6 sm:p-8">
      <h2 className="text-xl font-bold font-display text-text-1 mb-1.5">
        {t('¿Se quedó algo sin responder?')}
      </h2>
      <p className="text-sm text-text-2 mb-5">
        {t('Escríbenos y lo respondemos. Si la pregunta se repite, termina en esta página.')}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {TIPOS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTipo(id)}
            aria-pressed={tipo === id}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tipo === id
                ? 'bg-primary text-white border-primary'
                : 'border-border text-text-2 hover:text-text-1 hover:bg-surface-2'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        maxLength={1200}
        className="input rounded-2xl py-3 text-sm resize-none w-full"
        placeholder={tipo === 'pregunta'
          ? t('Ej. ¿Puedo vender boletas para un evento en dos ciudades a la vez?')
          : t('Cuéntanos qué mejorarías o qué te faltó encontrar.')}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <p className="text-[11px] text-text-3">
          {t('Se abrirá tu programa de correo con el mensaje listo para enviar.')}
        </p>
        <a
          href={listo ? enlace : undefined}
          aria-disabled={!listo}
          onClick={(e) => { if (!listo) e.preventDefault(); }}
          className={`px-6 py-3 rounded-full text-sm font-semibold transition-all ${
            listo
              ? 'text-[#15171C] bg-gradient-primary shadow-glow-sm hover:shadow-glow'
              : 'bg-surface-3 text-text-3 cursor-not-allowed'
          }`}
        >
          {t('Enviar')}
        </a>
      </div>

      <p className="text-xs text-text-3 mt-5 pt-5 border-t border-border">
        {t('¿Prefieres verlo funcionando?')}{' '}
        <Link to="/explorar" className="text-primary hover:underline">{t('Mira los eventos publicados')}</Link>
        {' · '}
        <Link to="/como-funciona" className="text-primary hover:underline">{t('Cómo funciona')}</Link>
      </p>
    </div>
  );
}
