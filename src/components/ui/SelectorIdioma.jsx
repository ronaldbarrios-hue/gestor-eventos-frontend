/* Interruptor de idioma — ES / EN, manual y explícito.
   Dos variantes: `pildora` (dos botones pegados, para la navbar) y
   `lista` (opciones apiladas, para menús y móvil). */

import { useI18n, IDIOMAS } from '../../context/I18nContext.jsx';

export default function SelectorIdioma({ variante = 'pildora', className = '' }) {
  const { lang, setLang, t } = useI18n();

  if (variante === 'lista') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs uppercase tracking-widest text-text-3 mr-auto">
          {t('Idioma')}
        </span>
        {IDIOMAS.map((i) => (
          <button
            key={i.code}
            onClick={() => setLang(i.code)}
            aria-pressed={lang === i.code}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
              lang === i.code
                ? 'bg-primary text-white border-primary'
                : 'border-border text-text-2 hover:text-text-1 hover:bg-surface-2'
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('Cambiar idioma')}
      className={`inline-flex items-center rounded-full border border-border p-0.5 bg-surface-2/60 ${className}`}
    >
      {IDIOMAS.map((i) => (
        <button
          key={i.code}
          onClick={() => setLang(i.code)}
          aria-pressed={lang === i.code}
          title={i.label}
          className={`px-2.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${
            lang === i.code
              ? 'bg-primary text-white shadow-glow-sm'
              : 'text-text-3 hover:text-text-1'
          }`}
        >
          {i.corto}
        </button>
      ))}
    </div>
  );
}
