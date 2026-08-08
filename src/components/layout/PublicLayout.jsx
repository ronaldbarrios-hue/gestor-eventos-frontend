import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import PublicNavbar from './PublicNavbar.jsx';
import PublicFooter from './PublicFooter.jsx';
import SideDecorations from './SideDecorations.jsx';
import Acompanante from '../agente/Acompanante.jsx';
import BotonConfiguracion from '../ui/BotonConfiguracion.jsx';

export default function PublicLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [animKey, setAnimKey] = useState(pathname);
  const { theme } = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    setAnimKey(pathname);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  /* ── Qué página es esta ─────────────────────────────────────────
     La distinción que importa NO es "explorar o no", es "¿de quién es
     la marca aquí?".

     · Listado de exploración (/explorar): es DE GESTEK. Es donde el
       público entra a ver qué eventos hay, así que lleva la navbar, el
       pie y el tema que el visitante eligió, igual que el resto del
       sitio. Antes se trataba como marca blanca: entraba sin navbar,
       se forzaba a oscuro aunque el visitante estuviera en claro, y
       mostraba un "Volver al panel" que llevaba a login a cualquiera
       sin sesión. Se sentía como salir del sitio.

     · Página de un evento (/explorar/mi-evento y sus sub-rutas) y
       página de una boleta (/mi-ticket/xxx): son del ORGANIZADOR.
       Ahí no va nada nuestro y el diseño se armó sobre fondo oscuro. */
  const esListadoExplorar = /^\/(app\/)?explorar\/?$/.test(pathname);
  const esPaginaEvento    = /^\/(app\/)?explorar\/[^/]+(\/.*)?$/.test(pathname) && !esListadoExplorar;
  const esPaginaTicket    = /^\/mi-ticket\/[^/]+$/.test(pathname);
  const esMarcaBlanca     = esPaginaEvento || esPaginaTicket;

  useEffect(() => {
    if (!esMarcaBlanca) {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      return undefined;
    }
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    };
  }, [esMarcaBlanca, theme]);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-1 overflow-x-clip">
      <SideDecorations />
      {!esMarcaBlanca && <PublicNavbar />}

      {esPaginaTicket && (
        <div className="px-5 sm:px-8 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                       text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors w-fit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('Volver')}
          </button>
        </div>
      )}

      <main key={animKey} className={`flex-1 animate-[fadeIn_0.35s_ease_both] relative z-10 ${esMarcaBlanca ? '' : 'pt-24'}`}>
        <Outlet />
      </main>

      {!esMarcaBlanca && <PublicFooter />}

      {/* El acompañante y la configuración solo en las páginas de GESTEK:
          en marca blanca no debe aparecer nada nuestro. El bot va a la
          izquierda y la configuración a la derecha, para que no choquen. */}
      {!esMarcaBlanca && <Acompanante />}
      {!esMarcaBlanca && <BotonConfiguracion />}
    </div>
  );
}
