import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWidgets } from '../../hooks/useWidgets.js';
import { EspacioDataProvider, useEspacioData } from '../../components/widgets/espacio/EspacioData.jsx';
import WidgetGrid from '../../components/widgets/WidgetGrid.jsx';
import WidgetShell from '../../components/widgets/WidgetShell.jsx';
import PersonalizarPanel from '../../components/widgets/PersonalizarPanel.jsx';
import MiTrabajoPage from '../equipo/MiTrabajoPage.jsx';
import {
  MisTareasWidget, MisSolicitudesWidget, MiCalendarioWidget, MisRecursosWidget,
  MisNotasWidget, MisLogrosWidget, MisBoletasWidget, MiActividadWidget,
} from '../../components/widgets/espacio/EspacioWidgets.jsx';

/* ──────────────────────────────────────────────────────────────────
   Mi Espacio — Rework Fase 4
   El escritorio personal del colaborador: sus tareas de todos los
   eventos, sus solicitudes, su calendario, sus recursos de trabajo
   (PDFs, diapositivas), notas, logros y boletas. Todo en widgets
   arrastrables, igual que el Inicio.
   ────────────────────────────────────────────────────────────────── */

const ESPACIO_WIDGETS = [
  { id: 'mis-tareas',      titulo: 'Mis tareas',      descripcion: 'Tus tareas pendientes en todos los eventos, con vencimientos.', defaultSize: 'md', defaultVisible: true  },
  { id: 'mi-calendario',   titulo: 'Mi calendario',   descripcion: 'Próximos eventos en los que participas.',                       defaultSize: 'sm', defaultVisible: true  },
  { id: 'mis-recursos',    titulo: 'Mis recursos',    descripcion: 'PDFs, diapositivas y archivos para tu trabajo.',                defaultSize: 'sm', defaultVisible: true  },
  { id: 'mis-notas',       titulo: 'Mis notas',       descripcion: 'Notas rápidas personales.',                                     defaultSize: 'sm', defaultVisible: true  },
  { id: 'mis-solicitudes', titulo: 'Mis solicitudes', descripcion: 'Sugerencias y solicitudes que has enviado.',                    defaultSize: 'sm', defaultVisible: true  },
  { id: 'mi-actividad',    titulo: 'Mi actividad',    descripcion: 'Lo último que te ha pasado en GESTEK.',                         defaultSize: 'sm', defaultVisible: false },
  { id: 'mis-logros',      titulo: 'Mis logros',      descripcion: 'Puntos, nivel y recompensas de gamificación.',                  defaultSize: 'sm', defaultVisible: false },
  { id: 'mis-boletas',     titulo: 'Mis boletas',     descripcion: 'Entradas a eventos donde eres asistente.',                      defaultSize: 'sm', defaultVisible: false },
];

const COMPONENTES = {
  'mis-tareas'     : MisTareasWidget,
  'mi-calendario'  : MiCalendarioWidget,
  'mis-recursos'   : MisRecursosWidget,
  'mis-notas'      : MisNotasWidget,
  'mis-solicitudes': MisSolicitudesWidget,
  'mi-actividad'   : MiActividadWidget,
  'mis-logros'     : MisLogrosWidget,
  'mis-boletas'    : MisBoletasWidget,
};

export default function MiEspacioPage() {
  const [vista, setVista] = useState('panel');

  return (
    <div className="space-y-6 animate-[fadeUp_0.4s_ease_both]">
      {/* Selector Panel / Tareas por evento */}
      <div className="flex items-center gap-1 border-b border-border -mx-4 px-4 sm:mx-0 sm:px-0">
        {[['panel', 'Mi panel'], ['trabajo', 'Trabajo por evento']].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`relative px-4 py-2.5 text-[14px] font-medium transition-colors
                        ${vista === v ? 'text-text-1' : 'text-text-3 hover:text-text-2'}`}
          >
            {label}
            {vista === v && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>

      {vista === 'trabajo'
        ? <MiTrabajoPage />
        : (
          <EspacioDataProvider>
            <PanelEspacio />
          </EspacioDataProvider>
        )}
    </div>
  );
}

function PanelEspacio() {
  const { usuario } = useAuth();
  const { layout, visibles, toggle, setSize, mover, reset } = useWidgets('mi-espacio', ESPACIO_WIDGETS);
  const [panelOpen, setPanelOpen] = useState(false);
  const { tareas, loading } = useEspacioData();

  const pendientes = tareas.filter(t => t.estado !== 'hecho').length;
  const vencidas   = tareas.filter(t => t.estado !== 'hecho' && t.vence_at && new Date(t.vence_at) < new Date()).length;
  const nombre = usuario?.nombre?.split(' ')[0] || 'Usuario';

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-1 tracking-tight">Mi Espacio</h1>
          <p className="text-sm text-text-2 mt-1">
            {loading ? 'Reuniendo tu trabajo…'
              : vencidas > 0
                ? `${nombre}, tienes ${pendientes} tareas abiertas y ${vencidas} vencidas.`
                : `${nombre}, tienes ${pendientes} tarea${pendientes !== 1 ? 's' : ''} abierta${pendientes !== 1 ? 's' : ''}. Organiza tu espacio como prefieras.`}
          </p>
        </div>
        <button onClick={() => setPanelOpen(true)} className="btn-secondary">
          <SlidersIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Personalizar</span>
        </button>
      </header>

      <WidgetGrid visibles={visibles} onMove={mover}>
        {visibles.map(id => {
          const Comp = COMPONENTES[id];
          const meta = ESPACIO_WIDGETS.find(w => w.id === id);
          if (!Comp || !meta) return null;
          return (
            <WidgetShell
              key={id}
              id={id}
              titulo={meta.titulo}
              size={layout.config[id]?.size || meta.defaultSize}
              onSize={(t) => setSize(id, t)}
              onHide={() => toggle(id)}
            >
              <Comp />
            </WidgetShell>
          );
        })}
      </WidgetGrid>

      {visibles.length === 0 && (
        <div className="text-center py-16 rounded-3xl border border-dashed border-border-2">
          <p className="text-text-2 mb-3">Tu espacio está vacío.</p>
          <button onClick={() => setPanelOpen(true)} className="btn-primary">Agregar widgets</button>
        </div>
      )}

      <PersonalizarPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        layout={layout}
        toggle={toggle}
        setSize={setSize}
        reset={reset}
        meta={ESPACIO_WIDGETS}
        titulo="Personalizar Mi Espacio"
      />
    </div>
  );
}

function SlidersIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>;
}
