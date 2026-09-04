import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { solicitudesApi } from '../../../api/solicitudes.js';
import { sugerenciasApi } from '../../../api/sugerencias.js';
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
  /* Lo que alguien escribió en el buzón —«busco un evento de X y no lo
     encontré»— y no volvía a ver nunca. `sugerenciasApi.mias` existía y no la
     llamaba nadie, aunque este widget se anuncia como «Sugerencias y
     solicitudes que has enviado». Prometía las dos y enseñaba una. */
  const [sugerencias, setSugerencias] = useState([]);
  const [eventos, setEventos]         = useState([]);
  const [notifs, setNotifs]           = useState([]);
  const [boletas, setBoletas]         = useState([]);
  const [loyalty, setLoyalty]         = useState(null);
  const [loading, setLoading]         = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    /* Cada nombre al lado de su llamada, y no una lista de seis nombres
       arriba y siete llamadas abajo: al añadir `sugerenciasApi.mias()` en
       medio, el destructuring posicional dejó a `no` con las sugerencias, a
       `bo` con las notificaciones y a `loyalty` sin nada. No falla, no avisa:
       simplemente el widget de logros se queda vacío para siempre. */
    const [mios, equipo, sol, sug, no, bo, loy] = await Promise.allSettled([
      eventosApi.list({ limit: 50 }),
      solicitudesApi.misEventos(),
      solicitudesApi.misSolicitudes(),
      sugerenciasApi.mias(),
      notificacionesApi.list(20),
      meApi.boletas(),
      loyaltyApi.empleado(),
    ]);

    const propios = mios.status === 'fulfilled' ? (mios.value.eventos || []) : [];
    const comoMiembro = equipo.status === 'fulfilled' ? (equipo.value.eventos || []) : [];

    /* Las dos listas se SUPERPONEN: `GET /eventos` ya devuelve tanto los
       míos como aquellos donde soy miembro, y `/me/equipo/eventos` sólo
       estos últimos —pero es la única que trae `mi_rol`.

       Antes se hacía `if (!mapa.has(id))` sobre `[...propios, ...miembro]`:
       como los propios iban primero, la fila con `mi_rol` NUNCA entraba y el
       rol se perdía siempre. Por eso la vista Colaborador no podía decir en
       qué evento colaboras ni con qué papel (#45).

       Ahora se combinan los dos objetos en vez de quedarse con uno. */
    const mapa = new Map();
    for (const e of propios) if (e?.id) mapa.set(e.id, { ...e });
    for (const e of comoMiembro) {
      if (!e?.id) continue;
      mapa.set(e.id, { ...(mapa.get(e.id) || {}), ...e });
    }
    const todos = [...mapa.values()];
    setEventos(todos);

    if (sol.status === 'fulfilled') setSolicitudes(sol.value.solicitudes || []);
    if (sug.status === 'fulfilled') setSugerencias(sug.value.sugerencias || []);
    if (no.status  === 'fulfilled') setNotifs(no.value.notificaciones || []);
    if (bo.status  === 'fulfilled') setBoletas(bo.value.boletas || bo.value.tickets || []);
    if (loy.status === 'fulfilled') setLoyalty(loy.value);

    /* Tareas de los eventos activos (máx. 6 eventos para no saturar).

       Los eventos donde COLABORO van primero en la cola. Antes se cortaba por
       el orden que trajera la lista —los propios— y a quien colabora en el
       séptimo evento no le llegaba ninguna tarea: la vista Colaborador salía
       vacía sin que nada explicara por qué. */
    const activos = todos
      .filter(e => !['finalizado', 'archivado', 'cancelado'].includes(e.estado))
      .sort((a, b) => Number(Boolean(a.soyOwner)) - Number(Boolean(b.soyOwner)))
      .slice(0, 6);
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

  return <Ctx.Provider value={{ tareas, solicitudes, sugerencias, eventos, notifs, boletas, loyalty, loading, refrescar: cargar }}>{children}</Ctx.Provider>;
}

export const useEspacioData = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEspacioData debe usarse dentro de EspacioDataProvider');
  return ctx;
};
