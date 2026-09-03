import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInicioData } from './InicioDataContext.jsx';

/* Botón "+" — acciones frecuentes desde cualquier parte del Inicio. */
export default function QuickActions() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { eventos } = useInicioData();
  const reciente = eventos[0];

  const Ic = (d) => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
  const acciones = [
    { label: 'Crear evento',        icon: Ic('M12 4v16m8-8H4'), run: () => navigate('/eventos/nuevo') },
    { label: 'Invitar colaborador', icon: Ic('M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'), run: () => reciente ? navigate(`/eventos/${reciente.id}?s=equipo&t=equipo`) : navigate('/eventos') },
    { label: 'Crear tarea',         icon: Ic('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'), run: () => navigate('/mi-espacio') },
    ...(reciente ? [{ label: `Abrir "${reciente.titulo?.slice(0, 22)}${reciente.titulo?.length > 22 ? '…' : ''}"`, icon: Ic('M13 5l7 7-7 7M5 5l7 7-7 7'), run: () => navigate(`/eventos/${reciente.id}`) }] : []),
    { label: 'Preguntar a Gestbot', icon: Ic('M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'), run: () => navigate('/gestbot') },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Acciones rápidas"
        className="btn-primary !px-3.5"
      >
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline">Acciones</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-30 w-64 card-glass rounded-2xl overflow-hidden py-1.5 animate-[scaleIn_0.15s_ease_both] origin-top-right">
            {acciones.map((a, i) => (
              <button
                key={i}
                onClick={() => { setOpen(false); a.run(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-1 hover:bg-surface-2 transition-colors text-left"
              >
                <span className="w-6 flex justify-center text-text-3">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
