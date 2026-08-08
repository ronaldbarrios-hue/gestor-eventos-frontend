import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import PublicNavbar from './PublicNavbar.jsx';
import PublicFooter from './PublicFooter.jsx';
import SideDecorations from './SideDecorations.jsx';
import Acompanante from '../agente/Acompanante.jsx';

export default function PublicLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [animKey, setAnimKey] = useState(pathname);
  const { theme } = useTheme();

  useEffect(() => {
    setAnimKey(pathname);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  /* Listado de exploración (/explorar, sin slug): sin navbar genérica de GESTEK,
     pero SÍ con un link discreto de vuelta al dashboard del organizador. */
  const esListadoExplorar = /^\/(app\/)?explorar\/?$/.test(pathname);
  /* Página pública de un evento individual (/explorar/algun-evento), incluyendo
     sus sub-rutas como Rueda de Negocios o Torneo (/explorar/algun-evento/networking,
     /explorar/algun-evento/torneo): marca blanca total del organizador, sin
     ningún rastro de GESTEK. */
  const esPaginaEvento = /^\/(app\/)?explorar\/[^/]+(\/.*)?$/.test(pathname) && !esListadoExplorar;
  /* Página pública de una boleta (/mi-ticket/:codigo): tampoco debe mostrar
     la barra de GESTEK con "Iniciar sesión/Registrarse" — solo un botón
     simple de "Volver". */
  const esPaginaTicket = /^\/mi-ticket\/[^/]+$/.test(pathname);
  const esPaginaExplorar = esListadoExplorar || esPaginaEvento || esPaginaTicket;

  /* Las páginas de marca blanca (evento del organizador, boleta) siguen
     viviendo en oscuro: su diseño se armó sobre fondo profundo y ahí la
     marca que manda no es la nuestra. Las páginas de GESTEK sí respetan
     la preferencia del usuario — es la luz que el bot enciende y apaga. */
  useEffect(() => {
    if (!esPaginaExplorar) {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      return undefined;
    }
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    };
  }, [esPaginaExplorar, theme]);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-1 overflow-x-clip">
      <SideDecorations />
      {!esPaginaExplorar && <PublicNavbar />}
      {esListadoExplorar && (
        <div className="px-5 sm:px-8 pt-6">
          <Link to="/inicio"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                       text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors w-fit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver al panel
          </Link>
        </div>
      )}
      {esPaginaTicket && (
        <div className="px-5 sm:px-8 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                       text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors w-fit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver
          </button>
        </div>
      )}
      <main key={animKey} className={`flex-1 animate-[fadeIn_0.35s_ease_both] relative z-10 ${esPaginaExplorar ? '' : 'pt-24'}`}>
        <Outlet />
      </main>
      {!esPaginaExplorar && <PublicFooter />}
      {/* El acompañante solo en las páginas de GESTEK: en marca blanca
          no debe aparecer nada nuestro. */}
      {!esPaginaExplorar && <Acompanante />}
    </div>
  );
}
