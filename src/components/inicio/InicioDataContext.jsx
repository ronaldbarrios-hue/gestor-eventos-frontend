import { createContext, useContext, useEffect, useState } from 'react';
import { eventosApi } from '../../api/eventos.js';
import { notificacionesApi } from '../../api/notificaciones.js';
import { solicitudesApi } from '../../api/solicitudes.js';

/* Datos compartidos del Inicio: una sola carga para todos los widgets. */
const Ctx = createContext(null);

export function InicioDataProvider({ children }) {
  const [eventos, setEventos]         = useState([]);
  const [notifs, setNotifs]           = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.allSettled([
      eventosApi.list({ limit: 50 }),
      notificacionesApi.list(30),
      solicitudesApi.misSolicitudes(),
    ]).then(([ev, no, so]) => {
      if (ev.status === 'fulfilled') setEventos(ev.value.eventos || []);
      if (no.status === 'fulfilled') setNotifs(no.value.notificaciones || []);
      if (so.status === 'fulfilled') setSolicitudes(so.value.solicitudes || []);
    }).finally(() => setLoading(false));
  }, []);

  return <Ctx.Provider value={{ eventos, notifs, solicitudes, loading }}>{children}</Ctx.Provider>;
}

export const useInicioData = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useInicioData debe usarse dentro de InicioDataProvider');
  return ctx;
};
