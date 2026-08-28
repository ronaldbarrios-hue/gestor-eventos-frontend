import { useState, useEffect, useCallback } from 'react';
import { clientesApi } from '../api/clientes.js';
import { supabase } from '../lib/supabase.js';
import { useAgrupado } from './useSondeo.js';

/**
 * Cuenta en vivo de asistentes que ya ingresaron (check-in hecho) para un
 * evento, actualizada en tiempo real vía Supabase Realtime — cualquier
 * escaneo hecho desde cualquier dispositivo (el propio u otro punto de
 * entrada del staff) actualiza el número sin recargar la pantalla.
 *
 * Requiere que la tabla `tickets` tenga Realtime habilitado en Supabase
 * (Database → Replication). Si no está habilitado, el contador igual
 * funciona correctamente, solo que se actualiza al recargar la pantalla
 * o tras el "bump" optimista de un escaneo propio, en vez de al instante
 * cuando el escaneo lo hace otro dispositivo.
 */
export function useAsistenciaEnVivo(eventoId) {
  const [ingresados, setIngresados] = useState(null); // null = cargando
  const [total, setTotal] = useState(null);

  const refrescar = useCallback(async () => {
    if (!eventoId) return;
    try {
      const d = await clientesApi.list(eventoId, { limit: 1 });
      setIngresados(d.stats?.usado || 0);
      setTotal(d.stats?.total || 0);
    } catch { /* silencioso: no rompemos la pantalla si falla */ }
  }, [eventoId]);

  useEffect(() => { refrescar(); }, [refrescar]);

  /* Los avisos de tiempo real se agrupan antes de pedir nada.

     Suscribirse no era el problema; volver a preguntar por CADA aviso, sí. En
     una jornada de ingreso, cada boleta escaneada notifica a todas las
     pantallas abiertas, y si cada aviso dispara una petición salen N pantallas
     × M escaneos. Agrupado, una ráfaga de cien escaneos son una o dos
     peticiones por pantalla, y el contador va como mucho un segundo por detrás
     — que en un aforo no lo nota nadie. */
  const refrescarAgrupado = useAgrupado(refrescar, 1200);

  useEffect(() => {
    if (!eventoId) return;
    const channel = supabase
      .channel(`asistencia:${eventoId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tickets',
        filter: `evento_id=eq.${eventoId}`,
      }, () => { refrescarAgrupado(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventoId, refrescarAgrupado]);

  /* Bump optimista: lo usa CheckinTab para reflejar el propio escaneo al
     instante, sin esperar el round-trip de Realtime (que puede tardar
     uno o dos segundos). Realtime luego confirma/corrige el número real. */
  const bumpOptimista = useCallback(() => {
    setIngresados(prev => (prev == null ? prev : prev + 1));
  }, []);

  return { ingresados, total, bumpOptimista, refrescar };
}
