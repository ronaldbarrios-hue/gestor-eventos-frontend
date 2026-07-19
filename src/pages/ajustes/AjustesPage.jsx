import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { supabase } from '../../lib/supabase.js';
import { IDIOMAS, getLang, setLang } from '../../lib/i18n.js';
import { pantallaInicial, setPantallaInicial } from '../../lib/prefs.js';
import SettingsPage, { NotificacionesTab, PagosTab, WhiteLabelTab } from '../settings/SettingsPage.jsx';
import UsersPage from '../users/UsersPage.jsx';

/* ──────────────────────────────────────────────────────────────────
   Ajustes — Rework Fase 5 (estructura del PDF)
   7 apartados + panel lateral informativo.
   "¿Cómo quiero que funcione mi cuenta y mi espacio de trabajo?"
   ────────────────────────────────────────────────────────────────── */

const APARTADOS = [
  { id: 'perfil',        label: 'Mi Perfil',          icon: '👤' },
  { id: 'organizacion',  label: 'Organización',       icon: '🏢' },
  { id: 'espacio',       label: 'Espacio de Trabajo', icon: '🧩' },
  { id: 'notificaciones',label: 'Notificaciones',     icon: '🔔' },
  { id: 'seguridad',     label: 'Seguridad',          icon: '🔐' },
  { id: 'integraciones', label: 'Integraciones',      icon: '🔌' },
  { id: 'preferencias',  label: 'Preferencias',       icon: '⚙️' },
];

export default function AjustesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const apartado = searchParams.get('a') || 'perfil';

  return (
    <div className="grid lg:grid-cols-[220px_1fr_260px] gap-6 items-start animate-[fadeUp_0.4s_ease_both]">
      {/* ── Nav de apartados ── */}
      <nav className="lg:sticky lg:top-4 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
        {APARTADOS.map(a => (
          <button
            key={a.id}
            onClick={() => setSearchParams({ a: a.id })}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors text-left
                        ${apartado === a.id ? 'bg-accent text-white shadow-glow-sm' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}
          >
            <span className="text-base leading-none">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </nav>

      {/* ── Contenido ── */}
      <div key={apartado} className="min-w-0 animate-[fadeUp_0.3s_ease_both]">
        {apartado === 'perfil'         && <SettingsPage />}
        {apartado === 'organizacion'   && <Organizacion />}
        {apartado === 'espacio'        && <EspacioTrabajo />}
        {apartado === 'notificaciones' && <Seccion titulo="Notificaciones" desc="Canales, avisos y push de la plataforma."><NotificacionesTab /></Seccion>}
        {apartado === 'seguridad'      && <Seguridad />}
        {apartado === 'integraciones'  && <Integraciones />}
        {apartado === 'preferencias'   && <Preferencias />}
      </div>

      {/* ── Panel lateral informativo ── */}
      <PanelInfo />
    </div>
  );
}

function Seccion({ titulo, desc, children }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold font-display text-text-1">{titulo}</h1>
        {desc && <p className="text-sm text-text-2 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

/* ── 2. Organización ── */
function Organizacion() {
  return (
    <Seccion titulo="Organización" desc="Miembros, roles globales y auditoría de tu organización.">
      <UsersPage />
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-1 mb-1.5">Roles globales y auditoría general</h3>
        <p className="text-sm text-text-2">Perfiles de organización (Administrador, Gerente, Producción, Marketing, Finanzas, Soporte) y el registro global de acciones llegan en la siguiente iteración del rework. Los permisos por evento siguen configurándose dentro de cada evento.</p>
      </div>
    </Seccion>
  );
}

/* ── 3. Espacio de Trabajo ── */
function EspacioTrabajo() {
  const { usuario } = useAuth();
  const { success } = useToast();
  const [inicial, setInicial] = useState(() => pantallaInicial(usuario?.id));

  const OPCIONES = [
    { value: '/inicio',     label: 'Inicio (dashboard)' },
    { value: '/mi-espacio', label: 'Mi Espacio' },
    { value: '/eventos',    label: 'Eventos' },
  ];

  const resetLayout = (scope, nombre) => {
    try { localStorage.removeItem(`gestek-${scope}-layout-v1:${usuario?.id || 'anon'}`); } catch { /* noop */ }
    success(`Layout de ${nombre} restablecido. Recarga la página para verlo.`);
  };

  return (
    <Seccion titulo="Espacio de Trabajo" desc="Construye tu propio GESTEK: qué ves y en qué orden.">
      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-1 mb-1.5">Pantalla inicial</h3>
          <p className="text-xs text-text-3 mb-3">Qué aparece primero al entrar a GESTEK.</p>
          <div className="flex flex-wrap gap-2">
            {OPCIONES.map(o => (
              <button
                key={o.value}
                onClick={() => { setInicial(o.value); setPantallaInicial(usuario?.id, o.value); success('Preferencia guardada.'); }}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors
                            ${inicial === o.value ? 'bg-accent text-white' : 'bg-surface-2 text-text-2 hover:text-text-1'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-1 mb-1.5">Widgets y layouts</h3>
        <p className="text-xs text-text-3 mb-3">Los widgets se personalizan directamente en cada pantalla con el botón "Personalizar". Aquí puedes restablecerlos.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => resetLayout('inicio', 'Inicio')} className="btn-secondary btn-sm">Restablecer Inicio</button>
          <button onClick={() => resetLayout('mi-espacio', 'Mi Espacio')} className="btn-secondary btn-sm">Restablecer Mi Espacio</button>
        </div>
      </div>
    </Seccion>
  );
}

/* ── 5. Seguridad ── */
function Seguridad() {
  const { updatePassword, logout } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [pass, setPass] = useState({ nueva: '', confirmar: '' });
  const [working, setWorking] = useState(false);

  const cambiar = async (e) => {
    e.preventDefault();
    if (pass.nueva.length < 8) return error('Mínimo 8 caracteres.');
    if (pass.nueva !== pass.confirmar) return error('Las contraseñas no coinciden.');
    setWorking(true);
    try { await updatePassword(pass.nueva); success('Contraseña actualizada.'); setPass({ nueva: '', confirmar: '' }); }
    catch (x) { error(x.message); }
    finally { setWorking(false); }
  };

  const cerrarTodas = async () => {
    setWorking(true);
    try { await supabase.auth.signOut({ scope: 'global' }); } catch { /* noop */ }
    logout(); navigate('/login');
  };

  return (
    <Seccion titulo="Seguridad" desc="Protección de tu cuenta y tus sesiones.">
      <form onSubmit={cambiar} className="card p-5 space-y-3 max-w-md">
        <h3 className="text-sm font-semibold text-text-1">Cambiar contraseña</h3>
        <input type="password" className="input" placeholder="Nueva contraseña" value={pass.nueva} onChange={e => setPass(p => ({ ...p, nueva: e.target.value }))} autoComplete="new-password" />
        <input type="password" className="input" placeholder="Confirmar contraseña" value={pass.confirmar} onChange={e => setPass(p => ({ ...p, confirmar: e.target.value }))} autoComplete="new-password" />
        <button disabled={working} className="btn-primary btn-sm">Actualizar contraseña</button>
      </form>

      <div className="card p-5 max-w-md">
        <h3 className="text-sm font-semibold text-text-1 mb-1.5">Sesiones</h3>
        <p className="text-xs text-text-3 mb-3">Cierra la sesión en todos los dispositivos donde hayas entrado.</p>
        <button onClick={cerrarTodas} disabled={working} className="btn-danger btn-sm">Cerrar todas las sesiones</button>
      </div>

      <div className="card p-5 max-w-md">
        <h3 className="text-sm font-semibold text-text-1 mb-1.5">Autenticación en dos pasos (2FA)</h3>
        <p className="text-sm text-text-2">Verificación por app Authenticator y llaves físicas — en construcción dentro del rework.</p>
      </div>
    </Seccion>
  );
}

/* ── 6. Integraciones ── */
function Integraciones() {
  const PROX = ['Google Calendar', 'Google Meet', 'Slack', 'Discord', 'Notion', 'Zapier', 'Webhooks'];
  return (
    <Seccion titulo="Integraciones" desc="Servicios globales de tu cuenta. Las integraciones de cada evento viven en su Configuración.">
      <PagosTab />
      <WhiteLabelTab />
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-1 mb-2">Próximamente</h3>
        <div className="flex flex-wrap gap-2">
          {PROX.map(s => <span key={s} className="px-3 py-1.5 rounded-full bg-surface-2 border border-border text-xs text-text-2">{s}</span>)}
        </div>
      </div>
    </Seccion>
  );
}

/* ── 7. Preferencias ── */
function Preferencias() {
  const { success } = useToast();
  const [lang, setLangState] = useState(getLang());
  const [reducir, setReducir] = useState(() => { try { return localStorage.getItem('gestek-reducir-animaciones') === '1'; } catch { return false; } });

  const cambiarIdioma = (code) => {
    setLang(code); setLangState(code);
    success('Idioma actualizado. Algunas pantallas lo aplican al recargar.');
  };
  const toggleAnimaciones = () => {
    const next = !reducir;
    setReducir(next);
    try { localStorage.setItem('gestek-reducir-animaciones', next ? '1' : '0'); } catch { /* noop */ }
    success(next ? 'Animaciones reducidas.' : 'Animaciones normales.');
  };

  return (
    <Seccion titulo="Preferencias" desc="Idioma, formatos y accesibilidad.">
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-1 mb-3">Idioma</h3>
        <div className="flex flex-wrap gap-2">
          {IDIOMAS.map(i => (
            <button key={i.code} onClick={() => cambiarIdioma(i.code)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors
                          ${lang === i.code ? 'bg-accent text-white' : 'bg-surface-2 text-text-2 hover:text-text-1'}`}>
              {i.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-1 mb-1.5">Accesibilidad</h3>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <button type="button" role="switch" aria-checked={reducir} onClick={toggleAnimaciones}
            className={`relative w-9 h-5 rounded-full transition-colors ${reducir ? 'bg-accent' : 'bg-surface-3'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${reducir ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
          <span className="text-sm text-text-1">Reducir animaciones</span>
        </label>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-1 mb-1.5">Experimental</h3>
        <p className="text-sm text-text-2">El laboratorio de funciones beta se habilita al final del rework.</p>
      </div>
    </Seccion>
  );
}

/* ── Panel lateral informativo ── */
function PanelInfo() {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const ultimo = usuario?.raw?.last_sign_in_at;

  return (
    <aside className="hidden lg:block lg:sticky lg:top-4 rounded-3xl border border-border bg-surface/60 p-5 space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-3 mb-2">Estado de la cuenta</p>
        <p className="text-sm font-semibold text-text-1 truncate">{usuario?.nombre || 'Usuario'}</p>
        <p className="text-xs text-text-2 truncate">{usuario?.email}</p>
      </div>
      <div className="space-y-2 text-xs">
        <InfoFila k="Organización" v={usuario?.empresa || '—'} />
        <InfoFila k="Último acceso" v={ultimo ? new Date(ultimo).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'} />
        <InfoFila k="Tema" v={theme === 'dark' ? 'Oscuro' : 'Claro'} />
        <InfoFila k="Versión" v="2.0 · Rework" />
      </div>
      <p className="text-[11px] text-text-3 leading-relaxed border-t border-border pt-3">
        Todo lo que pertenece a un evento (branding, boletas, formularios…) se configura dentro del propio evento.
      </p>
    </aside>
  );
}
function InfoFila({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-3">{k}</span>
      <span className="text-text-1 text-right truncate">{v}</span>
    </div>
  );
}
