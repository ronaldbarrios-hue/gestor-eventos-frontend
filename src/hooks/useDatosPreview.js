import { useState, useEffect, useMemo } from 'react';
import { ticketsApi } from '../api/tickets.js';
import { networkingApi } from '../api/networking.js';
import { recompensasApi } from '../api/loyalty.js';
import { useAuth } from '../context/AuthContext.jsx';

/* ── useDatosPreview ──────────────────────────────────────────────────
   El editor y la página pública pintan los MISMOS componentes de
   blocks.jsx, pero no reciben el mismo evento.

   La página pública lo trae de GET /explorar/:slug, que además de la fila
   engancha las colecciones: ticket_types, expositores, recompensas y el
   organizador. El editor lo trae de GET /eventos/:id, que es un
   `select('*')` pelado — sin una sola colección.

   Resultado: en el editor los bloques que dependen de esas listas se
   pintaban como si no hubiera nada configurado ("Sin tipos de ticket
   configurados") mientras en público salían bien. No era un bug del
   bloque, era el evento llegando incompleto.

   Este hook rellena esas cuatro cosas desde los endpoints privados, que
   funcionan también en borrador — el público devuelve 404 si el evento no
   está publicado, y el editor se usa sobre todo en borrador.

   Lo que falla se queda como lista vacía: el editor sigue abriendo. */
export function useDatosPreview(evento) {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState({ ticket_types: [], expositores: [], recompensas: [] });
  const [cargando, setCargando] = useState(true);

  const eventoId = evento?.id;

  useEffect(() => {
    if (!eventoId) return;
    let vivo = true;
    setCargando(true);

    Promise.allSettled([
      ticketsApi.list(eventoId),
      networkingApi.expositoresAdmin(eventoId),
      recompensasApi.list('cliente'),
    ]).then(([t, e, r]) => {
      if (!vivo) return;
      const tickets = t.status === 'fulfilled' ? (t.value?.tickets || []) : [];
      setDatos({
        /* El endpoint público ordena por `orden` antes de entregar; los
           bloques ya filtran por activo, así que aquí solo ordenamos. */
        ticket_types: [...tickets].sort((a, b) => (a.orden || 0) - (b.orden || 0)),
        expositores : e.status === 'fulfilled' ? (e.value?.expositores || []) : [],
        recompensas : r.status === 'fulfilled' ? (r.value?.recompensas || []) : [],
      });
      setCargando(false);
    });

    return () => { vivo = false; };
  }, [eventoId]);

  /* El organizador sale de la sesión: en el editor, quien edita es el dueño
     o alguien de su equipo, y los bloques solo leen empresa/nombre/avatar. */
  const eventoCompleto = useMemo(() => ({
    ...evento,
    ticket_types: datos.ticket_types,
    expositores : datos.expositores,
    recompensas : datos.recompensas,
    tiene_expositores: datos.expositores.length > 0,
    organizador : evento?.organizador || {
      nombre    : usuario?.nombre  || '',
      empresa   : usuario?.empresa || '',
      avatar_url: usuario?.foto    || null,
    },
  }), [evento, datos, usuario]);

  return { eventoCompleto, cargando };
}
