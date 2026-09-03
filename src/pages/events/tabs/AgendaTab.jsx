import { useEffect, useMemo, useState } from 'react';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { agendaApi } from '../../../api/agenda.js';
import { torneosApi } from '../../../api/torneos.js';
import GLoader from '../../../components/ui/GLoader.jsx';
import { TIPOS_ESPACIO, TIPO_DEFECTO, tipoEstilo } from '../../../lib/espacio.js';
/* Este archivo tenía la versión buena del cálculo; ahora la comparte en vez de
   guardársela, que es lo que dejaba a la agenda pública y al torneo con la mala. */
import { ymdLocal as ymd } from '../../../lib/fechaLocal.js';
import PedirDinamica from '../../../components/eventos/PedirDinamica.jsx';
import Icono from '../../../components/ui/Iconos.jsx';
import {
  horaCorta, MES_LARGO, DIA_SEMANA,
  startOfDay, startOfMonth, startOfWeek, addDays, dmy,
  PlusIcon, ChevL, ChevR, EmptyState,
} from './agenda/agendaComun.jsx';
import SessionForm from './agenda/SessionForm.jsx';
import SessionsList from './agenda/AgendaLista.jsx';
import SalasGrid from './agenda/SalasGrid.jsx';
import { MesGrid, SemanaGrid, DiaTimeline } from './agenda/AgendaVistas.jsx';
import SpeakersList, { SpeakerForm } from './agenda/AgendaSpeakers.jsx';

/* "Espacio del evento" — el calendario de TODO lo que pasa dentro del evento:
   charlas, stands, competencias, shows… (antes solo "agenda"). Cada sub-evento
   tiene un tipo (color) y, si es competitivo, enlaza a las llaves del torneo.
   Vistas: Lista / Día / Semana / Mes / Salas. Disponible para cualquier evento.

   Aquí queda el armazón: cargar los datos, el conmutador de vistas y el
   reparto. Cada vista y el formulario viven en `agenda/`, porque el archivo
   pasaba de 1.200 líneas y las cinco vistas comparten helpers que estaban al
   final, después de todo lo demás. */

/* `vistaFija` separa «Speakers» a su propia pestaña del menú. Era un
   conmutador dentro del Calendario y por eso no se encontraba: para ver los
   ponentes había que entrar a las sesiones primero. Sin `vistaFija` el
   conmutador sigue estando, que es lo que quiere quien ya está aquí dentro. */
export default function AgendaTab({ evento, vistaFija = null }) {
  const { usuario } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [torneos,  setTorneos]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState(vistaFija || 'sessions'); // sessions | speakers
  const [subView,  setSubView]  = useState('lista');    // lista | dia | semana | mes | salas
  const [cursor,   setCursor]   = useState(() => startOfMonth(new Date()));
  const [creating, setCreating] = useState(false);
  const [prefillDate, setPrefillDate] = useState(null);
  const [editing,  setEditing]  = useState(null);
  const [pedirOpen, setPedirOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');    // '' = todos
  const [verChoques, setVerChoques] = useState(false);
  const { success, error: toastErr } = useToast();

  /* "Salas" (calendario en paralelo por track) ahora está disponible siempre:
     un espacio con varios escenarios/salas lo necesita sea cual sea la categoría. */
  const permiteSalas = true;

  const reload = async () => {
    setLoading(true);
    try {
      const [s, sp, tr] = await Promise.all([
        agendaApi.sessions(evento.id),
        agendaApi.speakers(evento.id),
        torneosApi.list(evento.id).catch(() => ({ torneos: [] })),
      ]);
      setSessions(s.sessions || []);
      setSpeakers(sp.speakers || []);
      setTorneos((tr.torneos || []).filter(Boolean));
    } catch (e) { toastErr(e.message); }
    finally    { setLoading(false); }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [evento.id]);

  /* Filtro por tipo: se aplica a TODAS las vistas de forma consistente. */
  const sessionsVista = useMemo(
    () => filtroTipo ? sessions.filter(s => (s.tipo || TIPO_DEFECTO) === filtroTipo) : sessions,
    [sessions, filtroTipo],
  );

  /* Qué tipos hay realmente cargados, para no mostrar filtros vacíos. */
  const tiposPresentes = useMemo(() => {
    const set = new Set(sessions.map(s => s.tipo || TIPO_DEFECTO));
    return TIPOS_ESPACIO.filter(t => set.has(t.id));
  }, [sessions]);

  /* Index de sesiones por día para Mes/Semana (ya filtrado) */
  const sessionsByDay = useMemo(() => {
    const map = {};
    for (const s of sessionsVista) {
      if (!s.inicio) continue;
      const k = ymd(new Date(s.inicio));
      (map[k] = map[k] || []).push(s);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
    }
    return map;
  }, [sessionsVista]);

  /* Cronograma maestro: choques de horario = dos sub-eventos en la MISMA sala
     (track) cuyos intervalos [inicio, fin) se solapan. Se calcula sobre TODAS
     las sesiones (no el filtro por tipo) para no ocultar conflictos. */
  const conflictos = useMemo(() => {
    const con = [];
    const porTrack = {};
    for (const s of sessions) {
      if (!s.inicio || !s.fin || !(s.track || '').trim()) continue;
      const k = s.track.trim().toLowerCase();
      (porTrack[k] = porTrack[k] || []).push(s);
    }
    for (const arr of Object.values(porTrack)) {
      arr.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          if (new Date(arr[j].inicio) < new Date(arr[i].fin)) con.push({ a: arr[i], b: arr[j] });
          else break;   // ordenado por inicio: los siguientes tampoco solapan con arr[i]
        }
      }
    }
    return con;
  }, [sessions]);

  /* Franjas que propuso un expositor y esperan aprobación del organizador. */
  const pendientes = useMemo(() => sessions.filter(s => s.moderacion === 'pendiente'), [sessions]);

  const moderar = async (s, estado) => {
    try {
      await agendaApi.editarSession(evento.id, s.id, { moderacion: estado });
      success(estado === 'aprobado' ? 'Franja aprobada — ya es pública.' : 'Franja rechazada.');
      reload();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const nudge = (delta) => {
    const d = new Date(cursor);
    if (subView === 'mes') { d.setMonth(d.getMonth() + delta); setCursor(startOfMonth(d)); }
    else if (subView === 'dia' || subView === 'salas') { d.setDate(d.getDate() + delta); setCursor(startOfDay(d)); }
    else { d.setDate(d.getDate() + delta * 7); setCursor(startOfWeek(d)); }
  };
  const goHoy = () => setCursor(
    subView === 'mes' ? startOfMonth(new Date())
    : (subView === 'dia' || subView === 'salas') ? startOfDay(new Date())
    : startOfWeek(new Date())
  );

  const openCreate = (date = null) => {
    setPrefillDate(date);
    setEditing(null);
    setCreating(true);
  };

  if (loading) return <GLoader message="Cargando el espacio del evento..." />;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">
            {vistaFija === 'speakers' ? 'Speakers' : 'Actividades del evento'}
          </h2>
          <p className="text-sm text-text-2 mt-1">
            {vistaFija === 'speakers'
              ? 'Quién habla en el evento. Se enganchan a cada actividad desde el Calendario.'
              : 'Todo lo que pasa dentro: charlas, stands, competencias, shows… y sus speakers.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 ${vistaFija ? 'hidden' : 'flex'}`}>
            {[['sessions', 'Sesiones'], ['speakers', 'Speakers']].map(([k, l]) => (
              <button key={k} onClick={() => setView(k)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => openCreate()} className="btn-gradient btn-sm">
            <PlusIcon className="w-3.5 h-3.5" />
            {view === 'sessions' ? 'Nuevo sub-evento' : 'Nuevo speaker'}
          </button>
        </div>
      </div>

      {/* Cronograma maestro — aviso de choques de horario por sala */}
      {view === 'sessions' && conflictos.length > 0 && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 overflow-hidden">
          <button onClick={() => setVerChoques(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
            <svg className="w-5 h-5 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" /></svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-1">{conflictos.length} choque{conflictos.length !== 1 ? 's' : ''} de horario</p>
              <p className="text-xs text-text-3">Sub-eventos que se solapan en la misma sala. Toca para ver el detalle.</p>
            </div>
            <span className="text-text-3 text-xs flex-shrink-0">{verChoques ? '▲' : '▼'}</span>
          </button>
          {verChoques && (
            <ul className="divide-y divide-warning/20 border-t border-warning/20">
              {conflictos.map(({ a, b }, i) => (
                <li key={i} className="px-4 py-2.5 text-xs">
                  <p className="text-text-2">
                    <span className="font-medium text-text-1">{a.track}</span> · {horaCorta(a.inicio)}–{horaCorta(a.fin)} vs {horaCorta(b.inicio)}–{horaCorta(b.fin)}
                  </p>
                  <p className="text-text-3 truncate">«{a.titulo}» choca con «{b.titulo}»</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Moderación — franjas propuestas por expositores que esperan aprobación */}
      {view === 'sessions' && pendientes.length > 0 && (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-accent/20">
            <p className="text-sm font-semibold text-text-1">{pendientes.length} franja{pendientes.length !== 1 ? 's' : ''} por aprobar</p>
            <p className="text-xs text-text-3">Sub-eventos que propusieron los expositores. No son públicos hasta que los apruebes.</p>
          </div>
          <ul className="divide-y divide-accent/15">
            {pendientes.map(s => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-1 truncate">{s.titulo}</p>
                  <p className="text-xs text-text-3 truncate">{s.track ? `${s.track} · ` : ''}{horaCorta(s.inicio)}{s.fin ? `–${horaCorta(s.fin)}` : ''}</p>
                </div>
                <button onClick={() => moderar(s, 'aprobado')} className="btn-primary btn-sm flex-shrink-0">Aprobar</button>
                <button onClick={() => moderar(s, 'rechazado')} className="btn-ghost btn-sm text-text-3 flex-shrink-0">Rechazar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Switcher de vista (solo en sesiones) */}
      {view === 'sessions' && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 flex-wrap">
            {[['lista', 'Lista'], ['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'],
              ...(permiteSalas ? [['salas', 'Salas']] : [])].map(([k, l]) => (
              <button key={k}
                onClick={() => {
                  setSubView(k);
                  if (k === 'mes') setCursor(startOfMonth(cursor));
                  else if (k === 'semana') setCursor(startOfWeek(cursor));
                  else if (k === 'dia' || k === 'salas') setCursor(startOfDay(new Date()));
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${subView === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
                {l}
              </button>
            ))}
          </div>

          {subView !== 'lista' && (
            <div className="flex items-center gap-2">
              <button onClick={() => nudge(-1)} aria-label="Anterior"
                className="w-8 h-8 rounded-lg text-text-2 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center transition-colors">
                <ChevL />
              </button>
              <h3 className="text-base font-bold font-display tracking-tight text-text-1 min-w-[180px] text-center" key={cursor.toISOString()}>
                {subView === 'mes'
                  ? `${MES_LARGO[cursor.getMonth()]} ${cursor.getFullYear()}`
                  : (subView === 'dia' || subView === 'salas')
                  ? `${DIA_SEMANA[(cursor.getDay()+6)%7]} ${cursor.getDate()} ${MES_LARGO[cursor.getMonth()].toLowerCase()}`
                  : `${dmy(cursor)} — ${dmy(addDays(cursor, 6))}`}
              </h3>
              <button onClick={() => nudge(1)} aria-label="Siguiente"
                className="w-8 h-8 rounded-lg text-text-2 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center transition-colors">
                <ChevR />
              </button>
              <button onClick={goHoy} className="ml-1 px-3 py-1.5 rounded-lg border border-border hover:bg-surface-2 hover:border-border-2 text-sm font-medium transition-all">
                Hoy
              </button>
            </div>
          )}
        </div>
      )}

      {/* Form de creación */}
      {creating && view === 'sessions' && (
        <SessionForm
          speakers={speakers}
          torneos={torneos}
          evento={evento}
          sessions={sessions}
          prefillDate={prefillDate}
          onCancel={() => { setCreating(false); setPrefillDate(null); }}
          onSave={async (payload) => {
            try {
              await agendaApi.crearSession(evento.id, payload);
              success('Sub-evento creado.');
              setCreating(false);
              setPrefillDate(null);
              reload();
            } catch (e) { toastErr(e.message); }
          }}
        />
      )}

      {creating && view === 'speakers' && (
        <SpeakerForm
          ownerId={usuario?.id}
          onCancel={() => setCreating(false)}
          onSave={async (payload) => {
            try {
              await agendaApi.crearSpeaker(evento.id, payload);
              success('Speaker agregado.');
              setCreating(false);
              reload();
            } catch (e) { toastErr(e.message); }
          }}
        />
      )}

      {/* Filtro por tipo de sub-evento (todas las vistas) */}
      {view === 'sessions' && tiposPresentes.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setFiltroTipo('')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
              ${filtroTipo === '' ? 'border-accent bg-accent/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
            Todos
          </button>
          {tiposPresentes.map(t => (
            <button key={t.id} onClick={() => setFiltroTipo(filtroTipo === t.id ? '' : t.id)}
              style={filtroTipo === t.id ? tipoEstilo(t.id) : undefined}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1
                ${filtroTipo === t.id ? '' : 'border-border text-text-3 hover:text-text-1'}`}>
              <Icono nombre={t.icono} className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
      )}

      {/* Pedir una dinamica que no existe. Va junto al filtro de tipos porque
          es justo donde alguien descubre que el suyo no esta en la lista. */}
      {view === 'sessions' && (
        pedirOpen
          ? <PedirDinamica eventoId={evento?.id} onCerrar={() => setPedirOpen(false)} />
          : (
            <button onClick={() => setPedirOpen(true)}
              className="text-xs text-text-3 hover:text-primary-light transition-colors underline underline-offset-2">
              ¿Falta tu tipo de sub-evento? Pídenoslo
            </button>
          )
      )}

      {/* Sesiones — vistas */}
      {view === 'sessions' && subView === 'lista' && (
        sessionsVista.length === 0
          ? <EmptyState title={filtroTipo ? 'Nada de este tipo' : 'Espacio vacío'} desc={filtroTipo ? 'No hay sub-eventos de este tipo todavía.' : 'Crea tu primer sub-evento: una charla, un stand, una competencia…'} />
          : <SessionsList
              sessions={sessionsVista}
              editing={editing}
              speakers={speakers}
              torneos={torneos}
              evento={evento}
              onEdit={setEditing}
              onSave={async (id, payload) => {
                try { await agendaApi.editarSession(evento.id, id, payload); success('Sub-evento actualizado.'); setEditing(null); reload(); }
                catch (e) { toastErr(e.message); }
              }}
              onDelete={async (s) => {
                if (!(await confirmDialog({ message:(`¿Borrar "${s.titulo}"?`), danger:true }))) return;
                try { await agendaApi.borrarSession(evento.id, s.id); success('Sesión borrada.'); reload(); }
                catch (e) { toastErr(e.message); }
              }}
            />
      )}

      {view === 'sessions' && subView === 'dia' && (
        <DiaTimeline
          cursor={cursor}
          sesiones={sessionsByDay[ymd(cursor)] || []}
          onCrearAt={(date) => openCreate(date)}
          onEditar={(s) => { setSubView('lista'); setEditing(s.id); }}
          onDelete={async (s) => {
            if (!(await confirmDialog({ message:(`¿Borrar "${s.titulo}"?`), danger:true }))) return;
            try { await agendaApi.borrarSession(evento.id, s.id); success('Sesión borrada.'); reload(); }
            catch (e) { toastErr(e.message); }
          }}
        />
      )}

      {view === 'sessions' && subView === 'semana' && (
        <SemanaGrid cursor={cursor} sessionsByDay={sessionsByDay} onPickDay={openCreate} />
      )}

      {view === 'sessions' && subView === 'mes' && (
        <MesGrid cursor={cursor} sessionsByDay={sessionsByDay} onPickDay={openCreate} />
      )}

      {view === 'sessions' && subView === 'salas' && (
        <SalasGrid
          cursor={cursor}
          sesiones={sessionsByDay[ymd(cursor)] || []}
          onCrearAt={(date) => openCreate(date)}
          onEditar={(s) => { setSubView('lista'); setEditing(s.id); }}
        />
      )}

      {/* Speakers */}
      {view === 'speakers' && (
        speakers.length === 0
          ? <EmptyState title="Sin speakers" desc="Agrega speakers para luego asignarlos a sesiones." />
          : <SpeakersList
              speakers={speakers}
              ownerId={usuario?.id}
              editing={editing}
              onEdit={setEditing}
              onSave={async (id, payload) => {
                try { await agendaApi.editarSpeaker(evento.id, id, payload); success('Speaker actualizado.'); setEditing(null); reload(); }
                catch (e) { toastErr(e.message); }
              }}
              onDelete={async (s) => {
                if (!(await confirmDialog({ message:(`¿Borrar a "${s.nombre}"?`), danger:true }))) return;
                try { await agendaApi.borrarSpeaker(evento.id, s.id); success('Speaker borrado.'); reload(); }
                catch (e) { toastErr(e.message); }
              }}
            />
      )}
    </div>
  );
}

/* ─────────── Vista Salas (calendario en paralelo por track) ─────────── */
