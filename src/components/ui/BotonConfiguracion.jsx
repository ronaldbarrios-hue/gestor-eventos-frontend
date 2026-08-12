/* Configuración del sitio público — un solo lugar para tema e idioma.

   Antes el idioma se ofrecía en la navbar Y en el globo del bot: dos
   controles para lo mismo, en dos sitios, sin relación entre ellos. Ahora
   vive aquí, en un botón discreto abajo a la derecha, y el cordón de la
   lámpara del bot sigue siendo el atajo divertido para el tema.

   Se queda fuera de la navbar a propósito: no es navegación, es preferencia
   del visitante, y la navbar ya tiene su trabajo. */

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Link } from 'react-router-dom';
import { useI18n, IDIOMAS } from '../../context/I18nContext.jsx';

/* Envoltorio de un trazo suelto: recibe el <path> ya escrito y le pone el
   <svg> con las medidas del sistema. Se llama Trazo y no Icono para no chocar
   con components/ui/Icono.jsx, que es el registro con nombres
   (<Trazo name="trofeo" />). Este de aquí no tiene registro: dibuja lo que le
   pasen. */
const Trazo = ({ d, className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {d}
  </svg>
);

const ENGRANAJE = (
  <>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.33-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 8.87 4.7 1.6 1.6 0 0 0 9.87 3.23V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9v.09a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </>
);
const SOL = (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
);
const LUNA = <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />;

export default function BotonConfiguracion() {
  const { theme, setLight, setDark } = useTheme();
  const { t, lang, setLang } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const [verDatos, setVerDatos] = useState(false);
  const raiz = useRef(null);

  /* Cerrar al hacer clic fuera o con Escape — lo que espera cualquiera
     de un menú flotante. */
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (raiz.current && !raiz.current.contains(e.target)) setAbierto(false); };
    const tecla = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const opcionesTema = [
    { id: 'light', label: 'Claro',  icono: SOL,  aplicar: setLight },
    { id: 'dark',  label: 'Oscuro', icono: LUNA, aplicar: setDark  },
  ];

  return (
    /* El acompañante también vive en bottom-5 right-5: sin separarlos se
     pisaban y el engranaje quedaba indistinguible. */
    <div ref={raiz} className="fixed bottom-5 right-5 lg:bottom-[76px] z-50">
      {abierto && (
        <div
          role="dialog"
          aria-label={t('Configuración')}
          className="absolute bottom-[calc(100%+10px)] right-0 w-[236px] rounded-2xl border border-border
                     bg-surface/95 backdrop-blur-xl shadow-card-hover p-3.5
                     animate-[scaleIn_0.16s_ease_both] origin-bottom-right"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-3 mb-2">
            {t('Apariencia')}
          </p>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {opcionesTema.map((o) => (
              <button
                key={o.id}
                onClick={o.aplicar}
                aria-pressed={theme === o.id}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium border transition-colors ${
                  theme === o.id
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-text-2 hover:text-text-1 hover:bg-surface-2'
                }`}
              >
                <Trazo d={o.icono} className="h-4 w-4" />
                {t(o.label)}
              </button>
            ))}
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-3 mb-2">
            {t('Idioma')}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {IDIOMAS.map((i) => (
              <button
                key={i.code}
                onClick={() => setLang(i.code)}
                aria-pressed={lang === i.code}
                className={`py-2 rounded-xl text-[13px] font-medium border transition-colors ${
                  lang === i.code
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-text-2 hover:text-text-1 hover:bg-surface-2'
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>

          {/* ── Qué guardamos ──
              No hay banner de cookies porque no hay nada que consentir: no
              usamos analítica, ni píxeles, ni rastreadores de terceros. Lo
              que se guarda es lo imprescindible para que la página funcione
              como la dejaste, y eso no pide permiso — pide que se diga. Un
              banner de "aceptar cookies" sin cookies que aceptar sería un
              trámite falso. */}
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setVerDatos((v) => !v)}
              aria-expanded={verDatos}
              className="w-full flex items-center justify-between gap-2 text-[11px] text-text-3 hover:text-text-2 transition-colors"
            >
              {t('Qué guardamos en tu navegador')}
              <Trazo d={<path d="M19 9l-7 7-7-7" />}
                     className={`h-3 w-3 transition-transform ${verDatos ? 'rotate-180' : ''}`} />
            </button>

            {verDatos && (
              <div className="mt-2.5 animate-[fadeIn_0.2s_ease_both]">
                <p className="text-[11px] text-text-2 leading-relaxed">
                  {t('Solo lo necesario para que la página funcione como la dejaste: el tema, el idioma y tu sesión si entras. Sin analítica, sin píxeles y sin rastreadores de terceros, así que no te pedimos aceptar cookies.')}
                </p>
              </div>
            )}

            {/* Los dos documentos, siempre a la vista.

                Estaban escondidos: la privacidad solo aparecía si desplegabas
                "Qué guardamos", y los términos no estaban en ninguna parte
                salvo dentro del registro. Buscar las condiciones de un
                servicio es algo que se hace de forma deliberada, y el sitio
                donde se busca es la rueda de ajustes. Que cueste encontrarlos
                no es discreción, es mala señal. */}
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <Link
                to="/privacidad"
                onClick={() => setAbierto(false)}
                className="text-center py-1.5 rounded-lg text-[11px] border border-border
                           text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors"
              >
                {t('Privacidad')}
              </Link>
              <Link
                to="/terminos"
                onClick={() => setAbierto(false)}
                className="text-center py-1.5 rounded-lg text-[11px] border border-border
                           text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors"
              >
                {t('Términos')}
              </Link>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label={t('Configuración')}
        aria-expanded={abierto}
        className={`h-11 w-11 rounded-full border bg-surface/90 backdrop-blur shadow-card
                    flex items-center justify-center transition-all
                    ${abierto ? 'border-primary text-primary rotate-45' : 'border-border text-text-2 hover:text-text-1 hover:border-primary/50'}`}
      >
        <Trazo d={ENGRANAJE} className="h-[19px] w-[19px]" />
      </button>
    </div>
  );
}
