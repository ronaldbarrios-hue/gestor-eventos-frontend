import { NavLink } from 'react-router-dom';
import GestekMark from './GestekMark.jsx';
import Criatura from '../agente/Criatura.jsx';

/* ──────────────────────────────────────────────────────────────────
   Sidebar — Rework 2026
   Azul oscuro identitario (tokens bg-sidebar) en AMBOS temas.
   Contiene ÚNICAMENTE:
     · Logo
     · Navegación principal: Inicio · Eventos · Mi Espacio · Ajustes
     · Accesos rápidos personalizables (por rol/usuario — Fase 1+)
     · Hotspot de Gestbot al fondo
   La cuenta del usuario vive en la TopBar (arriba a la derecha).
   ────────────────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { to: '/inicio',     icon: HomeIcon,      label: 'Inicio'     },
  { to: '/eventos',    icon: CalendarIcon,  label: 'Eventos'    },
  { to: '/mi-espacio', icon: BriefcaseIcon, label: 'Mi Espacio' },
  { to: '/ajustes',    icon: SettingsIcon,  label: 'Ajustes'    },
];

/* Accesos rápidos: en Fase 1 se leerán de la preferencia del usuario
   (Ajustes > Espacio de Trabajo) y se sugerirán según su rol. */
const ACCESOS_RAPIDOS = [];

export default function Sidebar({ mobile = false, onClose }) {
  return (
    <aside
      className={`${mobile ? 'w-full' : 'w-[var(--sidebar-w)]'} h-full flex-shrink-0
                  bg-sidebar text-slate-300 flex flex-col`}
    >
      {/* ── Logo ── */}
      <div className="px-4 py-5 flex items-center justify-between gap-2">
        <NavLink to="/inicio" className="flex items-center gap-3 group flex-1 min-w-0">
          <div className="flex-shrink-0 transition-transform group-hover:scale-110">
            <GestekMark size={38} />
          </div>
          <span className="font-display font-bold text-white text-base tracking-tight leading-tight">
            GESTEK
          </span>
        </NavLink>
        {mobile && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-sidebar-2 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Navegación principal ── */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-colors
               ${isActive
                 ? 'bg-accent text-white shadow-glow-sm'
                 : 'text-slate-300 hover:text-white hover:bg-sidebar-2'}`
            }
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {/* ── Accesos rápidos (personalizables) ── */}
        {ACCESOS_RAPIDOS.length > 0 && (
          <div className="pt-5">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Accesos rápidos
            </p>
            {ACCESOS_RAPIDOS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={mobile ? onClose : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors
                   ${isActive ? 'bg-sidebar-3 text-white' : 'text-slate-400 hover:text-white hover:bg-sidebar-2'}`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* ── Hotspot Gestbot ── */}
      <div className="p-3">
        <div className="rounded-2xl bg-sidebar-2 border border-white/5 p-4">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="flex-shrink-0 -my-1"><Criatura mood="happy" size={52} /></div>
            <p className="text-[13px] font-semibold text-white leading-tight">¿Necesitas ayuda en algo?</p>
          </div>
          <NavLink
            to="/gestbot"
            onClick={mobile ? onClose : undefined}
            className="block w-full text-center px-3 py-2 rounded-xl bg-accent hover:bg-accent-dark
                       text-white text-[13px] font-medium transition-colors"
          >
            Abrir Gestbot
          </NavLink>
        </div>
      </div>
    </aside>
  );
}

/* ── Icons ─────────────────────────────────────────────────────── */
function HomeIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function CalendarIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function BriefcaseIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
}
function SettingsIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function SparkIcon({ className }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l1.9 5.7L19.6 9.6l-5.7 1.9L12 17.2l-1.9-5.7L4.4 9.6l5.7-1.9L12 2zm7 12l.95 2.85L22.8 17.8l-2.85.95L19 21.6l-.95-2.85-2.85-.95 2.85-.95L19 14z"/></svg>;
}
