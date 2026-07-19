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
});

export const supabaseConfigured = Boolean(URL && ANON);

/* Helper: redirect URL absoluta para flujos de email (confirmación, recovery) */
export function authRedirect(path) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${path}`;
}
