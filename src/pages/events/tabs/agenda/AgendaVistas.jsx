import { ymdLocal as ymd } from '../../../../lib/fechaLocal.js';
import {
  DOW_SHORT, MES_LARGO, DIA_SEMANA,
  addDays, pad, withDefaultTime, PlusIcon, EditIcon, TrashIcon,
} from './agendaComun.jsx';

/* Las tres vistas de calendario: mes, semana y día, más la ficha corta que
   las tres pintan dentro de cada casilla. */

export function MesGrid({ cursor, sessionsByDay, onPickDay }) {
  const first  = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start  = addDays(first, -offset);
  const days   = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today  = ymd(new Date());

  return (
    <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden animate-[fadeUp_0.35s_ease_both]">
      <div className="grid grid-cols-7 border-b border-border bg-surface-2/30">
        {DOW_SHORT.map(d => (
          <div key={d} className="px-3 py-2 text-xs uppercase tracking-widest text-text-3 font-semibold text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const key = ymd(d);
          const items = sessionsByDay[key] || [];
          const isOther = d.getMonth() !== cursor.getMonth();
          const isToday = key === today;
          return (
            <button key={key} onClick={() => onPickDay(d)}
              className={`min-h-[110px] flex flex-col items-stretch text-left p-2 border-r border-b border-border last:border-r-0 transition-all hover:bg-surface-2/40 group
                ${isOther ? 'opacity-40' : ''}`}>
              <span className={`text-sm font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full mb-1 mr-auto transition-all
                ${isToday ? 'bg-text-1 text-bg shadow-glow-sm' : 'text-text-1'}`}>
                {d.getDate()}
              </span>
              <div className="space-y-1 flex-1 overflow-hidden">
                {items.slice(0, 3).map(s => <SessionChip key={s.id} session={s} />)}
                {items.length > 3 && (
                  <span className="text-xs text-text-3 px-1.5">+{items.length - 3} más</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Vista Semana ─────────── */

export function SemanaGrid({ cursor, sessionsByDay, onPickDay }) {
  const days  = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
  const today = ymd(new Date());
  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 animate-[fadeUp_0.35s_ease_both]">
      {days.map(d => {
        const key = ymd(d);
        const items = sessionsByDay[key] || [];
        const isToday = key === today;
        return (
          <button key={key} onClick={() => onPickDay(d)}
            className={`rounded-3xl border bg-surface/40 hover:bg-surface/60 transition-all min-h-[200px] flex flex-col text-left p-3 group
              ${isToday ? 'border-primary/50 shadow-glow-sm' : 'border-border hover:border-border-2'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-widest text-text-3 font-semibold">{DOW_SHORT[(d.getDay()+6)%7]}</span>
              <span className={`text-2xl font-bold font-display tabular-nums ${isToday ? 'text-primary-light' : 'text-text-1'}`}>{d.getDate()}</span>
            </div>
            <div className="space-y-1 flex-1 overflow-hidden">
              {items.length === 0
                ? <span className="text-xs text-text-3">Sin sesiones</span>
                : items.slice(0, 5).map(s => <SessionChip key={s.id} session={s} detailed />)}
              {items.length > 5 && (
                <span className="text-xs text-text-3 px-1.5">+{items.length - 5} más</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* Vista DÍA — timeline por horas para planear el desarrollo del evento. */
export function DiaTimeline({ cursor, sesiones, onCrearAt, onEditar, onDelete }) {
  const horas = sesiones
    .map(s => new Date(s.inicio).getHours())
    .filter(h => Number.isFinite(h));
  const minH = Math.min(8, ...(horas.length ? horas : [8]));
  const maxFin = sesiones
    .map(s => new Date(s.fin || s.inicio).getHours() + (s.fin ? 1 : 1))
    .filter(h => Number.isFinite(h));
  const maxH = Math.max(20, ...(maxFin.length ? maxFin : [20]));
  const rango = [];
  for (let h = minH; h <= Math.min(23, maxH); h++) rango.push(h);

  const porHora = {};
  for (const s of sesiones) {
    const h = new Date(s.inicio).getHours();
    (porHora[h] = porHora[h] || []).push(s);
  }
  const ahora = new Date();
  const esHoy = ymd(ahora) === ymd(cursor);

  return (
    <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold text-text-1">
          {DIA_SEMANA[(cursor.getDay()+6)%7]} {cursor.getDate()} de {MES_LARGO[cursor.getMonth()].toLowerCase()}
        </p>
        <span className="text-xs text-text-3">
          {sesiones.length} {sesiones.length === 1 ? 'sesión' : 'sesiones'}
        </span>
      </div>

      <div className="divide-y divide-border">
        {rango.map(h => {
          const items = (porHora[h] || []).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
          const esHoraActual = esHoy && ahora.getHours() === h;
          return (
            <div key={h} className="flex group/h">
              <div className={`w-16 flex-shrink-0 px-3 py-3 text-right text-xs font-mono tabular-nums
                ${esHoraActual ? 'text-primary-light font-bold' : 'text-text-3'}`}>
                {pad(h)}:00
              </div>
              <div className="flex-1 border-l border-border px-3 py-2 min-h-[3.25rem] relative">
                {esHoraActual && (
                  <span className="absolute -left-px top-0 bottom-0 w-0.5 bg-primary" />
                )}
                {items.length === 0 ? (
                  <button
                    onClick={() => onCrearAt(withDefaultTime(cursor, h, 0))}
                    className="opacity-0 group-hover/h:opacity-100 transition-opacity
                               text-xs text-text-3 hover:text-primary-light flex items-center gap-1 py-1.5"
                  >
                    <PlusIcon className="w-3 h-3" /> Agregar a las {pad(h)}:00
                  </button>
                ) : (
                  <div className="space-y-2">
                    {items.map(s => {
                      const ini = new Date(s.inicio);
                      const fin = s.fin ? new Date(s.fin) : null;
                      const rango2 = ini.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                        + (fin ? ` – ${fin.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : '');
                      return (
                        <div key={s.id}
                          className="group/s rounded-xl border border-primary/25 bg-primary/10
                                     px-3.5 py-2.5 flex items-start gap-3 hover:border-primary/45 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono tabular-nums text-primary-light">{rango2}</span>
                              {s.track && s.track !== 'principal' && (
                                <span className="text-[10px] uppercase tracking-wide text-text-3
                                                 bg-surface-2 border border-border rounded px-1.5 py-0.5">
                                  {s.track}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-text-1 mt-0.5 truncate">{s.titulo}</p>
                            {(s.speaker?.nombre || s.ubicacion) && (
                              <p className="text-xs text-text-3 mt-0.5 truncate">
                                {s.speaker?.nombre}{s.speaker?.nombre && s.ubicacion ? ' · ' : ''}{s.ubicacion}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover/s:opacity-100 transition-opacity">
                            <button onClick={() => onEditar(s)} aria-label="Editar"
                              className="w-7 h-7 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2
                                         flex items-center justify-center">
                              <EditIcon className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onDelete(s)} aria-label="Borrar"
                              className="w-7 h-7 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10
                                         flex items-center justify-center">
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SessionChip({ session, detailed }) {
  const hi = new Date(session.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return (
    <span className="block truncate rounded-md bg-primary/15 border border-primary/20 text-primary-light text-xs px-1.5 py-0.5 hover:bg-primary/25 transition-colors">
      <span className="font-mono mr-1 opacity-70">{hi}</span>
      {session.titulo}
      {detailed && session.ubicacion && <span className="opacity-60"> · {session.ubicacion}</span>}
    </span>
  );
}

/* ─────────── Form sesión ─────────── */

/* Los sitios que este evento YA tiene nombrados, para no escribirlos a mano
   otra vez ni acabar con "Auditorio 01", "auditorio 1" y "Aud. 01" como tres
   sitios distintos —que luego, en el reporte, son tres filas que nadie puede
   sumar—.

   Vienen de cuatro sitios que hasta ahora no se hablaban entre ellos: lo ya
   escrito en otros sub-eventos, las zonas de aforo, los puntos del plano y las
   puertas. Cada sugerencia dice de dónde sale, porque elegir "Zona Gamer"
   sabiendo que es una zona con aforo no es lo mismo que elegir un texto suelto.

   Sigue siendo un `datalist` y no un desplegable: hace falta poder inventar un
   sitio nuevo sin tener que crearlo antes en ningún sitio. */
