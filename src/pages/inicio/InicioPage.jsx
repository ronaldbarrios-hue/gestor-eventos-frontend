import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { PanelEspacio } from '../espacio/MiEspacioPage.jsx';
import { EspacioDataProvider } from '../../components/widgets/espacio/EspacioData.jsx';
import { useWidgets } from '../../hooks/useWidgets.js';
import { InicioDataProvider, useInicioData } from '../../components/inicio/InicioDataContext.jsx';
import QuickActions from '../../components/inicio/QuickActions.jsx';
import WidgetGrid from '../../components/widgets/WidgetGrid.jsx';
import WidgetShell from '../../components/widgets/WidgetShell.jsx';
import PersonalizarPanel from '../../components/widgets/PersonalizarPanel.jsx';
import { WIDGETS_META } from '../../hooks/useWidgets.js';

import EventosActivosWidget  from '../../components/widgets/items/EventosActivosWidget.jsx';
import MiTrabajoWidget       from '../../components/widgets/items/MiTrabajoWidget.jsx';
import CalendarioWidget      from '../../components/widgets/items/CalendarioWidget.jsx';
import ActividadWidget       from '../../components/widgets/items/ActividadWidget.jsx';
import GestbotWidget         from '../../components/widgets/items/GestbotWidget.jsx';
import VentasWidget          from '../../components/widgets/items/VentasWidget.jsx';
import MensajesWidget        from '../../components/widgets/items/MensajesWidget.jsx';
import RecordatoriosWidget   from '../../components/widgets/items/RecordatoriosWidget.jsx';
import NotificacionesWidget  from '../../components/widgets/items/NotificacionesWidget.jsx';

const COMPONENTES = {
  'eventos'       : EventosActivosWidget,
  'mi-trabajo'    : MiTrabajoWidget,
  'calendario'    : CalendarioWidget,
  'actividad'     : ActividadWidget,
  'gestbot'       : GestbotWidget,
  'ventas'        : VentasWidget,
  'mensajes'      : MensajesWidget,
  'recordatorios' : RecordatoriosWidget,
  'notificaciones': NotificacionesWidget,
};

/* ──────────────────────────────────────────────────────────────────
   Inicio — centro de operaciones (Rework Fase 1)
   Todo el contenido son widgets configurables por usuario.
   ────────────────────────────────────────────────────────────────── */
export default function InicioPage() {
  return (
    <InicioDataProvider>
      <InicioContent />
    </InicioDataProvider>
  );
}

function InicioContent() {
  const { usuario } = useAuth();
  const VISTA_KEY = `gestek-inicio-vista:${usuario?.id || 'anon'}`;
  const [vistaRol, setVistaRol] = useState(() => { try { return localStorage.getItem(VISTA_KEY) || 'organizador'; } catch { return 'organizador'; } });
  const cambiarVista = (v) => { setVistaRol(v); try { localStorage.setItem(VISTA_KEY, v); } catch { /* noop */ } };
  const { layout, visibles, toggle, setSize, mover, reset } = useWidgets('inicio', WIDGETS_META);
  const [panelOpen, setPanelOpen] = useState(false);
  const { eventos, notifs, solicitudes, loading } = useInicioData();

  const hora   = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = usuario?.nombre?.split(' ')[0] || 'Usuario';

  const activos    = eventos.filter(e => ['publicado', 'en_curso'].includes(e.estado)).length;
  const vendidos   = eventos.reduce((s, e) => s + (e.aforo_vendido || 0), 0);
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente' || s.estado === 'abierta').length;
  const sinLeer    = notifs.filter(n => !n.leida).length;

  return (
    <div className="space-y-7 animate-[fadeUp_0.4s_ease_both]">
      {/* Saludo + acciones */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-1 tracking-tight">
            {saludo}, {nombre}
          </h1>
          <p className="text-sm text-text-2 mt-1">
            {loading ? 'Cargando tu actividad…'
              : `Tienes ${activos} evento${activos !== 1 ? 's' : ''} activo${activos !== 1 ? 's' : ''}, ${pendientes} pendiente${pendientes !== 1 ? 's' : ''} y ${sinLeer} notificación${sinLeer !== 1 ? 'es' : ''} sin leer.`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Vista: lo que administro vs. donde colaboro */}
          <div className="flex rounded-xl border border-border bg-surface overflow-hidden">
            {[['organizador', 'Organizador'], ['colaborador', 'Colaborador']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => cambiarVista(v)}
                className={`px-3.5 h-10 text-sm font-medium transition-colors
                            ${vistaRol === v ? 'bg-accent text-white' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setPanelOpen(true)} className="btn-secondary">
            <SlidersIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Personalizar</span>
          </button>
          <QuickActions />
        </div>
      </header>

      {vistaRol === 'colaborador' ? (
        <EspacioDataProvider>
          <PanelEspacio embebido />
        </EspacioDataProvider>
      ) : (<>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Eventos activos"       valor={loading ? '—' : activos} />
        <Kpi label="Boletas vendidas"      valor={loading ? '—' : vendidos.toLocaleString('es-CO')} />
        <Kpi label="Pendientes de trabajo" valor={loading ? '—' : pendientes} />
        <Kpi label="Notificaciones"        valor={loading ? '—' : sinLeer} />
      </div>

      {/* Widgets */}
      <WidgetGrid visibles={visibles} onMove={mover}>
        {visibles.map(id => {
          const Comp = COMPONENTES[id];
          const meta = WIDGETS_META.find(w => w.id === id);
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
          <p className="text-text-2 mb-3">Tu Inicio está vacío.</p>
          <button onClick={() => setPanelOpen(true)} className="btn-primary">Agregar widgets</button>
        </div>
      )}

      </>)}

      <PersonalizarPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        layout={layout}
        toggle={toggle}
        setSize={setSize}
        reset={reset}
      />
    </div>
  );
}

function Kpi({ label, valor }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 px-5 py-4">
      <p className="text-2xl font-bold font-display text-text-1 tabular-nums">{valor}</p>
      <p className="text-xs text-text-3 mt-0.5">{label}</p>
    </div>
  );
}

function SlidersIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>;
}
