import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PublicNavbar from './PublicNavbar.jsx';
import PublicFooter from './PublicFooter.jsx';
import SideDecorations from './SideDecorations.jsx';

export default function PublicLayout() {
  const { pathname } = useLocation();
  const [animKey, setAnimKey] = useState(pathname);

  useEffect(() => {
    setAnimKey(pathname);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  /* Las páginas públicas de exploración (listado y evento individual) no deben
     mostrar la navbar/footer genéricos de GESTEK (Iniciar sesión/Registrarse) —
     el usuario ya está navegando dentro de la experiencia pública de eventos. */
  const esPaginaExplorar = /^\/(app\/)?explorar(\/[^/]+)?$/.test(pathname);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-1 overflow-x-hidden">
      <SideDecorations />
      {!esPaginaExplorar && <PublicNavbar />}
      <main key={animKey} className={`flex-1 animate-[fadeIn_0.35s_ease_both] relative z-10 ${esPaginaExplorar ? '' : 'pt-24'}`}>
        <Outlet />
      </main>
      {!esPaginaExplorar && <PublicFooter />}
    </div>
  );
}
