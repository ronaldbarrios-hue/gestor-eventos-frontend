import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInicioData } from './InicioDataContext.jsx';

/* Botón "+" — acciones frecuentes desde cualquier parte del Inicio. */
export default function QuickActions() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { eventos } = useInicioData();
  const reciente = eventos[0];

  const acciones = [
    { label: 'Crear evento',        icon: '🎪', run: () => navigate('/eventos/nuevo') },
    { label: 'Invitar colaborador', icon: '👥', run: () => reciente ? navigate(`/eventos/${reciente.id}?tab=equipo`) : navigate('/eventos') },
    { label: 'Crear tarea',         icon: '✅', run: () => navigate('/mi-espacio') },
    ...(reciente ? [{ label: `Abrir "${reciente.titulo?.slice(0, 22)}${reciente.titulo?.length > 22 ? '…' : ''}"`, icon: '⚡', run: () => navigate(`/eventos/${reciente.id}`) }] : []),
    { label: 'Preguntar a Gestbot', icon: '✦',  run: () => navigate('/gestbot') },
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
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-64 card-glass rounded-2xl overflow-hidden py-1.5 animate-[scaleIn_0.15s_ease_both] origin-top-right">
            {acciones.map((a, i) => (
              <button
                key={i}
                onClick={() => { setOpen(false); a.run(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-1 hover:bg-surface-2 transition-colors text-left"
              >
                <span className="w-6 text-center">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
