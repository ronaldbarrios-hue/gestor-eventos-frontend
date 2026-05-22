import { Link } from 'react-router-dom';
import logoG from '../../assets/logo-g.svg';

export default function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface/30">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <img src={logoG} alt="GESTEK" className="h-10 w-10" />
            <span className="text-2xl font-bold font-display tracking-tight text-text-1">GESTEK</span>
          </div>
          <p className="text-sm text-text-2 max-w-xs leading-relaxed">
            La plataforma todo-en-uno para organizar, automatizar y escalar eventos profesionales.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-text-3 mb-3">Plataforma</h4>
          <ul className="space-y-2">
            {[
              ['/como-funciona', 'Cómo funciona'],
              ['/producto',      'Producto'      ],
              ['/explorar',      'Explorar'      ],
              ['/planes',        'Planes'        ],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="text-sm text-text-2 hover:text-text-1 transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-text-3 mb-3">Cuenta</h4>
          <ul className="space-y-2">
            <li><Link to="/login"    className="text-sm text-text-2 hover:text-text-1 transition-colors">Iniciar sesión</Link></li>
            <li><Link to="/register" className="text-sm text-text-2 hover:text-text-1 transition-colors">Registrarse</Link></li>
            <li><Link to="/faq"      className="text-sm text-text-2 hover:text-text-1 transition-colors">FAQ</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-text-3">© {new Date().getFullYear()} GESTEK · Manage. Automate. Scale.</p>
          <p className="text-xs text-text-3">Hecho en Ibagué, Colombia.</p>
        </div>
      </div>
    </footer>
  );
}
