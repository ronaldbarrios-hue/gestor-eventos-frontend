import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import Acompanante from '../agente/Acompanante.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useAuth(); /* mantiene el contexto activo */

  const bPrimary = '#C9A227';
  const bAccent  = '#E0B12B';

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar desktop — data-testid para que las pruebas automatizadas
          (Playwright) puedan diferenciarla de la versión del drawer mobile,
          que sigue en el DOM aunque esté oculta con opacity/transform. */}
      <div className="hidden lg:flex" data-testid="sidebar-desktop">
        <Sidebar />
      </div>

      {/* Drawer mobile */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        data-testid="sidebar-mobile-overlay"
      >
        <div className="absolute inset-0 bg-bg/70 backdrop-blur-md" onClick={() => setOpen(false)} />
        <div className={`absolute top-0 left-0 h-full w-[280px] max-w-[85vw] transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar mobile onClose={() => setOpen(false)} />
        </div>
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="relative flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
            style={{
              transform: 'translateZ(0)',
              backgroundImage: `radial-gradient(60rem 40rem at 85% -10%, ${bPrimary}1c, transparent 60%),`
                + `radial-gradient(50rem 38rem at -10% 35%, ${bPrimary}14, transparent 60%),`
                + `radial-gradient(46rem 34rem at 70% 110%, ${bAccent}16, transparent 60%)`,
            }}
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.35]" />
            <div className="absolute inset-x-0 top-0 h-px"
                 style={{ background: `linear-gradient(90deg, transparent, ${bPrimary}55, transparent)` }} />
          </div>
          <div className="relative z-10 p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* El acompañante vive aquí, no en la landing: dentro de la plataforma
          es donde puede ayudar. Va a la derecha porque el sidebar ocupa la
          izquierda. Un solo bot — el hotspot estático del sidebar se quitó
          para no tener dos. */}
      <Acompanante lado="izquierda" />
    </div>
  );
}
