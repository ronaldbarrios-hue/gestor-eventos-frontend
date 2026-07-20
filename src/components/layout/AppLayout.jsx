import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useAuth(); /* mantiene el contexto activo */
  /* Rework: el shell de la app respeta SIEMPRE los tokens de tema
     (claro/oscuro). El branding es por evento y vive en su sitio
     público — ya no pinta el panel interno. */
  const bPrimary = '#3B82F6';
  const bAccent  = '#8B5CF6';

  /* Cerrar drawer al navegar */
  useEffect(() => { setOpen(false); }, [pathname]);

  /* Bloquear scroll del body cuando el drawer está abierto en mobile */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Drawer mobile */}
      <div className={`lg:hidden fixed inset-0 z-40 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-bg/70 backdrop-blur-md" onClick={() => setOpen(false)} />
        <div className={`absolute top-0 left-0 h-full w-[280px] max-w-[85vw] transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar mobile onClose={() => setOpen(false)} />
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="relative flex-1 overflow-y-auto">
          {/* Fondo decorativo (estático, capa compositada — no repinta al scrollear) */}
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
    </div>
  );
}
