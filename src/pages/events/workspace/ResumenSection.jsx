import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { tareasApi } from '../../../api/tareas.js';
import { auditoriaApi } from '../../../api/auditoria.js';
import { agendaApi } from '../../../api/agenda.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useAsistenciaEnVivo } from '../../../hooks/useAsistenciaEnVivo.js';

/* ──────────────────────────────────────────────────────────────────
   Resumen del evento — Rework Fase 3 (según PDF)
   "Debe responder en menos de diez segundos cómo se encuentra el evento."
   KPIs → actividad → mi trabajo → calendario → Gestbot → info general
   ────────────────────────────────────────────────────────────────── */

export default function ResumenSection({ evento, soyOwner }) {
  const { usuario } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const [tareas, setTareas]       = useState([]);
  const [actividad, setActividad] = useState(null); /* null = sin acceso */
  const [sesiones, setSesiones]   = useState([]);

  useEffect(() => {
    tareasApi.list(evento.id).then(d => setTareas(d.tareas || [])).catch(() => {});
    auditoriaApi.list(evento.id, 12).then(d => setActividad(d.acciones || d.registros || d.auditoria || [])).catch(() => setActividad(null));
    agendaApi.sessions(evento.id).then(d => setSesiones(d.sesiones || [])).catch(() => {});
  }, [evento.id]);

  const { ingresados } = useAsistenciaEnVivo(evento.id);

  const pct = evento.aforo_total > 0 ? Math.min(100, Math.round((evento.aforo_vendido || 0) / evento.aforo_total * 100)) : null;
  const diasRestantes = evento.fecha_inicio
    ? Math.ceil((new Date(evento.fecha_inicio) - new Date()) / 86400000)
    : null;

  const misTareas = useMemo(() =>
    tareas.filter(t => t.estado !== 'hecho' && (!t.asignado_id || String(t.asignado_id) === String(usuario?.id))).slice(0, 5),
  [tareas, usuario?.id]);
  const vencidas = useMemo(() =>
    tareas.filter(t => t.estado !== 'hecho' && t.vence_at && new Date(t.vence_at) < new Date()),
  [tareas]);

  /* Gestbot: diagnóstico proactivo del evento */
  const sugerencias = [];
  if (['borrador', 'configuracion'].includes(evento.estado)) sugerencias.push('El evento aún no está publicado.');
  if (vencidas.length > 0) sugerencias.push(`Detecté ${vencidas.length} tarea${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''}.`);
  if (pct !== null && pct >= 90) sugerencias.push(`El aforo va en ${pct}% — considera abrir lista de espera.`);
  if (!evento.cover_url) sugerencias.push('La landing no tiene imagen de portada.');
  if (sugerencias.length === 0) sugerencias.push('Todo en orden por ahora. Pregúntame lo que necesites.');

  const proximas = useMemo(() => {
    const ahora = new Date();
    return (sesiones || [])
      .filter(s => s.inicio_at && new Date(s.inicio_at) >= ahora)
      .sort((a, b) => new Date(a.inicio_at) - new Date(b.inicio_at))
      .slice(0, 4);
  }, [sesiones]);

  const irATareas = () => setSearchParams({ s: 'organizacion', t: 'tareas' });

  return (
    <div className="space-y-5">
      {/* ── Banner con identidad del evento ── */}
      <div className="relative h-40 sm:h-52 rounded-3xl overflow-hidden border border-border">
        {evento.cover_url ? (
          <img src={evento.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-primary/20 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-5 flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight truncate">{evento.titulo}</h2>
            <p className="text-sm text-white/70 truncate">
              {evento.fecha_inicio ? new Date(evento.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) : 'Sin fecha'}
              {evento.location_nombre ? ` · ${evento.location_nombre}` : ''}
            </p>
          </div>
          {diasRestantes !== null && diasRestantes >= 0 && (
            <span className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold">
              {diasRestantes === 0 ? '¡Es hoy!' : `Faltan ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Boletas vendidas" valor={(evento.aforo_vendido || 0).toLocaleString('es-CO')} />
        <Kpi label="Aforo" valor={pct !== null ? `${pct}%` : 'Sin tope'} sub={evento.aforo_total ? `${evento.aforo_vendido || 0} / ${evento.aforo_total}` : null} />
        <Kpi label="En el evento ahora" valor={ingresados ?? 0} />
        <Kpi label="Tareas abiertas" valor={tareas.filter(t => t.estado !== 'hecho').length} alerta={vencidas.length > 0 ? `${vencidas.length} vencidas` : null} />
        <Kpi label={diasRestantes !== null && diasRestantes >= 0 ? 'Días para el evento' : 'Estado'} valor={diasRestantes !== null && diasRestantes >= 0 ? diasRestantes : (evento.estado || '—')} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Columna principal ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Mi trabajo */}
          <Card titulo="Mi trabajo" accion={<button onClick={irATareas} className="text-xs text-accent hover:underline">Ver tareas →</button>}>
            {misTareas.length === 0 ? (
              <p className="text-sm text-text-2 py-2">No tienes tareas pendientes en este evento.</p>
            ) : (
              <ul className="divide-y divide-border -mx-5">
                {misTareas.map(t => {
                  const vencida = t.vence_at && new Date(t.vence_at) < new Date();
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${vencida ? 'bg-danger' : t.prioridad === 'alta' ? 'bg-warning' : 'bg-primary'}`} />
                      <p className="text-sm text-text-1 flex-1 truncate">{t.titulo}</p>
                      {t.vence_at && (
                        <span className={`text-xs tabular-nums ${vencida ? 'text-danger' : 'text-text-3'}`}>
                          {new Date(t.vence_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Actividad reciente (auditoría) */}
          {Array.isArray(actividad) && actividad.length > 0 && (
            <Card titulo="Actividad reciente">
              <ul className="space-y-2.5">
                {actividad.slice(0, 8).map((a, i) => (
                  <li key={a.id || i} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-1 leading-snug">
                        <span className="font-medium">{a.usuario?.nombre || a.autor?.nombre || 'Alguien'}</span>
                        {' '}<span className="text-text-2">{describirAccion(a.accion)}</span>
                      </p>
                      <p className="text-[11px] text-text-3">{a.created_at ? relativo(a.created_at) : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Próximas actividades */}
          {proximas.length > 0 && (
            <Card titulo="Próximas actividades">
              <ul className="divide-y divide-border -mx-5">
                {proximas.map(s => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="w-11 rounded-lg bg-surface-2 text-center py-1 flex-shrink-0">
                      <p className="text-[9px] uppercase text-text-3 leading-none">{new Date(s.inicio_at).toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}</p>
                      <p className="text-sm font-bold font-display text-text-1">{new Date(s.inicio_at).getDate()}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-1 truncate">{s.titulo}</p>
                      <p className="text-xs text-text-3">{new Date(s.inicio_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}{s.lugar ? ` · ${s.lugar}` : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* ── Columna derecha ── */}
        <div className="space-y-5">
          {/* Gestbot */}
          <div className="rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/15 to-transparent p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-8 h-8 rounded-xl bg-accent/25 text-accent flex items-center justify-center">✦</span>
              <h3 className="text-sm font-semibold text-text-1">Gestbot</h3>
            </div>
            <ul className="space-y-2 mb-4">
              {sugerencias.slice(0, 3).map((s, i) => (
                <li key={i} className="text-sm text-text-1 leading-snug flex gap-2">
                  <span className="text-accent flex-shrink-0">·</span>{s}
                </li>
              ))}
            </ul>
            <Link to="/gestbot" className="block text-center text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-xl py-2.5 transition-colors">
              Revisar ahora
            </Link>
          </div>

          {/* Información general */}
          <Card titulo="Información general">
            <div className="space-y-2.5 text-sm">
              <Fila k="Estado" v={evento.estado} />
              <Fila k="Inicio" v={fmt(evento.fecha_inicio)} />
              <Fila k="Fin" v={fmt(evento.fecha_fin)} />
              {evento.categoria?.nombre && <Fila k="Categoría" v={evento.categoria.nombre} />}
              {evento.location_nombre && <Fila k="Lugar" v={evento.location_nombre} />}
              <Fila k="URL pública" v={<a className="text-accent hover:underline font-mono text-xs" href={`/explorar/${evento.slug}`} target="_blank" rel="noreferrer">/{evento.slug}</a>} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, valor, sub, alerta }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 px-4 py-3.5">
      <p className="text-xl font-bold font-display text-text-1 tabular-nums capitalize">{valor}</p>
      <p className="text-[11px] text-text-3 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-text-3">{sub}</p>}
      {alerta && <p className="text-[10px] text-danger font-medium mt-0.5">{alerta}</p>}
    </div>
  );
}
function Card({ titulo, accion, children }) {
  return (
    <section className="rounded-3xl border border-border bg-surface/60 overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h2 className="text-sm font-semibold text-text-1">{titulo}</h2>
        {accion}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
function Fila({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-text-3 flex-shrink-0">{k}</span>
      <span className="text-text-1 text-right capitalize">{v || '—'}</span>
    </div>
  );
}
function fmt(d) {
  return d ? new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
}
function relativo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `hace ${Math.max(1, Math.floor(diff / 60))}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}
function describirAccion(a) {
  const mapa = {
    'evento.crear': 'creó el evento', 'evento.editar': 'editó el evento', 'evento.estado': 'cambió el estado',
    'evento.publicar': 'publicó el evento', 'tarea.crear': 'creó una tarea', 'tarea.editar': 'actualizó una tarea',
    'ticket.crear': 'creó una boleta', 'pagina.editar': 'editó la página pública',
  };
  return mapa[a] || (a || 'hizo un cambio').replace(/\./g, ' ');
}
