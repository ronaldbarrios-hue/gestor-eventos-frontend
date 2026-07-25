import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEspacioData } from './EspacioData.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { equipoApi } from '../../../api/equipo.js';
import { EstadoBadge } from '../../ui/Badge.jsx';

/* ──────────────────────────────────────────────────────────────────
   Mi evento — widget de Mi Espacio (Rework)
   El colaborador fija el evento en el que trabaja y ve, sin salir de
   su espacio: estado, sus tareas con prioridad y el directorio del
   equipo (quién es el encargado de qué, con acceso al chat).
   ────────────────────────────────────────────────────────────────── */

export default function MiEventoWidget() {
  const { eventos, tareas, loading } = useEspacioData();
  const { usuario } = useAuth();
  const KEY = `gestek-mi-evento:${usuario?.id || 'anon'}`;
  const [eventoId, setEventoId] = useState(() => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } });
  const [equipo, setEquipo] = useState([]);
  const [vista, setVista] = useState('tareas');

  const activos = eventos.filter(e => !['finalizado', 'archivado', 'cancelado'].includes(e.estado));
  const evento = activos.find(e => String(e.id) === String(eventoId)) || null;

  useEffect(() => {
    if (!eventoId && activos.length > 0) setEventoId(String(activos[0].id));
  }, [activos.length]); // eslint-disable-line

  useEffect(() => {
    try { localStorage.setItem(KEY, eventoId); } catch { /* noop */ }
    if (!eventoId) return;
    setEquipo([]);
    equipoApi.list(eventoId)
      .then(d => setEquipo(d.miembros || d.equipo || []))
      .catch(() => setEquipo([]));
  }, [eventoId, KEY]);

  const tareasEvento = tareas
    .filter(t => String(t.evento?.id) === String(eventoId) && t.estado !== 'hecho')
    .sort((a, b) => {
      const peso = { alta: 0, media: 1, baja: 2 };
      const pa = peso[a.prioridad] ?? 1, pb = peso[b.prioridad] ?? 1;
      if (pa !== pb) return pa - pb;
      return new Date(a.vence_at || '2999') - new Date(b.vence_at || '2999');
    })
    .slice(0, 6);

  if (loading) return <p className="text-sm text-text-3 p-5">Cargando…</p>;
  if (activos.length === 0) return <p className="text-sm text-text-2 text-center py-8 px-5">Cuando participes en un evento, podrás fijarlo aquí.</p>;

  return (
    <div className="h-full flex flex-col">
      {/* Selector de evento */}
      <div className="p-4 pb-3 flex items-center gap-2.5">
        <select
          value={eventoId}
          onChange={e => setEventoId(e.target.value)}
          className="flex-1 h-9 px-3 rounded-xl bg-surface-2 border border-border text-sm text-text-1 focus:outline-none focus:border-accent/50 cursor-pointer min-w-0"
        >
          {activos.map(e => <option key={e.id} value={e.id}>{e.titulo}</option>)}
        </select>
        {evento && <EstadoBadge estado={evento.estado} />}
      </div>

      {/* Sub-vistas */}
      <div className="flex gap-1 px-4 border-b border-border">
        {[['tareas', 'Mis tareas'], ['equipo', 'Equipo']].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`relative px-3 py-2 text-[13px] font-medium transition-colors
                        ${vista === v ? 'text-text-1' : 'text-text-3 hover:text-text-2'}`}
          >
            {label}
            {vista === v && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {vista === 'tareas' ? (
          tareasEvento.length === 0 ? (
            <p className="text-sm text-text-2 text-center py-6 px-4">Sin tareas pendientes en este evento.</p>
          ) : (
            <ul className="divide-y divide-border">
              {tareasEvento.map(t => {
                const vencida = t.vence_at && new Date(t.vence_at) < new Date();
                return (
                  <li key={t.id} className="px-4 py-2.5 flex items-center gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                      ${t.prioridad === 'alta' ? 'bg-danger' : t.prioridad === 'media' ? 'bg-warning' : 'bg-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-1 truncate">{t.titulo}</p>
                      <p className="text-[11px] text-text-3">
                        {t.prioridad ? `Prioridad ${t.prioridad}` : 'Sin prioridad'}
                        {t.vence_at ? ` · vence ${new Date(t.vence_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}` : ''}
                      </p>
                    </div>
                    {vencida && <span className="text-[10px] font-semibold text-danger uppercase flex-shrink-0">Vencida</span>}
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          equipo.length === 0 ? (
            <p className="text-sm text-text-2 text-center py-6 px-4">Sin miembros visibles en este evento.</p>
          ) : (
            <ul className="divide-y divide-border">
              {equipo.slice(0, 8).map((m, i) => (
                <li key={m.id || i} className="px-4 py-2.5 flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-gradient-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {(m.nombre || m.email || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-1 truncate">{m.nombre || m.email}</p>
                    <p className="text-[11px] text-text-3 truncate capitalize">{m.rol_nombre || m.rol || 'Miembro'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {evento && (
        <Link
          to={`/eventos/${evento.id}${vista === 'equipo' ? '?s=comunicacion&t=chat' : ''}`}
          className="block text-center text-sm text-accent hover:underline py-3 border-t border-border"
        >
          {vista === 'equipo' ? 'Abrir chat del evento →' : 'Abrir el evento →'}
        </Link>
      )}
    </div>
  );
}
