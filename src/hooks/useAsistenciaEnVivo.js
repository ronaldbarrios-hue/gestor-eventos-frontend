import { useState, useEffect, useCallback } from 'react';
import { clientesApi } from '../api/clientes.js';
import { supabase } from '../lib/supabase.js';

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

  useEffect(() => {
    if (!eventoId) return;
    const channel = supabase
      .channel(`asistencia:${eventoId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tickets',
        filter: `evento_id=eq.${eventoId}`,
      }, () => { refrescar(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventoId, refrescar]);

  /* Bump optimista: lo usa CheckinTab para reflejar el propio escaneo al
     instante, sin esperar el round-trip de Realtime (que puede tardar
     uno o dos segundos). Realtime luego confirma/corrige el número real. */
  const bumpOptimista = useCallback(() => {
    setIngresados(prev => (prev == null ? prev : prev + 1));
  }, []);

  return { ingresados, total, bumpOptimista, refrescar };
}
