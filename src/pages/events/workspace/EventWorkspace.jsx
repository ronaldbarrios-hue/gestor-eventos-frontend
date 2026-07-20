import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link, NavLink } from 'react-router-dom';
import { eventosApi } from '../../../api/eventos.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import { EstadoBadge } from '../../../components/ui/Badge.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import GestekMark from '../../../components/layout/GestekMark.jsx';
import Criatura from '../../../components/agente/Criatura.jsx';
import TopBar from '../../../components/layout/TopBar.jsx';

import ResumenSection    from './ResumenSection.jsx';
import WhiteLabelSection from './WhiteLabelSection.jsx';
import PaginaPublicaTab  from '../tabs/PaginaPublicaTab.jsx';
import FormularioTab     from '../tabs/FormularioTab.jsx';
import EquipoTab         from '../tabs/EquipoTab.jsx';
import TareasTab         from '../tabs/TareasTab.jsx';
import SolicitudesTab    from '../tabs/SolicitudesTab.jsx';
import AgendaTab         from '../tabs/AgendaTab.jsx';
import RankingTab        from '../tabs/RankingTab.jsx';
import TicketsTab        from '../tabs/TicketsTab.jsx';
import AnalyticsTab      from '../tabs/AnalyticsTab.jsx';
import ClientesTab       from '../tabs/ClientesTab.jsx';
import CheckinTab        from '../tabs/CheckinTab.jsx';
import WaitlistTab       from '../tabs/WaitlistTab.jsx';
import NetworkingTab     from '../tabs/NetworkingTab.jsx';
import TorneoTab         from '../tabs/TorneoTab.jsx';
import ChatTab           from '../tabs/ChatTab.jsx';
import PlaceholderTab    from '../tabs/PlaceholderTab.jsx';
import BroadcastModal    from '../BroadcastModal.jsx';

/* ──────────────────────────────────────────────────────────────────
   Workspace del evento — Rework Fase 3
   "Cada evento es un Workspace independiente dentro de GESTEK."
   Al entrar, todo el sistema cambia de contexto: sidebar propio con
   las 7 secciones del PDF (+ Dinámicas), badge de rol y salida clara.
   ────────────────────────────────────────────────────────────────── */

const CATEGORIAS_NETWORKING = ['negocios', 'marketing', 'tecnologia'];
const CATEGORIAS_TORNEO     = ['deportes'];

/* Secciones y sub-tabs. perm: permiso requerido para miembros (owner ve todo).
   null = todo el equipo. 'placeholder' marca módulos aún en construcción. */
const SECCIONES = [
  { id: 'resumen', label: 'Resumen', icon: HomeIcon, tabs: [
    { id: 'general', label: 'Resumen', perm: null },
  ]},
  { id: 'experience', label: 'Event Experience', icon: SparkIcon, tabs: [
    { id: 'landing',    label: 'Landing',     perm: 'editar_pagina_publica' },
    { id: 'formularios', label: 'Formularios', perm: 'gestionar_tickets' },
    { id: 'whitelabel', label: 'White Label', perm: 'editar_pagina_publica' },
    { id: 'checkout',   label: 'Checkout',    perm: 'gestionar_tickets',    placeholder: ['Checkout', 'Pasos de compra, métodos de pago, confirmaciones, campos y validaciones.'] },
    { id: 'emails',     label: 'Emails',      perm: 'editar_pagina_publica', placeholder: ['Emails', 'Personaliza confirmación, QR, recordatorios, cancelaciones y bienvenida.'] },
    { id: 'seo',        label: 'SEO',         perm: 'editar_pagina_publica', placeholder: ['SEO', 'Meta tags, Open Graph, analytics, pixel y scripts del sitio público.'] },
  ]},
  { id: 'organizacion', label: 'Organización', icon: UsersIcon, tabs: [
    { id: 'equipo',      label: 'Equipo y roles', perm: ['gestionar_roles', 'invitar_staff', 'remover_miembros'] },
    { id: 'tareas',      label: 'Tareas',      perm: null },
    { id: 'solicitudes', label: 'Sugerencias', perm: null },
    { id: 'agenda',      label: 'Agenda',      perm: null },
    { id: 'ranking',     label: 'Ranking',     perm: null },
  ]},
  { id: 'comercial', label: 'Comercial', icon: WalletIcon, tabs: [
    { id: 'boletas',      label: 'Boletas',      perm: 'gestionar_tickets' },
    { id: 'pagos',        label: 'Pagos',        perm: 'ver_pagos' },
    { id: 'analytics',    label: 'Analytics',    perm: 'ver_analytics' },
    { id: 'promociones',  label: 'Promociones',  perm: 'gestionar_tickets', placeholder: ['Promociones', 'Cupones, descuentos, preventas y accesos VIP.'] },
    { id: 'facturacion',  label: 'Facturación',  perm: 'ver_pagos',         placeholder: ['Facturación', 'Facturas, historial y exportaciones contables.'] },
  ]},
  { id: 'asistentes', label: 'Asistentes', icon: TicketIcon, tabs: [
    { id: 'clientes',     label: 'Clientes',        perm: 'ver_clientes' },
    { id: 'checkin',      label: 'Check-in',        perm: 'checkin' },
    { id: 'waitlist',     label: 'Lista de espera', perm: '__solo_owner__' },
    { id: 'invitaciones', label: 'Invitaciones',    perm: 'ver_clientes', placeholder: ['Invitaciones', 'Invitados especiales: VIP, prensa, speakers y patrocinadores.'] },
    { id: 'credenciales', label: 'Credenciales',    perm: 'checkin',      placeholder: ['Credenciales', 'Generación de carnets, escarapelas e identificaciones.'] },
  ]},
  { id: 'dinamicas', label: 'Dinámicas', icon: TrophyIcon, tabs: [
    { id: 'networking', label: 'Rueda de negocios', perm: null },
    { id: 'torneo',     label: 'Torneo',            perm: ['gestionar_torneo'] },
  ]},
  { id: 'comunicacion', label: 'Comunicación', icon: ChatIcon, tabs: [
    { id: 'chat',     label: 'Chats',    perm: null },
    { id: 'anuncios', label: 'Anuncios', perm: '__solo_owner__' },
  ]},
  { id: 'configuracion', label: 'Configuración', icon: CogIcon, tabs: [
    { id: 'general',          label: 'General',          perm: '__solo_owner__' },
    { id: 'integraciones',    label: 'Integraciones',    perm: '__solo_owner__', placeholder: ['Integraciones', 'Mercado Pago, llave Bre-B, Google, Meta, Zapier y webhooks del evento.'] },
    { id: 'automatizaciones', label: 'Automatizaciones', perm: '__solo_owner__', placeholder: ['Automatizaciones', 'Reglas tipo: compra realizada → enviar email → generar QR → wallet.'] },
    { id: 'api',              label: 'API',              perm: '__solo_owner__', placeholder: ['API', 'Tokens, webhooks y SDK para integraciones externas.'] },
    { id: 'seguridad',        label: 'Seguridad',        perm: '__solo_owner__', placeholder: ['Seguridad', 'Dominios permitidos, CORS, accesos y auditoría técnica.'] },
  ]},
];

function puedeVer(perm, soyOwner, permisos) {
  if (soyOwner) return true;
  if (perm == null) return true;
  if (perm === '__solo_owner__') return false;
  const arr = Array.isArray(perm) ? perm : [perm];
  return arr.some(p => (permisos || []).includes(p));
}

export default function EventWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { success, error: toastErr } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [evento, setEvento]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');
  const [soyOwner, setSoyOwner] = useState(true);
  const [permisos, setPermisos] = useState(['*']);
  const [working, setWorking]   = useState(false);
  const [drawer, setDrawer]     = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const seccionId = searchParams.get('s') || 'resumen';
  const tabId     = searchParams.get('t') || '';

  useEffect(() => {
    setLoading(true);
    eventosApi.get(id)
      .then(d => {
        setEvento(d.evento);
        setSoyOwner(d.soyOwner !== false);
        setPermisos(d.permisos || ['*']);
      })
      .catch(e => setErr(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const reload = useCallback(async () => {
    try { const d = await eventosApi.get(id); setEvento(d.evento); } catch { /* noop */ }
  }, [id]);

  /* Secciones visibles según permisos y categoría */
  const secciones = useMemo(() => {
    if (!evento) return [];
    const permiteNetworking = CATEGORIAS_NETWORKING.includes(evento.categoria?.slug);
    const permiteTorneo     = CATEGORIAS_TORNEO.includes(evento.categoria?.slug);
    return SECCIONES
      .map(s => ({
        ...s,
        tabs: s.tabs
          .filter(t => puedeVer(t.perm, soyOwner, permisos))
          .filter(t => t.id !== 'networking' || permiteNetworking)
          .filter(t => t.id !== 'torneo' || permiteTorneo),
      }))
      .filter(s => s.tabs.length > 0);
  }, [evento, soyOwner, permisos]);

  const seccion   = secciones.find(s => s.id === seccionId) || secciones[0];
  const tabActivo = seccion?.tabs.find(t => t.id === tabId) || seccion?.tabs[0];

  const irA = (sId, tId) => {
    const next = { s: sId };
    if (tId) next.t = tId;
    setSearchParams(next, { replace: false });
    setDrawer(false);
  };

  /* Acciones de cabecera */
  const publicar = async () => {
    setWorking(true);
    try { await eventosApi.publicar(id); await reload(); success('Evento publicado.'); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setWorking(false); }
  };
  const eliminar = async () => {
    if (!(await confirmDialog({ title: 'Eliminar evento', message: '¿Eliminar este evento? Esta acción no se puede deshacer.', confirmLabel: 'Eliminar', danger: true }))) return;
    setWorking(true);
    try { await eventosApi.delete(id); success('Evento eliminado.'); navigate('/eventos'); }
    catch (e) { toastErr(e.response?.data?.error || e.message); setWorking(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-bg"><GLoader size="lg" message="Cargando evento…" /></div>;
  if (!evento) return (
    <div className="h-screen flex flex-col items-center justify-center bg-bg gap-4">
      <p className="text-text-2">{err || 'Evento no encontrado.'}</p>
      <Link to="/eventos" className="btn-secondary">← Volver a eventos</Link>
    </div>
  );

  const rolLabel = soyOwner ? 'Administrando' : 'Trabajando en';

  const sidebar = (
    <aside className="w-[264px] h-full flex-shrink-0 bg-sidebar text-slate-300 flex flex-col">
      {/* Logo → volver a la app */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <NavLink to="/inicio" className="flex items-center gap-2.5 group">
          <GestekMark size={30} />
          <span className="font-display font-bold text-white text-sm tracking-tight">GESTEK</span>
        </NavLink>
      </div>

      {/* Contexto del evento */}
      <div className="mx-3 mb-2 rounded-2xl bg-sidebar-2 border border-white/5 p-3.5">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Evento activo</p>
        <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{evento.titulo}</p>
        <div className="flex flex-col items-start gap-1.5 mt-2.5">
          <EstadoBadge estado={evento.estado} />
          <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-1 rounded-md
                            ${soyOwner ? 'bg-accent/20 text-accent-light' : 'bg-primary/20 text-primary-light'}`}>
            {rolLabel}
          </span>
        </div>
      </div>

      {/* Secciones */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-1 space-y-0.5">
        {secciones.map(s => {
          const act = s.id === seccion?.id;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => irA(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors text-left
                          ${act ? 'bg-accent text-white shadow-glow-sm' : 'text-slate-300 hover:text-white hover:bg-sidebar-2'}`}
            >
              <Icon className="w-[17px] h-[17px] flex-shrink-0" />
              {s.label}
            </button>
          );
        })}
      </nav>

      {/* Gestbot + salir */}
      <div className="p-3 space-y-2">
        <div className="rounded-2xl bg-sidebar-2 border border-white/5 p-3.5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex-shrink-0 -my-1"><Criatura mood="happy" size={44} /></div>
            <p className="text-[13px] font-semibold text-white leading-tight">¿Necesitas ayuda?</p>
          </div>
          <Link to="/gestbot" className="block w-full text-center px-3 py-2 rounded-xl bg-accent hover:bg-accent-dark text-white text-[13px] font-medium transition-colors">
            Abrir Gestbot
          </Link>
        </div>
        <Link to="/eventos" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] text-slate-400 hover:text-white hover:bg-sidebar-2 transition-colors">
          <BackIcon className="w-4 h-4" /> Salir del evento
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex">{sidebar}</div>

      {/* Drawer mobile */}
      <div className={`lg:hidden fixed inset-0 z-40 transition-opacity ${drawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-bg/70 backdrop-blur-md" onClick={() => setDrawer(false)} />
        <div className={`absolute top-0 left-0 h-full w-[280px] max-w-[85vw] transform transition-transform duration-300 ${drawer ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebar}
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onMenu={() => setDrawer(true)} />
        <main className="relative flex-1 overflow-y-auto">
          <div className="relative z-10 p-4 sm:p-6 w-full space-y-5">

            {/* Header de sección */}
            <header className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-text-3 mb-0.5">{evento.titulo}</p>
                <h1 className="text-xl sm:text-2xl font-bold font-display text-text-1 tracking-tight">{seccion?.label}</h1>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a href={`/explorar/${evento.slug}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                  <EyeIcon className="w-4 h-4" /> Ver sitio público
                </a>
                {soyOwner && ['borrador', 'configuracion'].includes(evento.estado) && (
                  <button onClick={publicar} disabled={working} className="btn-gradient btn-sm">Publicar evento</button>
                )}
                {soyOwner && (
                  <div className="relative group/menu">
                    <MenuHeader
                      evento={evento}
                      onEditar={() => navigate(`/eventos/${evento.id}/editar`)}
                      onAnuncio={() => setBroadcastOpen(true)}
                      onEliminar={eliminar}
                    />
                  </div>
                )}
              </div>
            </header>

            {/* Sub-tabs de la sección */}
            {seccion && seccion.tabs.length > 1 && (
              <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-border -mx-4 px-4 sm:mx-0 sm:px-0">
                {seccion.tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => irA(seccion.id, t.id)}
                    className={`relative px-4 py-2.5 text-[14px] font-medium whitespace-nowrap transition-colors
                                ${tabActivo?.id === t.id ? 'text-text-1' : 'text-text-3 hover:text-text-2'}`}
                  >
                    {t.label}
                    {tabActivo?.id === t.id && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />}
                  </button>
                ))}
              </div>
            )}

            {/* Contenido */}
            <div key={`${seccion?.id}-${tabActivo?.id}`} className="animate-[fadeUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
              <Contenido seccion={seccion} tab={tabActivo} evento={evento} soyOwner={soyOwner} reload={reload} onAnuncio={() => setBroadcastOpen(true)} />
            </div>
          </div>
        </main>
      </div>

      {broadcastOpen && <BroadcastModal evento={evento} onClose={() => setBroadcastOpen(false)} />}
    </div>
  );
}

function Contenido({ seccion, tab, evento, soyOwner, reload, onAnuncio }) {
  if (!seccion || !tab) return null;
  if (tab.placeholder) return <PlaceholderTab title={tab.placeholder[0]} desc={tab.placeholder[1]} icon="spark" />;

  const k = `${seccion.id}/${tab.id}`;
  switch (k) {
    case 'resumen/general'          : return <ResumenSection evento={evento} soyOwner={soyOwner} reload={reload} />;
    case 'experience/landing'       : return <PaginaPublicaTab evento={evento} />;
    case 'experience/formularios'   : return <FormularioTab evento={evento} />;
    case 'experience/whitelabel'    : return <WhiteLabelSection evento={evento} reload={reload} />;
    case 'organizacion/equipo'      : return <EquipoTab evento={evento} />;
    case 'organizacion/tareas'      : return <TareasTab evento={evento} />;
    case 'organizacion/solicitudes' : return <SolicitudesTab evento={evento} />;
    case 'organizacion/agenda'      : return <AgendaTab evento={evento} />;
    case 'organizacion/ranking'     : return <RankingTab evento={evento} />;
    case 'comercial/boletas'        : return <TicketsTab evento={evento} />;
    case 'comercial/pagos'          : return <PlaceholderTab title="Pagos" desc="Conecta Mercado Pago o configura tu llave Bre-B; revisa transacciones y reembolsos." icon="wallet" />;
    case 'comercial/analytics'      : return <AnalyticsTab evento={evento} />;
    case 'asistentes/clientes'      : return <ClientesTab evento={evento} />;
    case 'asistentes/checkin'       : return <CheckinTab evento={evento} />;
    case 'asistentes/waitlist'      : return <WaitlistTab evento={evento} />;
    case 'dinamicas/networking'     : return <NetworkingTab evento={evento} soyOwner={soyOwner} />;
    case 'dinamicas/torneo'         : return <TorneoTab evento={evento} soyOwner={soyOwner} />;
    case 'comunicacion/chat'        : return <ChatTab evento={evento} />;
    case 'comunicacion/anuncios'    : return (
      <div className="card p-8 text-center max-w-lg mx-auto">
        <h3 className="text-lg font-semibold text-text-1 mb-2">Anuncios del evento</h3>
        <p className="text-sm text-text-2 mb-5">Envía un comunicado oficial a todo el equipo del evento (push + in-app).</p>
        <button onClick={onAnuncio} className="btn-primary">Redactar anuncio</button>
      </div>
    );
    case 'configuracion/general'    : return <ConfigGeneral evento={evento} />;
    default: return <PlaceholderTab title={tab.label} desc="Módulo en construcción dentro del rework." icon="spark" />;
  }
}

function ConfigGeneral({ evento }) {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="card">
        <div className="card-header"><h3 className="text-base font-semibold text-text-1">Información del evento</h3></div>
        <div className="card-body space-y-3 text-sm">
          <Fila k="Nombre"    v={evento.titulo} />
          <Fila k="Slug"      v={`/explorar/${evento.slug}`} mono />
          <Fila k="Estado"    v={<EstadoBadge estado={evento.estado} />} />
          <Fila k="Zona horaria" v={evento.timezone || 'America/Bogota'} />
        </div>
        <div className="card-body border-t border-border">
          <Link to={`/eventos/${evento.id}/editar`} className="btn-secondary btn-sm">Editar información completa</Link>
        </div>
      </div>
    </div>
  );
}
function Fila({ k, v, mono }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-text-3">{k}</span>
      <span className={`text-text-1 text-right ${mono ? 'font-mono text-xs' : ''}`}>{v}</span>
    </div>
  );
}

function MenuHeader({ onEditar, onAnuncio, onEliminar }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} aria-label="Más acciones" className="btn-icon btn-ghost">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-52 card-glass rounded-xl overflow-hidden py-1.5">
            <button onClick={() => { setOpen(false); onEditar(); }} className="w-full text-left px-3.5 py-2 text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">Editar información</button>
            <button onClick={() => { setOpen(false); onAnuncio(); }} className="w-full text-left px-3.5 py-2 text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">Enviar anuncio</button>
            <div className="border-t border-border my-1" />
            <button onClick={() => { setOpen(false); onEliminar(); }} className="w-full text-left px-3.5 py-2 text-sm text-danger hover:bg-danger/10 transition-colors">Eliminar evento</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Icons ── */
function HomeIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function SparkIcon({ className }) { return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l1.9 5.7L19.6 9.6l-5.7 1.9L12 17.2l-1.9-5.7L4.4 9.6l5.7-1.9L12 2zm7 12l.95 2.85L22.8 17.8l-2.85.95L19 21.6l-.95-2.85-2.85-.95 2.85-.95L19 14z"/></svg>; }
function UsersIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>; }
function WalletIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>; }
function TicketIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>; }
function TrophyIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4m7-13a3 3 0 003-3V3H6v2a3 3 0 003 3m6 0a6 6 0 11-6 0m9-3h2a2 2 0 01-2 2m-13-2H3a2 2 0 002 2" /></svg>; }
function ChatIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>; }
function CogIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function BackIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>; }
function EyeIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>; }
