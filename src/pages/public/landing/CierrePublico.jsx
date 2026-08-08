/* El cierre de las páginas públicas.

   Antes cada página remataba con una variante de "Pruébalo gratis hoy":
   la portada, Cómo funciona y Producto decían casi lo mismo tres veces, y
   al recorrer el sitio se sentía repetido en vez de rematado.

   Además hablaba a un solo público. Por GESTEK entran dos: quien organiza
   un evento y quien quiere trabajar en uno. El cierre les habla a ambos.

   Un solo componente para que no vuelvan a divergir. */

import { Link } from 'react-router-dom';
import { useI18n } from '../../../context/I18nContext.jsx';

export default function CierrePublico({ titulo, texto, className = '' }) {
  const { t } = useI18n();

  return (
    <section className={`px-5 sm:px-8 py-24 sm:py-28 ${className}`}>
      <div className="relative max-w-3xl mx-auto text-center rounded-3xl border border-border-2
                      bg-gradient-to-br from-surface/80 to-surface/30 p-10 sm:p-14 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/15 blur-[120px] rounded-full" />
        </div>

        <h2 className="relative text-3xl sm:text-4xl font-bold font-display tracking-tight text-text-1 leading-tight mb-4">
          {t(titulo || '¿Vas a organizar un evento o quieres trabajar en uno?')}
        </h2>
        <p className="relative text-base sm:text-lg text-text-2 max-w-xl mx-auto mb-9">
          {t(texto || 'Con la misma cuenta creas tu evento y vendes boletas, o armas tu perfil y te postulas a las vacantes que publican los organizadores.')}
        </p>

        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-semibold text-[#15171C]
                       bg-gradient-primary shadow-glow hover:scale-[1.02] transition-all"
          >
            {t('Crear mi cuenta')}
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-medium text-text-1
                       border border-border-2 hover:bg-surface-2 transition-colors"
          >
            {t('Ya tengo cuenta')}
          </Link>
        </div>

        <p className="relative mt-6 text-sm text-text-3">
          <Link to="/explorar" className="underline underline-offset-2 hover:text-text-2 transition-colors">
            {t('O mira primero qué eventos y vacantes hay ahora')}
          </Link>
        </p>
      </div>
    </section>
  );
}
