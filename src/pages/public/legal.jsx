/* Componentes compartidos de las páginas legales (Privacidad y Términos).

   Estos textos NO se traducen: son el documento vinculante entre GESTEK y el
   usuario, y una traducción no revisada por un abogado no puede tener el
   mismo valor que el original. Cuando la app está en inglés se muestra un
   aviso que lo dice, en vez de fingir que hay una versión oficial. */

import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext.jsx';

/* La vuelta.

   Aquí se llega casi siempre desde la mitad de otra cosa: creando la cuenta,
   marcando la casilla de aceptar. El navbar de arriba lleva a Inicio o a
   Explorar, que NO es de donde venías, y en la app instalada no hay botón de
   atrás del navegador. Resultado: te leías los términos y te quedabas sin
   forma de volver a terminar el registro.

   `location.key` vale 'default' cuando esta página es la primera de la
   sesión de navegación, es decir, cuando se llegó por enlace directo y no
   hay nada atrás. En ese caso volver atrás sacaría al usuario del sitio, así
   que se va a la portada. */
function Volver() {
  const navigate = useNavigate();
  const { key } = useLocation();
  const hayDeDondeVolver = key !== 'default';

  return (
    <button
      onClick={() => (hayDeDondeVolver ? navigate(-1) : navigate('/'))}
      className="inline-flex items-center gap-2 mb-8 -ml-1 px-3 py-2 rounded-xl text-sm text-text-2
                 hover:text-text-1 hover:bg-surface-2 transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      {hayDeDondeVolver ? 'Volver a donde estabas' : 'Ir al inicio'}
    </button>
  );
}

export function LegalLayout({ titulo, actualizada, children }) {
  const { lang } = useI18n();
  return (
    <section className="px-5 sm:px-8 py-14 max-w-3xl mx-auto">
      <Volver />
      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-primary-light font-semibold mb-3">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-text-1">{titulo}</h1>
        <p className="text-sm text-text-3 mt-2">Última actualización: {actualizada}</p>
      </header>

      {lang !== 'es' && (
        <div lang="en" className="mb-8 rounded-2xl border border-primary/30 bg-primary/8 px-5 py-4">
          <p className="text-sm text-text-1 font-semibold mb-1">This document is only binding in Spanish</p>
          <p className="text-sm text-text-2 leading-relaxed">
            The legal text below is kept in its original Spanish. A translation would not carry the
            same legal weight, so we do not publish one. If you need help understanding any clause,
            write to us and we will walk you through it.
          </p>
        </div>
      )}

      <div lang="es" className="space-y-8">{children}</div>
    </section>
  );
}

export function Seccion({ n, titulo, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold font-display text-text-1 mb-3">{n}. {titulo}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-text-2">{children}</div>
    </section>
  );
}

export function Lista({ items }) {
  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5"><span className="text-primary-light mt-0.5 flex-shrink-0">·</span><span>{it}</span></li>
      ))}
    </ul>
  );
}
