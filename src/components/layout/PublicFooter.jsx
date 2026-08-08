import { Link } from 'react-router-dom';
import logoG from '../../assets/logo-g.svg';
import { useI18n } from '../../context/I18nContext.jsx';

export default function PublicFooter() {
  const { t } = useI18n();

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

      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-text-3">© {new Date().getFullYear()} GESTEK. {t('Organiza, automatiza y crece.')}</p>
          <p className="text-xs text-text-3">{t('Hecho en Ibagué, Colombia.')}</p>
        </div>
      </div>
    </footer>
  );
}
