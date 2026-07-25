import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

/* Preferencias personales de la pantalla Eventos: vista elegida,
   favoritos y eventos abiertos recientemente. (localStorage por ahora;
   Fase 5 los sincroniza en Ajustes > Espacio de Trabajo.) */
export function useEventosPrefs() {
  const { usuario } = useAuth();
  const KEY = `gestek-eventos-prefs-v1:${usuario?.id || 'anon'}`;

  const [prefs, setPrefs] = useState(() => {
    try { return { vista: 'grid', favoritos: [], recientes: [], ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return { vista: 'grid', favoritos: [], recientes: [] }; }
  });

  const persist = useCallback((next) => {
    setPrefs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
  }, [KEY]);

  const setVista = useCallback((vista) => persist({ ...prefs, vista }), [prefs, persist]);

  const toggleFavorito = useCallback((id) => {
    const favoritos = prefs.favoritos.includes(id)
      ? prefs.favoritos.filter(f => f !== id)
      : [...prefs.favoritos, id];
    persist({ ...prefs, favoritos });
  }, [prefs, persist]);

  const registrarReciente = useCallback((id) => {
    const recientes = [id, ...prefs.recientes.filter(r => r !== id)].slice(0, 8);
    persist({ ...prefs, recientes });
  }, [prefs, persist]);

  return { ...prefs, setVista, toggleFavorito, registrarReciente };
}
