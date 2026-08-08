/* Componentes compartidos de las páginas legales (Privacidad y Términos).

   Estos textos NO se traducen: son el documento vinculante entre GESTEK y el
   usuario, y una traducción no revisada por un abogado no puede tener el
   mismo valor que el original. Cuando la app está en inglés se muestra un
   aviso que lo dice, en vez de fingir que hay una versión oficial. */

import { useI18n } from '../../context/I18nContext.jsx';

export function LegalLayout({ titulo, actualizada, children }) {
  const { lang } = useI18n();
  return (
    <section className="px-5 sm:px-8 py-14 max-w-3xl mx-auto">
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
