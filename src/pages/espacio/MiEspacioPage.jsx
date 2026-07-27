import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { meApi } from '../../api/me.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWidgets } from '../../hooks/useWidgets.js';
import { EspacioDataProvider, useEspacioData } from '../../components/widgets/espacio/EspacioData.jsx';
import WidgetGrid from '../../components/widgets/WidgetGrid.jsx';
import WidgetShell from '../../components/widgets/WidgetShell.jsx';
import PersonalizarPanel from '../../components/widgets/PersonalizarPanel.jsx';
import MiTrabajoPage from '../equipo/MiTrabajoPage.jsx';
import PerfilTalentoEditor from '../vacantes/PerfilTalentoEditor.jsx';
import PerfilOrganizador from './PerfilOrganizador.jsx';
import { Link } from 'react-router-dom';
import {
  MisTareasWidget, MisSolicitudesWidget, MiCalendarioWidget, MisRecursosWidget,
  MisNotasWidget, MisLogrosWidget, MisBoletasWidget, MiActividadWidget,
} from '../../components/widgets/espacio/EspacioWidgets.jsx';
import MiEventoWidget from '../../components/widgets/espacio/MiEventoWidget.jsx';

/* ──────────────────────────────────────────────────────────────────
   Mi Espacio — Rework Fase 4
   El escritorio personal del colaborador: sus tareas de todos los
   eventos, sus solicitudes, su calendario, sus recursos de trabajo
   (PDFs, diapositivas), notas, logros y boletas. Todo en widgets
   arrastrables, igual que el Inicio.
   ────────────────────────────────────────────────────────────────── */

const ESPACIO_WIDGETS = [
  { id: 'mi-evento',       titulo: 'Mi evento',       descripcion: 'Fija un evento y ve sus tareas, prioridades y equipo.',           defaultSize: 'md', defaultVisible: true  },
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
  'mi-evento'      : MiEventoWidget,
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

  const [expositores, setExpositores] = useState([]);
  useEffect(() => { meApi.expositor().then(d => setExpositores(d.expositores || [])).catch(() => {}); }, []);

  const TABS = [
    ['panel', 'Mi panel'], ['colaborador', 'Colaborador'],
    ['talento', 'Perfil de talento'], ['organizador', 'Perfil de organizador'],
    ...(expositores.length ? [['expositor', 'Mis stands']] : []),
  ];

  return (
    <div className="space-y-6 animate-[fadeUp_0.4s_ease_both]">
      {/* Las facetas de tu cuenta en GESTEK + tu panel personal. */}
      <div className="flex items-center gap-1 border-b border-border -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
        {TABS.map(([v, label]) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`relative px-4 py-2.5 text-[14px] font-medium whitespace-nowrap transition-colors
                        ${vista === v ? 'text-text-1' : 'text-text-3 hover:text-text-2'}`}
          >
            {label}
            {vista === v && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>

      {vista === 'panel' && <EspacioDataProvider><PanelEspacio /></EspacioDataProvider>}
      {vista === 'colaborador' && <MiTrabajoPage />}
      {vista === 'talento' && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-text-1 tracking-tight">Perfil de talento</h1>
              <p className="text-sm text-text-2 mt-1">Tu CV para trabajar en eventos. Con él te postulas a vacantes.</p>
            </div>
            <Link to="/vacantes" className="btn-secondary btn-sm flex-shrink-0">Explorar vacantes →</Link>
          </div>
          <PerfilTalentoEditor />
        </div>
      )}
      {vista === 'organizador' && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-text-1 tracking-tight">Perfil de organizador</h1>
            <p className="text-sm text-text-2 mt-1">Tu identidad pública y tu reputación cuando organizas eventos y contratas personal.</p>
          </div>
          <PerfilOrganizador />
        </div>
      )}
      {vista === 'expositor' && <MisStands expositores={expositores} />}
    </div>
  );
}

function MisStands({ expositores }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-text-1 tracking-tight">Mis stands</h1>
        <p className="text-sm text-text-2 mt-1">Los stands donde eres expositor. Abre el panel para editar tu ficha, dar puntos y ver tu cronograma.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {expositores.map(e => (
          <div key={e.id} className="rounded-2xl border border-border bg-surface/40 p-4 flex items-center gap-3">
            {e.logo_url
              ? <img src={e.logo_url} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
              : <div className="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center text-text-3 font-bold flex-shrink-0">{(e.nombre || '?').charAt(0).toUpperCase()}</div>}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-1 truncate">{e.nombre}</p>
              <p className="text-xs text-text-3 truncate">{e.evento?.titulo}{e.stand ? ` · ${e.stand}` : ''}</p>
              {e.estado_ficha === 'borrador' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning">Ficha en borrador</span>}
            </div>
            <button onClick={() => navigate(`/expositor/${e.codigo}`)} disabled={!e.codigo} className="btn-secondary btn-sm flex-shrink-0">Abrir panel</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelEspacio({ embebido = false }) {
  const { usuario } = useAuth();
  const { layout, visibles, toggle, setSize, mover, reset } = useWidgets('mi-espacio', ESPACIO_WIDGETS);
  const [panelOpen, setPanelOpen] = useState(false);
  const { tareas, loading } = useEspacioData();

  const pendientes = tareas.filter(t => t.estado !== 'hecho').length;
  const vencidas   = tareas.filter(t => t.estado !== 'hecho' && t.vence_at && new Date(t.vence_at) < new Date()).length;
  const nombre = usuario?.nombre?.split(' ')[0] || 'Usuario';

  return (
    <div className="space-y-6">
      <header className={`flex items-start justify-between gap-4 flex-wrap ${embebido ? 'hidden' : ''}`}>
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
