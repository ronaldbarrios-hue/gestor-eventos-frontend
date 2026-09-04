import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import Volver from '../ui/Volver.jsx';
import PublicNavbar from './PublicNavbar.jsx';
import PublicFooter from './PublicFooter.jsx';
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
      {!esMarcaBlanca && <PublicNavbar />}

      {/* La página de la boleta se abre casi siempre desde el enlace de un
          correo. Aquí había un «Volver» que hacía `navigate(-1)`: sin historial
          dentro del sitio, eso devuelve al cliente de correo o no hace nada —
          y quien la abre desde el panel tampoco quiere «atrás», quiere su
          evento.

          `Volver` dice a dónde va, y a Explorar es a donde se puede ir siempre:
          esta pantalla no sabe de qué evento es la boleta. */}
      {esPaginaTicket && (
        <div className="px-5 sm:px-8 pt-6">
          <Volver a="/explorar" tono="chip">{t('Explorar eventos')}</Volver>
        </div>
      )}

      <main key={animKey} className={`flex-1 animate-[fadeIn_0.35s_ease_both] relative z-10 ${esMarcaBlanca ? '' : 'pt-24'}`}>
        <Outlet />
      </main>

      {!esMarcaBlanca && <PublicFooter />}

      {/* El acompañante se fue al panel: en la landing distraía sin aportar,
          y su sitio natural es donde de verdad puede ayudar a trabajar.
          Aquí queda solo la configuración, abajo a la derecha. */}
      {!esMarcaBlanca && <BotonConfiguracion />}
    </div>
  );
}
