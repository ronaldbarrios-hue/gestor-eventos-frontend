import { Link } from 'react-router-dom';
import logoG from '../../assets/logo-g.svg';
import { useI18n, IDIOMAS } from '../../context/I18nContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import Icono from '../ui/Icono.jsx';

export default function PublicFooter() {
  const { t, lang, setLang } = useI18n();
  const { theme, setLight, setDark } = useTheme();

  return (
    <footer className="border-t border-border bg-surface/30">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <img src={logoG} alt="GESTEK" className="h-10 w-10" />
            <span className="text-2xl font-bold font-display tracking-tight text-text-1">GESTEK</span>
          </div>
          <p className="text-sm text-text-2 max-w-xs leading-relaxed">
            {t('La plataforma todo-en-uno para organizar, automatizar y escalar eventos profesionales.')}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-text-3 mb-3">{t('Plataforma')}</h4>
          <ul className="space-y-2">
            {[
              ['/como-funciona', 'Cómo funciona'],
              ['/producto',      'Producto'      ],
              ['/explorar',      'Explorar'      ],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="text-sm text-text-2 hover:text-text-1 transition-colors">{t(label)}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-text-3 mb-3">{t('Cuenta')}</h4>
          <ul className="space-y-2">
            <li><Link to="/login"    className="text-sm text-text-2 hover:text-text-1 transition-colors">{t('Iniciar sesión')}</Link></li>
            <li><Link to="/register" className="text-sm text-text-2 hover:text-text-1 transition-colors">{t('Registrarse')}</Link></li>
            <li><Link to="/faq"      className="text-sm text-text-2 hover:text-text-1 transition-colors">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-text-3 mb-3">{t('Legal')}</h4>
          <ul className="space-y-2">
            <li><Link to="/privacidad" className="text-sm text-text-2 hover:text-text-1 transition-colors">{t('Política de Privacidad')}</Link></li>
            <li><Link to="/terminos"   className="text-sm text-text-2 hover:text-text-1 transition-colors">{t('Términos del Servicio')}</Link></li>
          </ul>
        </div>
      </div>

      {/* ── Tema e idioma ──
          Estaban solo detrás del engranaje de abajo a la derecha: un botón de
          44px sin etiqueta, que además comparte esquina con el acompañante. En
          la práctica no se encontraban. Aquí están donde se buscan en cualquier
          sitio web, y el engranaje sigue existiendo para quien ya lo conoce. */}
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-3">{t('Tema')}</span>
              <div className="flex items-center gap-0.5 bg-surface-2 border border-border rounded-full p-0.5">
                <button onClick={setLight} aria-pressed={theme === 'light'} aria-label={t('Claro')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                    ${theme === 'light' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
                  <Icono name="sol" className="w-3.5 h-3.5" />{t('Claro')}
                </button>
                <button onClick={setDark} aria-pressed={theme === 'dark'} aria-label={t('Oscuro')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                    ${theme === 'dark' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
                  <Icono name="luna" className="w-3.5 h-3.5" />{t('Oscuro')}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-3">{t('Idioma')}</span>
              <div className="flex items-center gap-0.5 bg-surface-2 border border-border rounded-full p-0.5">
                {IDIOMAS.map(i => (
                  <button key={i.code} onClick={() => setLang(i.code)} aria-pressed={lang === i.code}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                      ${lang === i.code ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
                    {i.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-text-3">© {new Date().getFullYear()} GESTEK. {t('Organiza, automatiza y crece.')}</p>
            <p className="text-xs text-text-3">{t('Hecho en Ibagué, Colombia.')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
