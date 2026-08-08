import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import SelectorIdioma from '../ui/SelectorIdioma.jsx';
import { notificacionesApi } from '../../api/notificaciones.js';
import { supabase } from '../../lib/supabase.js';

/* ──────────────────────────────────────────────────────────────────
   TopBar — Rework 2026
   Izquierda : hamburger (mobile) + volver + breadcrumb
   Centro    : buscador contextual/global (⌘K — paleta en Fase 1)
   Derecha   : switch Organizador/Explorar · notificaciones · cuenta
   ────────────────────────────────────────────────────────────────── */

const ROOT_PATHS = new Set(['/inicio', '/eventos', '/mi-espacio', '/ajustes']);

const CRUMBS = {
  '/inicio'       : [{ label: 'Inicio' }],
  '/eventos'      : [{ label: 'Eventos' }],
  '/eventos/nuevo': [{ to: '/eventos', label: 'Eventos' }, { label: 'Nuevo evento' }],
  '/mi-espacio'   : [{ label: 'Mi Espacio' }],
  '/ajustes'      : [{ label: 'Ajustes' }],
  '/gestbot'      : [{ label: 'Gestbot' }],
};

function tiempoRelativo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return 'ahora';
  if (diff < 3600)   return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export default function TopBar({ onMenu }) {
  const { pathname }  = useLocation();
  const { usuario, logout, cambiarModo } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { t } = useI18n();
  const navigate      = useNavigate();
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [busqueda,    setBusqueda]    = useState('');
  const [notifs,      setNotifs]      = useState([]);
  const [unread,      setUnread]      = useState(0);
  const [cambiandoModo, setCambiandoModo] = useState(false);
  const loadedRef     = useRef(false);
  const searchRef     = useRef(null);

  const crumbs = CRUMBS[pathname]
    || (pathname.startsWith('/eventos/') ? [{ to: '/eventos', label: 'Eventos' }, { label: 'Detalle' }] : [{ label: 'GESTEK' }]);

  /* ⌘K / Ctrl+K enfoca el buscador (paleta de comandos completa: Fase 1) */
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const onBuscar = (e) => {
    e.preventDefault();
    const q = busqueda.trim();
    if (!q) return;
    navigate(`/eventos?q=${encodeURIComponent(q)}`);
    setBusqueda('');
    searchRef.current?.blur();
  };

  const cargar = useCallback(async () => {
    try {
      const d = await notificacionesApi.list(30);
      setNotifs(d.notificaciones || []);
      setUnread(d.no_leidas || 0);
    } catch { /* silencioso: no rompemos el topbar si falla */ }
  }, []);

  useEffect(() => {
    if (!usuario?.id || loadedRef.current) return;
    loadedRef.current = true;
    cargar();
  }, [usuario?.id, cargar]);

  /* Realtime: nuevas notificaciones para este usuario */
  useEffect(() => {
    if (!usuario?.id) return;
    const channel = supabase
      .channel(`notif:${usuario.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `user_id=eq.${usuario.id}`,
      }, (payload) => {
        setNotifs(prev => [payload.new, ...prev].slice(0, 30));
        setUnread(u => u + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [usuario?.id]);

  const markAllRead = async () => {
    setNotifs(n => n.map(x => ({ ...x, leida: true })));
    setUnread(0);
    try { await notificacionesApi.leerTodas(); } catch { cargar(); }
  };

  const onClickNotif = async (n) => {
    if (!n.leida) {
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, leida: true } : x));
      setUnread(u => Math.max(0, u - 1));
      try { await notificacionesApi.leer(n.id); } catch { /* noop */ }
    }
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleLogout = () => { setAccountOpen(false); logout(); navigate('/login'); };

  /* Switch Organizador/Explorar — estilo píldora tipo Airbnb (Viajar/Anfitrión).
     Persiste en los metadatos del usuario vía cambiarModo() (AuthContext),
     y navega al lugar correcto de cada modo (Sidebar también reacciona a
     usuario.modoActivo, mostrando distinta navegación en cada caso). */
  const modoActivo = usuario?.modoActivo || 'organizador';
  const cambiarAModo = async (modo) => {
    if (modo === modoActivo || cambiandoModo) return;
    setCambiandoModo(true);
    try {
      await cambiarModo(modo);
      navigate(modo === 'asistente' ? '/eventos?tab=explorar' : '/inicio');
    } finally {
      setCambiandoModo(false);
    }
  };

  const showBack = !ROOT_PATHS.has(pathname);
  const initials = usuario?.nombre
    ?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U';

  return (
    <header
      className="flex-shrink-0 bg-surface border-b border-border flex items-center gap-3 px-4 sm:px-6 relative z-40"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
      }}
    >
      {/* Hamburger mobile */}
      <button
        onClick={onMenu}
        aria-label={t('Abrir menú')}
        className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors flex-shrink-0"
      >
        <MenuIcon className="w-5 h-5" />
      </button>
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          aria-label={t('Volver')}
          className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors flex-shrink-0"
        >
          <BackIcon className="w-4 h-4" />
        </button>
      )}

      {/* Breadcrumb */}
      <nav className="hidden sm:flex items-center gap-1.5 text-sm min-w-0 flex-shrink-0">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronIcon className="w-3 h-3 text-text-3 flex-shrink-0" />}
            {c.to
              ? <Link to={c.to} className="text-text-2 hover:text-text-1 transition-colors truncate">{t(c.label)}</Link>
              : <span className="text-text-1 font-medium truncate">{t(c.label)}</span>
            }
          </span>
        ))}
      </nav>

      {/* Buscador contextual / global */}
      <form onSubmit={onBuscar} className="flex-1 flex justify-center min-w-0 px-2">
        <div className="relative w-full max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3 pointer-events-none" />
          <input
            ref={searchRef}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder={t('Buscar en GESTEK…')}
            className="w-full h-9 pl-9 pr-14 rounded-xl bg-surface-2 border border-border text-sm text-text-1
                       placeholder:text-text-3 focus:outline-none focus:border-accent/50 focus:ring-2
                       focus:ring-accent/20 transition-all"
          />
          <kbd className="hidden md:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-0.5
                          px-1.5 py-0.5 rounded-md bg-surface-3 text-[10px] font-medium text-text-3 pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* Right side */}
      <div className="flex items-center gap-1.5 flex-shrink-0">

        {/* Switch Organizador / Explorar */}
        <div className="hidden sm:flex items-center bg-surface-2 border border-border rounded-full p-0.5 mr-1">
          <button
            onClick={() => cambiarAModo('organizador')}
            disabled={cambiandoModo}
            className={`px-3 h-7 rounded-full text-xs font-semibold transition-all disabled:opacity-60
              ${modoActivo === 'organizador'
                ? 'bg-gradient-primary text-[#15171C] shadow-glow-sm'
                : 'text-text-3 hover:text-text-1'}`}
          >
            Organizar
          </button>
          <button
            onClick={() => cambiarAModo('asistente')}
            disabled={cambiandoModo}
            className={`px-3 h-7 rounded-full text-xs font-semibold transition-all disabled:opacity-60
              ${modoActivo === 'asistente'
                ? 'bg-gradient-primary text-[#15171C] shadow-glow-sm'
                : 'text-text-3 hover:text-text-1'}`}
          >
            Explorar
          </button>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setNotifOpen(v => !v)} aria-label={t('Notificaciones')} className="btn-icon btn-ghost relative">
            <BellIcon className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full shadow-glow-sm" />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-11 z-50 w-80 card-glass rounded-2xl overflow-hidden animate-[scaleIn_0.15s_ease_both] origin-top-right">
                <div className="card-header">
                  <h3 className="text-sm font-semibold text-text-1">{t('Notificaciones')}</h3>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                      {t('Marcar todas como leídas')}
                    </button>
                  )}
                </div>
                <div className="divide-y divide-border max-h-80 overflow-y-auto no-scrollbar">
                  {notifs.map(n => (
                    <button
                      key={n.id}
                      onClick={() => onClickNotif(n)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-surface-2/50 ${n.leida ? 'opacity-55' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        {!n.leida && <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />}
                        <div className={`flex-1 min-w-0 ${n.leida ? 'pl-4' : ''}`}>
                          <p className="text-sm text-text-1 font-medium leading-snug">{n.titulo}</p>
                          {n.cuerpo && <p className="text-xs text-text-2 leading-relaxed mt-0.5">{n.cuerpo}</p>}
                          <p className="text-[10px] text-text-3 mt-1">{tiempoRelativo(n.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {notifs.length === 0 && (
                  <p className="text-sm text-text-2 text-center py-10">{t('Sin notificaciones')}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Cuenta del usuario */}
        <div className="relative">
          <button
            onClick={() => setAccountOpen(v => !v)}
            aria-label={t('Cuenta')}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-surface-2 transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-gradient-primary text-[#15171C] text-xs font-bold
                             flex items-center justify-center flex-shrink-0">
              {initials}
            </span>
            <span className="hidden md:block text-sm font-medium text-text-1 max-w-[120px] truncate">
              {usuario?.nombre?.split(' ')[0] || t('Cuenta')}
            </span>
            <ChevronDownIcon className="hidden md:block w-3 h-3 text-text-3" />
          </button>

          {accountOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
              <div className="absolute right-0 top-12 z-50 w-64 card-glass rounded-2xl overflow-hidden animate-[scaleIn_0.15s_ease_both] origin-top-right">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-text-1 truncate">{usuario?.nombre || t('Usuario')}</p>
                  <p className="text-xs text-text-2 truncate">{usuario?.email || ''}</p>
                </div>

                {/* Switch también aquí, visible en mobile donde el de arriba está oculto */}
                <div className="sm:hidden px-4 py-2.5 border-b border-border">
                  <div className="flex items-center bg-surface-2 border border-border rounded-full p-0.5">
                    <button
                      onClick={() => cambiarAModo('organizador')}
                      disabled={cambiandoModo}
                      className={`flex-1 h-7 rounded-full text-xs font-semibold transition-all disabled:opacity-60
                        ${modoActivo === 'organizador' ? 'bg-gradient-primary text-[#15171C]' : 'text-text-3'}`}
                    >
                      {t('Organizar')}
                    </button>
                    <button
                      onClick={() => cambiarAModo('asistente')}
                      disabled={cambiandoModo}
                      className={`flex-1 h-7 rounded-full text-xs font-semibold transition-all disabled:opacity-60
                        ${modoActivo === 'asistente' ? 'bg-gradient-primary text-[#15171C]' : 'text-text-3'}`}
                    >
                      {t('Explorar')}
                    </button>
                  </div>
                </div>

                <div className="py-1.5">
                  <MenuItem onClick={() => { setAccountOpen(false); navigate('/ajustes?a=perfil'); }}>
                    <UserIcon className="w-4 h-4" /> {t('Mi perfil')}
                  </MenuItem>
                  <MenuItem onClick={() => { setAccountOpen(false); navigate('/mis-boletas'); }}>
                    <TicketIcon className="w-4 h-4" /> {t('Mis boletas')}
                  </MenuItem>
                  <MenuItem onClick={toggleTheme}>
                    {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                    {theme === 'dark' ? t('Modo claro') : t('Modo oscuro')}
                  </MenuItem>
                </div>
                <div className="px-4 py-3 border-t border-border">
                  <SelectorIdioma variante="lista" />
                </div>
                <div className="py-1.5 border-t border-border">
                  <MenuItem onClick={handleLogout} danger>
                    <LogoutIcon className="w-4 h-4" /> {t('Cerrar sesión')}
                  </MenuItem>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({ children, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left
                  ${danger ? 'text-danger hover:bg-danger/10' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}
    >
      {children}
    </button>
  );
}

/* ── Icons ─────────────────────────────────────────────────────── */
function MenuIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>;
}
function BellIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
}
function BackIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
}
function ChevronIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
}
function ChevronDownIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
}
function SearchIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
function UserIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function TicketIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;
}
function SunIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function MoonIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
}
function LogoutIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
}
