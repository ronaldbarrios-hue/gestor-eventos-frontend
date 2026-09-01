import { createClient } from '@supabase/supabase-js';

const URL  = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !ANON) {
  /* No bloqueamos la app en dev — solo avisamos. Si están vacíos, las
     funciones de auth fallarán con un error claro. */
  console.warn(
    '[supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env. ' +
    'El auth no funcionará hasta que se configuren. Ver docs/SUPABASE_SETUP.md'
  );
}

export const supabase = createClient(URL || 'http://localhost', ANON || 'invalid', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  /* Realtime: latido cada 50 s (por defecto son 25). Supabase corta la conexión
     a los 60 s sin latido, así que 50 es el máximo seguro. Con esto una pestaña
     con un canal abierto y nadie mirando pasa de ~2,4 peticiones/min a ~1,2.
     Lo que de verdad ahorra —no abrir el socket salvo cuando hace falta— va en
     cada hook (useAsistenciaEnVivo usa sondeo; ChatTab sólo con la pestaña
     visible). El plan es quitar Realtime del todo: ver MIGRACION-SUPABASE.md §6. */
  realtime: {
    heartbeatIntervalMs: 50000,
    params: { eventsPerSecond: 3 },
  },
});

export const supabaseConfigured = Boolean(URL && ANON);

/* Helper: redirect URL absoluta para flujos de email (confirmación, recovery) */
export function authRedirect(path) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${path}`;
}
