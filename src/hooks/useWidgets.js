import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

/* ──────────────────────────────────────────────────────────────────
   Sistema de widgets multi-página — Rework Fase 1/4
   Cada pantalla personal (Inicio, Mi Espacio, …) define su registry
   de widgets y llama useWidgets(scope, meta). El layout se persiste
   por usuario y por pantalla (Fase 5: sincronización en Supabase).
   Tamaños → columnas del grid de 12: sm=4 · md=6 · lg=8 · full=12
   ────────────────────────────────────────────────────────────────── */

export const TAMANOS = ['sm', 'md', 'lg', 'full'];

/* Registry del INICIO */
export const WIDGETS_META = [
  { id: 'eventos',       titulo: 'Eventos activos',    descripcion: 'Eventos en los que participas, con acceso rápido.', defaultSize: 'md',  defaultVisible: true  },
  { id: 'mi-trabajo',    titulo: 'Mi trabajo',         descripcion: 'Tareas, solicitudes y aprobaciones pendientes.',    defaultSize: 'md',  defaultVisible: true  },
  { id: 'calendario',    titulo: 'Calendario',         descripcion: 'Próximos compromisos relacionados contigo.',        defaultSize: 'sm',  defaultVisible: true  },
  { id: 'actividad',     titulo: 'Actividad reciente', descripcion: 'Timeline de lo último en tu organización.',         defaultSize: 'sm',  defaultVisible: true  },
  { id: 'gestbot',       titulo: 'Gestbot',            descripcion: 'Sugerencias inteligentes según tu actividad.',      defaultSize: 'sm',  defaultVisible: true  },
  { id: 'ventas',        titulo: 'Ventas',             descripcion: 'Resumen de boletas vendidas y ocupación.',          defaultSize: 'sm',  defaultVisible: true  },
  { id: 'mensajes',      titulo: 'Mensajes',           descripcion: 'Actividad reciente de los chats.',                  defaultSize: 'sm',  defaultVisible: false },
  { id: 'recordatorios', titulo: 'Recordatorios',      descripcion: 'Tus recordatorios y notas personales.',             defaultSize: 'sm',  defaultVisible: false },
  { id: 'notificaciones',titulo: 'Notificaciones',     descripcion: 'Alertas importantes sin leer.',                     defaultSize: 'sm',  defaultVisible: false },
];

const layoutDefault = (meta) => ({
  orden : meta.map(w => w.id),
  config: Object.fromEntries(meta.map(w => [w.id, { visible: w.defaultVisible, size: w.defaultSize }])),
});

export function useWidgets(scope = 'inicio', meta = WIDGETS_META) {
  const { usuario } = useAuth();
  const KEY = `gestek-${scope}-layout-v1:${usuario?.id || 'anon'}`;

  const [layout, setLayout] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return layoutDefault(meta);
      const saved = JSON.parse(raw);
      const base = layoutDefault(meta);
      const orden = [...saved.orden.filter(id => base.orden.includes(id)),
                     ...base.orden.filter(id => !saved.orden.includes(id))];
      return { orden, config: { ...base.config, ...saved.config } };
    } catch { return layoutDefault(meta); }
  });

  const persist = useCallback((next) => {
    setLayout(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
  }, [KEY]);

  const toggle = useCallback((id) => {
    persist({ ...layout, config: { ...layout.config, [id]: { ...layout.config[id], visible: !layout.config[id]?.visible } } });
  }, [layout, persist]);

  const setSize = useCallback((id, size) => {
    persist({ ...layout, config: { ...layout.config, [id]: { ...layout.config[id], size } } });
  }, [layout, persist]);

  const mover = useCallback((activeId, overId) => {
    if (activeId === overId) return;
    const orden = [...layout.orden];
    const from = orden.indexOf(activeId), to = orden.indexOf(overId);
    if (from < 0 || to < 0) return;
    orden.splice(to, 0, orden.splice(from, 1)[0]);
    persist({ ...layout, orden });
  }, [layout, persist]);

  const reset = useCallback(() => persist(layoutDefault(meta)), [persist, meta]);

  const visibles = useMemo(
    () => layout.orden.filter(id => layout.config[id]?.visible),
    [layout],
  );

  return { layout, visibles, toggle, setSize, mover, reset };
}
