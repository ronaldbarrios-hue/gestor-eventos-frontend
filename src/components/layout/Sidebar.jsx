import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import GestekMark from './GestekMark.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import Criatura from '../agente/Criatura.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAccesosDirectos, DESTINOS_ACCESO, SECCIONES_EVENTO,
  CATEGORIAS_GENERAL, CATEGORIAS_EVENTO, filtrarYAgrupar } from '../../hooks/useAccesosDirectos.js';
import { eventosApi } from '../../api/eventos.js';

/* ──────────────────────────────────────────────────────────────────
   Sidebar — Rework 2026
   Azul oscuro identitario (tokens bg-sidebar) en AMBOS temas.
   La navegación cambia según usuario.modoActivo (switch en la TopBar):
     · 'organizador' → Inicio · Eventos · Mi Espacio · Vacantes · Ajustes
     · 'asistente'   → Inicio · Explorar · Mis boletas · Ajustes
   (solo cosas relacionadas a explorar eventos y ver tus boletas — nada
   de gestión de eventos propios, en línea con lo que ve un asistente).
   Accesos rápidos personalizables y hotspot de Gestbot solo en modo
   organizador, ya que son funciones de gestión.
   ────────────────────────────────────────────────────────────────── */

const NAV_ITEMS_ORGANIZADOR = [
  { to: '/inicio',     icon: HomeIcon,      label: 'Inicio'     },
  { to: '/eventos',    icon: CalendarIcon,  label: 'Eventos'    },
  { to: '/mi-espacio', icon: BriefcaseIcon, label: 'Mi Espacio' },
  { to: '/vacantes',   icon: VacantesIcon,  label: 'Vacantes'   },
  { to: '/ajustes',    icon: SettingsIcon,  label: 'Ajustes'    },
];

const NAV_ITEMS_ASISTENTE = [
  { to: '/inicio',                icon: HomeIcon,     label: 'Inicio'      },
  { to: '/eventos?tab=explorar',  icon: CompassIcon,  label: 'Explorar'    },
  { to: '/mis-boletas',           icon: TicketIcon,   label: 'Mis boletas' },
  { to: '/ajustes',               icon: SettingsIcon, label: 'Ajustes'     },
];

export default function Sidebar({ mobile = false, onClose }) {
  const { t } = useI18n();
  const { usuario } = useAuth();
  const esAsistente = usuario?.modoActivo === 'asistente';
  const NAV_ITEMS = esAsistente ? NAV_ITEMS_ASISTENTE : NAV_ITEMS_ORGANIZADOR;

  const { accesos, agregar, quitar } = useAccesosDirectos(usuario?.id);
  const [picker, setPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const plusRef = useRef(null);
  const [modo, setModo] = useState('general');      // general | evento
  const [eventos, setEventos] = useState(null);      // lazy: solo al abrir "de un evento"
  const [eventoSel, setEventoSel] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  /* Abre el picker como panel FIJO anclado al botón, hacia la derecha (sobre el
     contenido). En portal para que el sidebar angosto no lo recorte. */
  const abrirPicker = () => {
    const r = plusRef.current?.getBoundingClientRect();
    if (r) {
      const w = 288, margin = 8;
      let left = r.right + margin;
      if (left + w > window.innerWidth - margin) left = Math.max(margin, r.left - w - margin);
      setPickerPos({ top: Math.min(r.bottom + 4, window.innerHeight - 360), left });
    }
    setPicker(true);
  };
  const disponibles = DESTINOS_ACCESO.filter(d => !accesos.some(a => a.to === d.to));

  /* Resultados agrupados por categoría según la vista y el buscador. */
  const gruposGeneral = filtrarYAgrupar(disponibles, busqueda, CATEGORIAS_GENERAL);
  const gruposEvento  = filtrarYAgrupar(SECCIONES_EVENTO, busqueda, CATEGORIAS_EVENTO);

  const verEventos = async () => {
    setModo('evento'); setEventoSel(null);
    if (eventos) return;
    try { const d = await eventosApi.list({ limit: 30 }); setEventos(d.eventos || []); }
    catch { setEventos([]); }
  };
  const cerrarPicker = () => { setPicker(false); setModo('general'); setEventoSel(null); setBusqueda(''); };
  const fijarSeccion = (sec) => {
    agregar({ to: `/eventos/${eventoSel.id}${sec.q}`, label: `${sec.label} · ${eventoSel.titulo}` });
    cerrarPicker();
  };
  return (
    <aside
      className={`${mobile ? 'w-full' : 'w-[var(--sidebar-w)]'} h-full flex-shrink-0
                  bg-sidebar text-slate-300 flex flex-col`}
    >
      {/* ── Logo ── */}
      <div className="px-4 py-5 flex items-center justify-between gap-2">
        <NavLink to="/inicio" className="flex items-center gap-3 group flex-1 min-w-0">
          <div className="flex-shrink-0 transition-transform group-hover:scale-110">
            <GestekMark size={38} />
          </div>
          <span className="font-display font-bold text-white text-base tracking-tight leading-tight">
            GESTEK
          </span>
        </NavLink>
        {mobile && (
          <button
            onClick={onClose}
            aria-label={t('Cerrar')}
            className="w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-sidebar-2 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Indicador de modo actual (informativo, ya que el switch real vive en la TopBar) */}
      {esAsistente && (
        <div className="mx-4 mb-1 px-3 py-1.5 rounded-lg bg-sidebar-2 border border-white/10 text-center">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">{t('Modo Explorar')}</span>
        </div>
      )}

      {/* Separador entre marca y navegación */}
      <div className="mx-4 border-t border-white/10" />

      {/* ── Navegación principal ── */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-1">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {t('Principal')}
        </p>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-colors
               ${isActive
                 ? 'bg-accent text-[#15171C] shadow-glow-sm'
                 : 'text-slate-300 hover:text-white hover:bg-sidebar-2'}`
            }
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            {t(label)}
          </NavLink>
        ))}

        {/* ── Accesos directos (personales) — solo en modo Organizador,
               ya que apuntan a funciones de gestión de eventos ── */}
        {!esAsistente && (
          <div className="pt-5">
            <div className="flex items-center justify-between px-3 pb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{t('Accesos directos')}</p>
              <div className="relative">
                <button ref={plusRef} onClick={() => picker ? cerrarPicker() : abrirPicker()} title={t('Agregar acceso directo')}
                  className="w-5 h-5 rounded-md text-slate-400 hover:text-white hover:bg-sidebar-2 flex items-center justify-center transition-colors leading-none">+</button>
                {picker && createPortal(
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={cerrarPicker} />
                    <div style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, width: 288 }}
                      className="z-[9999] rounded-xl bg-sidebar-2 border border-white/10 shadow-xl overflow-hidden">
                      {/* Dos orígenes: funciones generales o una sección de un evento */}
                      <div className="flex border-b border-white/10">
                        {[['general', t('General')], ['evento', t('De un evento')]].map(([v, l]) => (
                          <button key={v} onClick={() => { setBusqueda(''); v === 'evento' ? verEventos() : (setModo('general'), setEventoSel(null)); }}
                            className={`flex-1 py-2 text-[11px] font-semibold transition-colors
                                        ${modo === v ? 'text-white bg-sidebar-3' : 'text-slate-400 hover:text-white'}`}>
                            {l}
                          </button>
                        ))}
                      </div>

                      {/* Buscador: aparece en General y al estar dentro de un evento */}
                      {(modo === 'general' || (modo === 'evento' && eventoSel)) && (
                        <div className="p-2 border-b border-white/10">
                          <input autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)}
                            placeholder={t('Buscar función…')}
                            className="w-full bg-sidebar-3 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/25" />
                        </div>
                      )}

                      <div className="max-h-80 overflow-y-auto no-scrollbar py-1.5">
                        {modo === 'general' && (
                          gruposGeneral.length === 0
                            ? <p className="px-3 py-2 text-xs text-slate-500">{disponibles.length === 0 ? t('Ya agregaste todas las funciones generales.') : t('Sin resultados.')}</p>
                            : gruposGeneral.map(g => (
                              <GrupoPicker key={g.cat} titulo={g.cat}>
                                {g.items.map(d => (
                                  <ItemPicker key={d.to} label={d.label} onClick={() => { agregar(d); cerrarPicker(); }} />
                                ))}
                              </GrupoPicker>
                            ))
                        )}

                        {modo === 'evento' && !eventoSel && (
                          eventos === null
                            ? <p className="px-3 py-2 text-xs text-slate-500">{t('Cargando eventos…')}</p>
                            : eventos.length === 0
                              ? <p className="px-3 py-2 text-xs text-slate-500">{t('Aún no tienes eventos.')}</p>
                              : eventos.map(ev => (
                                <button key={ev.id} onClick={() => setEventoSel(ev)}
                                  className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-sidebar-3 transition-colors truncate">
                                  {ev.titulo} →
                                </button>
                              ))
                        )}

                        {modo === 'evento' && eventoSel && (<>
                          <button onClick={() => { setEventoSel(null); setBusqueda(''); }}
                            className="w-full text-left px-3 py-1.5 text-[11px] text-slate-400 hover:text-white">← {eventoSel.titulo}</button>
                          {gruposEvento.length === 0
                            ? <p className="px-3 py-2 text-xs text-slate-500">Sin resultados.</p>
                            : gruposEvento.map(g => (
                              <GrupoPicker key={g.cat} titulo={g.cat}>
                                {g.items.map(s => (
                                  <ItemPicker key={s.q} label={s.label} onClick={() => fijarSeccion(s)} />
                                ))}
                              </GrupoPicker>
                            ))}
                        </>)}
                      </div>
                    </div>
                  </>,
                  document.body
                )}
              </div>
            </div>
            {accesos.length === 0 ? (
              <p className="px-3 text-[11px] text-slate-500 leading-snug">Fija aquí lo que más usas (Chats, Explorar, Gestbot…) con el +.</p>
            ) : accesos.map(({ to, label }) => (
              <div key={to} className="group/acc flex items-center">
                <NavLink to={to} onClick={mobile ? onClose : undefined}
                  className={({ isActive }) =>
                    `flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors min-w-0
                     ${isActive ? 'bg-sidebar-3 text-white' : 'text-slate-400 hover:text-white hover:bg-sidebar-2'}`}>
                  <DotIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                  <span className="truncate">{label}</span>
                </NavLink>
                <button onClick={() => quitar(to)} title="Quitar"
                  className="opacity-0 group-hover/acc:opacity-100 w-6 h-6 mr-1 rounded-md text-slate-500 hover:text-danger flex items-center justify-center flex-shrink-0 transition-opacity">×</button>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* ── Hotspot Gestbot — solo en modo Organizador (gestiona eventos, no aplica a comprar boletas) ── */}
      {!esAsistente && (
        <div className="p-3">
          <div className="rounded-2xl bg-sidebar-2 border border-white/5 p-4">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="flex-shrink-0 -my-1"><Criatura mood="happy" size={52} /></div>
              <p className="text-[13px] font-semibold text-white leading-tight">¿Necesitas ayuda en algo?</p>
            </div>
            <NavLink
              to="/gestbot"
              onClick={mobile ? onClose : undefined}
              className="block w-full text-center px-3 py-2 rounded-xl bg-accent hover:bg-accent-dark
                         text-white text-[13px] font-medium transition-colors"
            >
              Abrir Gestbot
            </NavLink>
          </div>
        </div>
      )}
    </aside>
  );
}

/* ── Picker: grupo por categoría e ítem ── */
function GrupoPicker({ titulo, children }) {
  return (
    <div className="pb-1">
      <p className="px-3 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-500">{titulo}</p>
      {children}
    </div>
  );
}
function ItemPicker({ label, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-sidebar-3 transition-colors">
      + {label}
    </button>
  );
}

/* ── Icons ─────────────────────────────────────────────────────── */
function HomeIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function CalendarIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function BriefcaseIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
}
function VacantesIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m9 10.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm2.5 5.5l-1.8-1.8" /></svg>;
}
function SettingsIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function SparkIcon({ className }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l1.9 5.7L19.6 9.6l-5.7 1.9L12 17.2l-1.9-5.7L4.4 9.6l5.7-1.9L12 2zm7 12l.95 2.85L22.8 17.8l-2.85.95L19 21.6l-.95-2.85-2.85-.95 2.85-.95L19 14z"/></svg>;
}
function DotIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5" /></svg>;
}
function CompassIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /></svg>;
}
function TicketIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;
}
