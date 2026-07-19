/* Preferencias ligeras del usuario (localStorage; Fase 6: Supabase). */

export function pantallaInicial(userId) {
  try {
    const v = localStorage.getItem(`gestek-pantalla-inicial:${userId || 'anon'}`);
    return ['/inicio', '/mi-espacio', '/eventos'].includes(v) ? v : '/inicio';
  } catch { return '/inicio'; }
}

export function setPantallaInicial(userId, ruta) {
  try { localStorage.setItem(`gestek-pantalla-inicial:${userId || 'anon'}`, ruta); } catch { /* noop */ }
}
