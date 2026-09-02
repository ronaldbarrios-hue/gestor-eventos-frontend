import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { tareasApi } from '../../../api/tareas.js';
import { auditoriaApi } from '../../../api/auditoria.js';
import { agendaApi } from '../../../api/agenda.js';
import { equipoApi } from '../../../api/equipo.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useAsistenciaEnVivo } from '../../../hooks/useAsistenciaEnVivo.js';

/* ──────────────────────────────────────────────────────────────────
   Resumen del evento — Rework Fase 3 (según PDF)
   "Debe responder en menos de diez segundos cómo se encuentra el evento."
   KPIs → actividad → mi trabajo → calendario → Gestbot → info general
   ────────────────────────────────────────────────────────────────── */

export default function ResumenSection({ evento, soyOwner, onEditar, onAnuncio, onEliminar }) {
  const { usuario } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const [tareas, setTareas]       = useState([]);
  const [actividad, setActividad] = useState(null); /* null = sin acceso */
  const [sesiones, setSesiones]   = useState([]);
  const [equipo, setEquipo]       = useState(null);

  useEffect(() => {
    tareasApi.list(evento.id).then(d => setTareas(d.tareas || [])).catch(() => {});
    auditoriaApi.list(evento.id, 12).then(d => setActividad(d.acciones || d.registros || d.auditoria || [])).catch(() => setActividad(null));
    agendaApi.sessions(evento.id).then(d => setSesiones(d.sesiones || [])).catch(() => {});
    equipoApi.list(evento.id).then(d => setEquipo(d)).catch(() => setEquipo(null));
  }, [evento.id]);

  const miembros = useMemo(() => {
    if (!equipo) return [];
    const lista = [];
    if (equipo.owner) lista.push({ id: 'owner', nombre: equipo.owner.nombre || 'Organizador', avatar: equipo.owner.avatar_url, rol: 'Owner', email: equipo.owner.email, owner: true });
    for (const m of (equipo.miembros || [])) {
      lista.push({ id: m.id, nombre: m.profile?.nombre || m.nombre_invitado || m.email, avatar: m.profile?.avatar_url, rol: m.rol_detail?.nombre || m.rol || 'Miembro', email: m.email, status: m.status });
    }
    return lista;
  }, [equipo]);

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

          {/* Equipo del evento — quién trabaja y su rol */}
          {miembros.length > 0 && (
            <Card titulo="Equipo del evento"
              accion={<Link to="?s=organizacion&t=equipo" className="text-xs text-accent hover:underline">Gestionar equipo →</Link>}>
              <ul className="divide-y divide-border -mx-5">
                {miembros.map(m => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : (m.nombre || m.email || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-1 truncate">{m.nombre}</p>
                      {m.email && <p className="text-[11px] text-text-3 truncate">{m.email}</p>}
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md flex-shrink-0
                      ${m.owner ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-text-2'}`}>{m.rol}</span>
                    {m.status === 'pendiente' && <span className="text-[10px] text-warning">pendiente</span>}
                  </li>
                ))}
              </ul>
              <Link to="?s=comunicacion&t=chat" className="block mt-3 text-xs text-accent hover:underline">Escribir al equipo en los chats →</Link>
            </Card>
          )}

          {/* Actividad reciente (auditoría) */}
          {Array.isArray(actividad) && actividad.length > 0 && (
            <Card titulo="Actividad reciente">
              <ul className="space-y-2.5">
                {actividad.slice(0, 8).map((a, i) => {
                  const detalle = detalleAccion(a);
                  return (
                    <li key={a.id || i} className="flex items-start gap-2.5">
                      <Avatar actor={a.actor} correo={a.actor_email} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-1 leading-snug">
                          <span className="font-medium">{nombreDelActor(a)}</span>
                          {' '}<span className="text-text-2">{describirAccion(a.accion)}</span>
                        </p>
                        {detalle && <p className="text-[13px] text-text-2 leading-snug">{detalle}</p>}
                        {/* La hora exacta, no «hace 18h». Un registro de
                            auditoría se consulta para cuadrar cuándo pasó algo
                            con lo que alguien cuenta que pasó, y para eso
                            «hace 18h» obliga a hacer la resta a mano. Lo
                            relativo se queda en el `title`, que es donde
                            sirve: para leer «ah, fue hoy» de un vistazo. */}
                        <p className="text-[11px] text-text-3 tabular-nums"
                          title={a.created_at ? relativo(a.created_at) : ''}>
                          {a.created_at ? fechaHora(a.created_at) : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
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
            <Link to={`/gestbot?evento=${evento.id}&nom=${encodeURIComponent(evento.titulo || '')}`} className="block text-center text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-xl py-2.5 transition-colors">
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

          {/* Acciones del evento (movidas aquí desde el header) */}
          {soyOwner && (onEditar || onAnuncio || onEliminar) && (
            <Card titulo="Acciones del evento">
              <div className="space-y-2">
                {onEditar && (
                  <button onClick={onEditar} className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors flex items-center gap-2.5">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Editar información del evento
                  </button>
                )}
                {onAnuncio && (
                  <button onClick={onAnuncio} className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors flex items-center gap-2.5">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    Enviar anuncio al equipo
                  </button>
                )}
                {onEliminar && (
                  <button onClick={onEliminar} className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-danger/90 hover:text-danger hover:bg-danger/10 transition-colors flex items-center gap-2.5">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Eliminar evento
                  </button>
                )}
              </div>
            </Card>
          )}
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

/* El día y la hora, que es lo que se le pide a un registro de auditoría.
   Mismo formato que la tabla de Auditoría en Equipo y roles, para que las dos
   pantallas no cuenten la misma hora de dos maneras. El año sólo si no es
   este: en un evento que dura una semana, «2 sep, 14:32» se lee mejor. */
function fechaHora(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const esteAno = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    ...(esteAno ? {} : { year: 'numeric' }),
  });
}

/* La foto de quien hizo el cambio, con su inicial de respaldo.
   El endpoint de auditoría ya devolvía `actor.avatar_url` desde el principio
   —la consulta lo pide— y esta pantalla lo ignoraba: pintaba un punto de
   color. Ver quién fue de un vistazo es la mitad de para qué sirve un
   registro de actividad. */
function Avatar({ actor, correo }) {
  const inicial = (actor?.nombre?.[0] || correo?.[0] || '?').toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent
                    flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 mt-0.5">
      {actor?.avatar_url
        ? <img src={actor.avatar_url} alt="" className="w-full h-full object-cover" />
        : inicial}
    </div>
  );
}
/* Cada acción que el backend audita, dicha como se lo contarías a alguien.

   El diccionario cubría ocho y el backend registra catorce, así que las que
   faltaban caían al `replace(/\./g,' ')` de abajo y salían como
   «alguien equipo invitar»: el identificador interno con los puntos
   cambiados por espacios. No es que estuviera mal traducido — es que no
   estaba traducido.

   Si mañana aparece una acción nueva sin entrada aquí, se dice «hizo un
   cambio (id.interno)»: sigue siendo legible y además delata que falta
   añadirla, en vez de disfrazarse de frase. */
const ACCIONES = {
  'evento.crear'            : 'creó el evento',
  'evento.editar'           : 'editó el evento',
  'evento.borrar'           : 'borró el evento',
  'evento.estado'           : 'cambió el estado del evento',
  'evento.publicar'         : 'publicó el evento',
  'evento.formulario.editar': 'cambió el formulario de compra',
  'pagina.editar'           : 'editó la página pública',
  'equipo.invitar'          : 'invitó a alguien al equipo',
  'equipo.quitar'           : 'quitó a alguien del equipo',
  'equipo.rol'              : 'cambió el rol de un miembro',
  'rol.crear'               : 'creó un rol',
  'rol.editar'              : 'editó un rol',
  'rol.borrar'              : 'borró un rol',
  'ticket.crear'            : 'creó un tipo de boleta',
  'ticket.editar'           : 'editó un tipo de boleta',
  'ticket.borrar'           : 'borró un tipo de boleta',
  'tarea.crear'             : 'creó una tarea',
  'tarea.editar'            : 'actualizó una tarea',
  /* La agenda no se auditaba y es de lo que más se toca entre varias
     personas: quien monta el programa, quien lo corrige y quien mueve una
     charla de sala suelen ser tres distintas. */
  'sesion.crear'            : 'agregó un sub-evento',
  'sesion.editar'           : 'editó un sub-evento',
  'sesion.borrar'           : 'borró un sub-evento',
  'aforo.limpiar'           : 'puso a cero el contador de una zona',
};

function describirAccion(a) {
  if (!a) return 'hizo un cambio';
  return ACCIONES[a] || `hizo un cambio (${a})`;
}

/* A quién señalar. La API devuelve el perfil en `actor` —así se llama la
   relación en la consulta— y la pantalla leía `usuario` y `autor`, que no
   existen. Por eso TODAS las líneas decían «Alguien», incluso las del propio
   dueño del evento.

   Si el perfil se borró queda el correo, que se guarda aparte justo para
   esto; y sólo si tampoco está, «Alguien». */
function nombreDelActor(a) {
  const n = a?.actor?.nombre?.trim();
  if (n) return n;
  const correo = a?.actor_email?.trim();
  if (correo) return correo.split('@')[0];
  return 'Alguien';
}

/* Lo que se tocó, cuando el registro lo sabe. «editó el evento» es cierto
   pero no dice nada; «editó el evento · título, aforo» sí. */
function detalleAccion(a) {
  const d = a?.detalle;
  if (!d || typeof d !== 'object') return '';
  if (Array.isArray(d.campos) && d.campos.length) {
    return d.campos.slice(0, 4).join(', ') + (d.campos.length > 4 ? '…' : '');
  }
  return [d.titulo, d.nombre, d.email, d.rol, d.estado].find(v => typeof v === 'string' && v.trim()) || '';
}
