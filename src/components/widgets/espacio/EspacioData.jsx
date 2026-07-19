import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { solicitudesApi } from '../../../api/solicitudes.js';
import { tareasApi } from '../../../api/tareas.js';
import { eventosApi } from '../../../api/eventos.js';
import { notificacionesApi } from '../../../api/notificaciones.js';
import { meApi } from '../../../api/me.js';
import { loyaltyApi } from '../../../api/loyalty.js';

/* Datos compartidos de Mi Espacio: tareas cross-evento, solicitudes,
   eventos donde participo, boletas, puntos. Una carga por visita. */
const Ctx = createContext(null);

export function EspacioDataProvider({ children }) {
  const [tareas, setTareas]           = useState([]); /* [{...tarea, evento}] */
  const [solicitudes, setSolicitudes] = useState([]);
  const [eventos, setEventos]         = useState([]);
  const [notifs, setNotifs]           = useState([]);
  const [boletas, setBoletas]         = useState([]);
  const [loyalty, setLoyalty]         = useState(null);
  const [loading, setLoading]         = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [mios, equipo, sol, no, bo, loy] = await Promise.allSettled([
      eventosApi.list({ limit: 50 }),
      solicitudesApi.misEventos(),
      solicitudesApi.misSolicitudes(),
      notificacionesApi.list(20),
      meApi.boletas(),
      loyaltyApi.empleado(),
    ]);

    const propios = mios.status === 'fulfilled' ? (mios.value.eventos || []) : [];
    const comoMiembro = equipo.status === 'fulfilled' ? (equipo.value.eventos || []) : [];
    const mapa = new Map();
    [...propios, ...comoMiembro].forEach(e => { if (e?.id && !mapa.has(e.id)) mapa.set(e.id, e); });
    const todos = [...mapa.values()];
    setEventos(todos);

    if (sol.status === 'fulfilled') setSolicitudes(sol.value.solicitudes || []);
    if (no.status  === 'fulfilled') setNotifs(no.value.notificaciones || []);
    if (bo.status  === 'fulfilled') setBoletas(bo.value.boletas || bo.value.tickets || []);
    if (loy.status === 'fulfilled') setLoyalty(loy.value);

    /* Tareas de los eventos activos (máx. 6 eventos para no saturar) */
    const activos = todos.filter(e => !['finalizado', 'archivado', 'cancelado'].includes(e.estado)).slice(0, 6);
    const porEvento = await Promise.allSettled(activos.map(e => tareasApi.list(e.id)));
    const agregadas = [];
    porEvento.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        (r.value.tareas || []).forEach(t => agregadas.push({ ...t, evento: activos[i] }));
      }
    });
    setTareas(agregadas);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return <Ctx.Provider value={{ tareas, solicitudes, eventos, notifs, boletas, loyalty, loading, refrescar: cargar }}>{children}</Ctx.Provider>;
}

export const useEspacioData = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEspacioData debe usarse dentro de EspacioDataProvider');
  return ctx;
};
