import { useMemo } from 'react';
import Icono from '../../../../components/ui/Iconos.jsx';
import { tipoEspacio, tipoEstilo } from '../../../../lib/espacio.js';
import { pad, withDefaultTime, PlusIcon } from './agendaComun.jsx';

/* Vista por salas: una columna por espacio y las horas en vertical. Es la que
   se mira el día del evento para ver qué sala está libre. */

export default function SalasGrid({ cursor, sesiones, onCrearAt, onEditar }) {
  const tracks = useMemo(() => {
    const set = new Set(sesiones.map(s => s.track || 'principal'));
    return [...set].sort((a, b) => (a === 'principal' ? -1 : b === 'principal' ? 1 : a.localeCompare(b)));
  }, [sesiones]);

  if (sesiones.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
        <p className="text-sm text-text-2">No hay sesiones programadas este día.</p>
        <button onClick={() => onCrearAt(withDefaultTime(cursor, 9, 0))} className="btn-secondary btn-sm mt-4">
          + Agregar sesión
        </button>
      </div>
    );
  }

  const horas = sesiones.map(s => new Date(s.inicio).getHours()).filter(Number.isFinite);
  const finales = sesiones.map(s => new Date(s.fin || s.inicio).getHours() + 1).filter(Number.isFinite);
  const minH = Math.min(8, ...(horas.length ? horas : [8]));
  const maxH = Math.max(19, ...(finales.length ? finales : [19]));
  const rango = [];
  for (let h = minH; h <= Math.min(23, maxH); h++) rango.push(h);

  return (
    <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden overflow-x-auto">
      <div style={{ minWidth: `${80 + tracks.length * 220}px` }}>
        {/* Header de salas */}
        <div className="flex border-b border-border bg-surface-2/40 sticky top-0 z-10">
          <div className="w-20 flex-shrink-0 px-3 py-3 text-xs uppercase tracking-widest text-text-3 font-semibold">Hora</div>
          {tracks.map(t => (
            <div key={t} className="flex-1 min-w-[220px] px-3 py-3 border-l border-border">
              <p className="text-sm font-bold text-text-1 truncate">{t === 'principal' ? 'Principal' : t}</p>
            </div>
          ))}
        </div>

        {/* Filas por hora */}
        {rango.map(h => (
          <div key={h} className="flex border-b border-border last:border-b-0">
            <div className="w-20 flex-shrink-0 px-3 py-3 text-right text-xs font-mono tabular-nums text-text-3">
              {pad(h)}:00
            </div>
            {tracks.map(t => {
              const items = sesiones.filter(s => (s.track || 'principal') === t && new Date(s.inicio).getHours() === h);
              return (
                <div key={t} className="flex-1 min-w-[220px] border-l border-border px-2 py-2 space-y-1.5 group/cell">
                  {items.map(s => (
                    <button key={s.id} onClick={() => onEditar(s)}
                      style={{ ...tipoEstilo(s.tipo), borderStyle: 'solid', borderWidth: 1 }}
                      className="w-full text-left rounded-xl transition-colors px-2.5 py-2 hover:brightness-110">
                      <p className="text-[11px] font-mono tabular-nums opacity-80">
                        <Icono nombre={tipoEspacio(s.tipo).icono} className="w-3 h-3 inline-block align-[-2px]" />{' '}
                        {new Date(s.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        {s.fin ? ` – ${new Date(s.fin).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </p>
                      <p className="text-sm font-semibold text-text-1 truncate">{s.titulo}</p>
                      {s.speaker?.nombre && <p className="text-xs text-text-3 truncate">{s.speaker.nombre}</p>}
                    </button>
                  ))}
                  {items.length === 0 && (
                    <button onClick={() => onCrearAt(withDefaultTime(cursor, h, 0))}
                      className="opacity-0 group-hover/cell:opacity-100 transition-opacity w-full text-left text-xs text-text-3 hover:text-primary-light py-1.5 flex items-center gap-1">
                      <PlusIcon className="w-3 h-3" /> Agregar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Vista Lista ─────────── */

