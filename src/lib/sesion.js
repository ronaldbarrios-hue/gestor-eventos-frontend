/* Quién atiende la sesión: nuestro backend o Supabase.
 *
 * Este archivo existe para que ese cambio sea UNA línea de configuración y no
 * un despliegue. Con `VITE_AUTH_PROPIA=true` manda `authPropia`; sin ella,
 * sigue Supabase exactamente como hasta ahora.
 *
 * El interruptor tiene que existir en los dos lados y ponerse en el mismo
 * orden: primero el backend (AUTH_PROPIA_ACTIVA), que puede atender las dos
 * clases de token a la vez, y después el frontend. Al revés —el frontend
 * pidiendo a un backend que todavía no monta /auth— nadie entra.
 *
 * Volver atrás es quitar la variable y recargar. Las sesiones propias que
 * hubiera abiertas dejan de valer y esa gente vuelve a entrar por Supabase;
 * molesto, pero recuperable en segundos, que es de lo que se trata.
 */

import { supabase, supabaseConfigured, authRedirect } from './supabase.js';
import { authPropia } from './authPropia.js';

export const AUTH_PROPIA = import.meta.env.VITE_AUTH_PROPIA === 'true';

/* El objeto que usa el resto de la app. Los dos responden a los mismos
   métodos, así que quien lo usa no sabe cuál le tocó. */
export const auth = AUTH_PROPIA ? authPropia : supabase.auth;

/* Con la auth propia no hace falta configurar Supabase para entrar. */
export const authConfigurado = AUTH_PROPIA ? true : supabaseConfigured;

export { authRedirect };

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.log(`[auth] sesión gestionada por: ${AUTH_PROPIA ? 'backend propio' : 'Supabase'}`);
}
