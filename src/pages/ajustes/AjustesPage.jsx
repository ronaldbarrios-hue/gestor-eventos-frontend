import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { eventosApi } from '../../api/eventos.js';
import { equipoApi } from '../../api/equipo.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { supabase } from '../../lib/supabase.js';
import { useI18n, IDIOMAS } from '../../context/I18nContext.jsx';
import { pantallaInicial, setPantallaInicial } from '../../lib/prefs.js';
import SettingsPage, { NotificacionesTab, PagosTab, WhiteLabelTab, AparienciaCard } from '../settings/SettingsPage.jsx';

/* ──────────────────────────────────────────────────────────────────
   Ajustes — Rework Fase 5 (estructura del PDF)
   7 apartados + panel lateral informativo.
   "¿Cómo quiero que funcione mi cuenta y mi espacio de trabajo?"
   ────────────────────────────────────────────────────────────────── */

const I = (d) => ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
const APARTADOS = [
  /* oculto del menú: el perfil se abre desde el menú de la cuenta (evita duplicarlo) */
  { id: 'perfil', oculto: true, label: 'Mi Perfil',          icon: I('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z') },
  { id: 'organizacion',  label: 'Organización',       icon: I('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4') },
  { id: 'espacio',       label: 'Espacio de Trabajo', icon: I('M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z') },
  { id: 'notificaciones',label: 'Notificaciones',     icon: I('M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9') },
  { id: 'seguridad',     label: 'Seguridad',          icon: I('M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z') },
  { id: 'integraciones', label: 'Integraciones',      icon: I('M13 10V3L4 14h7v7l9-11h-7z') },
  { id: 'preferencias',  label: 'Preferencias',       icon: I('M10.3 4.3c.4-1.8 2.9-1.8 3.4 0a1.7 1.7 0 002.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 001 2.5c1.8.5 1.8 3 0 3.4a1.7 1.7 0 00-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 00-2.6 1c-.5 1.8-3 1.8-3.4 0a1.7 1.7 0 00-2.5-1c-1.6.9-3.3-.9-2.4-2.4a1.7 1.7 0 00-1.1-2.6c-1.8-.4-1.8-2.9 0-3.4a1.7 1.7 0 001.1-2.5c-.9-1.6.8-3.3 2.4-2.4 1 .6 2.3.1 2.5-1.1z M15 12a3 3 0 11-6 0 3 3 0 016 0z') },
];

export default function AjustesPage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const VISIBLES = APARTADOS.filter(a => !a.oculto);
  const apartado = searchParams.get('a') || VISIBLES[0].id;

  return (
    <div className="grid lg:grid-cols-[220px_1fr_260px] gap-6 items-start animate-[fadeUp_0.4s_ease_both]">
      {/* ── Nav de apartados ── */}
      <nav className="lg:sticky lg:top-4 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
        {VISIBLES.map(a => (
          <button
            key={a.id}
            onClick={() => setSearchParams({ a: a.id })}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors text-left
                        ${apartado === a.id ? 'bg-accent text-[#15171C] shadow-glow-sm' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}
          >
            <a.icon className="w-[17px] h-[17px] flex-shrink-0" />
            {t(a.label)}
          </button>
        ))}
      </nav>

      {/* ── Contenido ── */}
      <div key={apartado} className="min-w-0 animate-[fadeUp_0.3s_ease_both]">
        {apartado === 'perfil'         && <SettingsPage />}
        {apartado === 'organizacion'   && <Organizacion />}
        {apartado === 'espacio'        && <EspacioTrabajo />}
        {apartado === 'notificaciones' && <Seccion titulo={t('Notificaciones')} desc={t('Canales, avisos y push de la plataforma.')}><NotificacionesTab /></Seccion>}
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
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold font-display text-text-1">{t(titulo)}</h1>
        {desc && <p className="text-sm text-text-2 mt-0.5">{t(desc)}</p>}
      </div>
      {children}
    </div>
  );
}

/* ── 2. Organización ──

   #46 · Esto decía "Solo para administradores" y al administrador tampoco le
   salía nada. Dos fallos encadenados:

   1. La puerta era imposible de cruzar. Pedía `hasPermiso('usuarios:ver')` o
      el rol `admin_global`, y ninguna cuenta real los tiene: toda cuenta nace
      como 'organizador' y ese rol no incluye ningún permiso `usuarios:*`. El
      dueño de la cuenta veía el mismo cartel que un invitado.
   2. Al otro lado no había nada que ver: dos tarjetas explicando que los
      roles globales todavía no existen.

   La puerta se quita porque no hay a qué darle acceso: en GESTEK los roles
   son POR EVENTO, no de organización. Y en vez de dos avisos, se pone lo
   único que sí existe a nivel de cuenta y sí se usa: la identidad de la
   organización —que sale en todas las páginas públicas— y quién está en tus
   equipos, sacado de los eventos de verdad. */
function Organizacion() {
  return (
    <Seccion titulo="Organización" desc="La identidad de tu cuenta y quién trabaja contigo.">
      <EquipoDeLaOrganizacion />

      {/* La marca de la cuenta: lo que se ve en cada página pública que no
          tenga marca propia de evento. Es el ajuste de organización con más
          consecuencias, y estaba escondido en otra pestaña. */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-1 mb-3">Identidad de la organización</h3>
        <WhiteLabelTab />
      </div>

      <p className="text-xs text-text-3 leading-relaxed">
        Los roles no son de la organización sino de cada evento: alguien puede ser de
        logística en uno y no tener nada que ver con el siguiente. Por eso se invita y
        se dan permisos desde <strong className="text-text-2">el evento → Equipo y roles</strong>.
        Un registro global de acciones para toda la cuenta todavía no existe.
      </p>
    </Seccion>
  );
}

/* Quién está en mis equipos, juntando los miembros de todos mis eventos.

   No hay tabla de "usuarios de la organización" —ni endpoint— porque la
   pertenencia es por evento. Así que se compone: se piden los eventos y el
   equipo de cada uno, y se agrupa por persona. Es lo que alguien viene a
   buscar aquí ("¿quién tiene acceso a mis cosas?") y hasta ahora no se podía
   responder desde ninguna pantalla. */
function EquipoDeLaOrganizacion() {
  const [gente, setGente] = useState(null);   // null = cargando
  const [parcial, setParcial] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { eventos = [] } = await eventosApi.list({ limit: 50 });
        const mios = eventos.filter(e => e.soyOwner);
        /* Un equipo por evento es una petición por evento. Se cortan en doce
           para no disparar cincuenta llamadas desde una pantalla de ajustes,
           y se avisa cuando se corta en vez de enseñar una lista incompleta
           como si fuera todo. */
        const TOPE = 12;
        const usados = mios.slice(0, TOPE);
        if (vivo) setParcial(mios.length > TOPE);

        const equipos = await Promise.allSettled(usados.map(e => equipoApi.list(e.id)));
        const porPersona = new Map();
        equipos.forEach((r, i) => {
          if (r.status !== 'fulfilled') return;
          for (const m of (r.value.miembros || [])) {
            /* Quien aún no ha aceptado no tiene perfil: sólo el correo al que
               se le mandó la invitación. Se agrupa por eso para que no salga
               dos veces cuando por fin entre. */
            const id = m.profile?.id || m.email;
            if (!id) continue;
            const previo = porPersona.get(id) || {
              id,
              nombre: m.profile?.nombre || m.nombre_invitado || m.email || 'Sin nombre',
              email : m.profile?.email || m.email || '',
              avatar: m.profile?.avatar_url || null,
              donde : [],
            };
            previo.donde.push({
              evento: usados[i].titulo,
              eventoId: usados[i].id,
              rol: m.rol_detail?.nombre || m.rol || 'Miembro',
              activo: m.status === 'active',
            });
            porPersona.set(id, previo);
          }
        });
        if (vivo) setGente([...porPersona.values()].sort((a, b) => b.donde.length - a.donde.length));
      } catch {
        if (vivo) setGente([]);
      }
    })();
    return () => { vivo = false; };
  }, []);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-text-1">Quién trabaja contigo</h3>
        <Link to="/eventos" className="text-xs text-accent hover:underline">Gestionar por evento →</Link>
      </div>

      {gente === null ? (
        <p className="text-sm text-text-3 py-4">Juntando los equipos de tus eventos…</p>
      ) : gente.length === 0 ? (
        <p className="text-sm text-text-2 leading-relaxed">
          Todavía no has invitado a nadie. Se invita desde cada evento, en
          <strong className="text-text-1"> Organización → Equipo y roles</strong>.
        </p>
      ) : (
        <ul className="divide-y divide-border -mx-5">
          {gente.map(p => (
            <li key={p.id} className="flex items-start gap-3 px-5 py-3">
              <span className="w-9 h-9 rounded-xl bg-surface-2 overflow-hidden flex items-center justify-center text-xs font-bold text-text-2 flex-shrink-0">
                {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : (p.nombre[0] || '?').toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-1 truncate">{p.nombre}</p>
                {p.email && <p className="text-[11px] text-text-3 truncate">{p.email}</p>}
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.donde.map((d, i) => (
                    <Link key={i} to={`/eventos/${d.eventoId}`}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors
                        ${d.activo
                          ? 'border-border text-text-2 hover:text-text-1 hover:border-accent/50'
                          : 'border-warning/40 text-warning'}`}>
                      {d.rol} · {d.evento}{d.activo ? '' : ' (sin aceptar)'}
                    </Link>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {parcial && (
        <p className="text-[11px] text-text-3 mt-3">
          Se muestran los equipos de tus doce eventos más recientes.
        </p>
      )}
    </div>
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
  const { t, lang, setLang } = useI18n();
  const [reducir, setReducir] = useState(() => { try { return localStorage.getItem('gestek-reducir-animaciones') === '1'; } catch { return false; } });

  const cambiarIdioma = (code) => {
    if (code === lang) return;
    setLang(code);
    success(code === 'en' ? 'Language updated.' : 'Idioma actualizado.');
  };
  const toggleAnimaciones = () => {
    const next = !reducir;
    setReducir(next);
    try { localStorage.setItem('gestek-reducir-animaciones', next ? '1' : '0'); } catch { /* noop */ }
    success(next ? t('Animaciones reducidas.') : t('Animaciones normales.'));
  };

  return (
    <Seccion titulo={t('Preferencias')} desc={t('Apariencia, idioma, formatos y accesibilidad.')}>
      <AparienciaCard />
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-1 mb-3">{t('Idioma')}</h3>
        <div className="flex flex-wrap gap-2">
          {IDIOMAS.map(i => (
            <button key={i.code} onClick={() => cambiarIdioma(i.code)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors
                          ${lang === i.code ? 'bg-accent text-[#15171C]' : 'bg-surface-2 text-text-2 hover:text-text-1'}`}>
              {i.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-1 mb-1.5">{t('Accesibilidad')}</h3>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <button type="button" role="switch" aria-checked={reducir} onClick={toggleAnimaciones}
            className={`relative w-9 h-5 rounded-full transition-colors ${reducir ? 'bg-accent' : 'bg-surface-3'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${reducir ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
          <span className="text-sm text-text-1">{t('Reducir animaciones')}</span>
        </label>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-1 mb-1.5">{t('Experimental')}</h3>
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
