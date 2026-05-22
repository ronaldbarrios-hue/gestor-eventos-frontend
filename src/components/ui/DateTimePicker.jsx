import { useState, useRef, useEffect } from 'react';

/* DateTimePicker minimalista estilo Apple.
   value: string ISO local "YYYY-MM-DDTHH:mm" o ""
   onChange: (newValue) => void  — mismo formato */

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function DateTimePicker({ value, onChange, minDate, placeholder = 'Selecciona fecha y hora' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  /* Parse value into local components */
  const parsed = parseValue(value);
  const [view, setView] = useState(() => ({
    year:  parsed?.year  ?? new Date().getFullYear(),
    month: parsed?.month ?? new Date().getMonth(),
  }));
  const [hour, setHour] = useState(parsed?.hour ?? 9);
  const [minute, setMinute] = useState(parsed?.minute ?? 0);

  useEffect(() => {
    const p = parseValue(value);
    if (p) {
      setView({ year: p.year, month: p.month });
      setHour(p.hour);
      setMinute(p.minute);
    }
  }, [value]);

  /* Cerrar al click fuera */
  useEffect(() => {
    function handler(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const today = stripTime(new Date());
  const minD  = minDate ? stripTime(new Date(minDate)) : null;

  const selectedDay = parsed
    ? new Date(parsed.year, parsed.month, parsed.day).toDateString()
    : null;

  const days = monthGrid(view.year, view.month);

  function applyDay(d) {
    const newDate = new Date(view.year, view.month, d, hour, minute);
    onChange(toLocalISO(newDate));
  }

  function applyTime(h, m) {
    const day = parsed?.day ?? new Date().getDate();
    const newDate = new Date(view.year, view.month, day, h, m);
    onChange(toLocalISO(newDate));
  }

  function nudgeMonth(delta) {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  }

  const label = parsed
    ? `${parsed.day} ${MES[parsed.month].slice(0,3)} ${parsed.year} · ${pad(parsed.hour)}:${pad(parsed.minute)}`
    : placeholder;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left input rounded-2xl py-3 pr-10 text-base flex items-center justify-between"
      >
        <span className={parsed ? 'text-text-1' : 'text-text-3'}>{label}</span>
        <CalIcon className="w-4 h-4 text-text-3 absolute right-4 top-1/2 -translate-y-1/2" />
      </button>

      {open && (
        <div
          className="absolute z-30 mt-2 w-[320px] rounded-2xl border border-border-2 bg-surface shadow-2xl shadow-black/40 backdrop-blur-xl p-4 animate-[fadeUp_0.18s_ease_both]"
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => nudgeMonth(-1)}
              className="w-8 h-8 rounded-xl hover:bg-surface-2 flex items-center justify-center text-text-2 hover:text-text-1">
              <ChevL className="w-4 h-4" />
            </button>
            <p className="text-sm font-semibold text-text-1">
              {MES[view.month]} <span className="text-text-3 font-medium">{view.year}</span>
            </p>
            <button type="button" onClick={() => nudgeMonth(1)}
              className="w-8 h-8 rounded-xl hover:bg-surface-2 flex items-center justify-center text-text-2 hover:text-text-1">
              <ChevR className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1.5">
            {DOW.map(d => (
              <span key={d} className="text-[10px] uppercase tracking-widest text-text-3 text-center font-semibold">{d}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((cell, i) => {
              if (!cell) return <div key={i} />;
              const date = new Date(view.year, view.month, cell);
              const isPast = minD && stripTime(date) < minD;
              const isToday = date.toDateString() === today.toDateString();
              const isSelected = date.toDateString() === selectedDay;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isPast}
                  onClick={() => applyDay(cell)}
                  className={`h-9 rounded-xl text-sm font-medium transition-all
                    ${isSelected
                      ? 'bg-text-1 text-bg shadow-md'
                      : isPast
                        ? 'text-text-3/40 cursor-not-allowed'
                        : isToday
                          ? 'bg-primary/10 text-primary-light hover:bg-primary/20'
                          : 'text-text-1 hover:bg-surface-2'}`}
                >
                  {cell}
                </button>
              );
            })}
          </div>

          {/* Time row */}
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3">
            <span className="text-xs text-text-2 font-medium">Hora</span>
            <div className="flex items-center gap-1.5">
              <TimeSpinner value={hour}   max={23} onChange={h => { setHour(h); applyTime(h, minute); }} />
              <span className="text-text-3 text-sm">:</span>
              <TimeSpinner value={minute} max={59} step={5} onChange={m => { setMinute(m); applyTime(hour, m); }} />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary-light hover:text-primary px-2 py-1 rounded-lg hover:bg-primary/10"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeSpinner({ value, max, step = 1, onChange }) {
  return (
    <div className="flex items-center bg-surface-2 rounded-xl px-1">
      <button type="button" onClick={() => onChange((value - step + max + 1) % (max + 1))}
        className="w-6 h-7 text-text-3 hover:text-text-1">−</button>
      <span className="w-7 text-center text-sm font-medium text-text-1 tabular-nums">{pad(value)}</span>
      <button type="button" onClick={() => onChange((value + step) % (max + 1))}
        className="w-6 h-7 text-text-3 hover:text-text-1">+</button>
    </div>
  );
}

/* ── helpers ─────────────────── */
function pad(n) { return String(n).padStart(2, '0'); }

function parseValue(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d)) return null;
  return {
    year: d.getFullYear(), month: d.getMonth(), day: d.getDate(),
    hour: d.getHours(),    minute: d.getMinutes(),
  };
}

function toLocalISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function stripTime(d) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}

function monthGrid(year, month) {
  /* L M X J V S D — primer día como lunes */
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // 0=L … 6=D
  const last = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= last; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function CalIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function ChevL({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
}
function ChevR({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
}
