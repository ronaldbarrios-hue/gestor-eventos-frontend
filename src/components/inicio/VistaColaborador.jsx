import { Link } from 'react-router-dom';
import { useEspacioData } from '../widgets/espacio/EspacioData.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { EstadoBadge } from '../ui/Badge.jsx';

/* ──────────────────────────────────────────────────────────────────
   Inicio · Vista Colaborador — panorama generalizado de TODO en lo
   que participo: mis tareas de todos los eventos y dónde colaboro.
   El detalle fino y personalizable vive en Mi Espacio.
   ────────────────────────────────────────────────────────────────── */

export default function VistaColaborador() {
  const { eventos, tareas, solicitudes, loading } = useEspacioData();
  const { usuario } = useAuth();

  const miId = String(usuario?.id || '');
  const colaborando = eventos.filter(e => String(e.owner_id) !== miId);

  /* Qué cuenta como "mi trabajo de colaborador":

     · todo lo pendiente de un evento que NO organizo — ahí el servidor ya
       filtra por lo que está asignado a mí o a mi rol, así que lo que llega
       es mío por definición;
     · y de los eventos que sí organizo, sólo lo que lleva mi nombre.

     Sin esa segunda regla la lista mezclaba el tablero entero de mis propios
     eventos, que es justo lo que hace que "Mis tareas" no signifique nada. */
  const esMia         = (t) => String(t.asignado_user_id || '') === miId;
  const deColaboracion = (t) => String(t.evento?.owner_id || '') !== miId;

  const pendientes = tareas.filter(t => t.estado !== 'hecho' && (deColaboracion(t) || esMia(t)));
  const vencidas   = pendientes.filter(t => t.vence_at && new Date(t.vence_at) < new Date());
  const proximas = [...pendientes]
    .sort((a, b) => {
      const peso = { alta: 0, media: 1, baja: 2 };
      const pa = peso[a.prioridad] ?? 1, pb = peso[b.prioridad] ?? 1;
      if (pa !== pb) return pa - pb;
      return new Date(a.vence_at || '2999') - new Date(b.vence_at || '2999');
    })
    .slice(0, 8);

  /* Lo que pedí y sigue sin respuesta también es un pendiente mío, aunque la
     pelota esté en el otro tejado. Es lo que un colaborador viene a mirar. */
  const misSolicitudesAbiertas = (solicitudes || [])
    .filter(s => s.estado === 'abierta' || s.estado === 'en_revision');

  if (loading) return <p className="text-sm text-text-3 py-10 text-center">Reuniendo tu trabajo en todos los eventos…</p>;

  /* Sin nada donde colaborar, la vista entera no tiene sentido. Antes salían
     cuatro ceros y dos cajas vacías, que es lo que se leía como "media
     aplicación vacía". */
  if (colaborando.length === 0 && pendientes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border-2 px-6 py-16 text-center">
        <h2 className="text-lg font-bold font-display text-text-1 tracking-tight mb-2">
          Todavía no colaboras en ningún evento
        </h2>
        <p className="text-sm text-text-2 leading-relaxed max-w-md mx-auto">
          Esta vista se llena cuando alguien te invita a su equipo: aparecerán los
          eventos, tu papel en cada uno y las tareas que te asignen. Mientras tanto,
          lo tuyo está en la vista de <strong className="text-text-1">Organizador</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs del colaborador */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi valor={colaborando.length} label="Eventos donde colaboro" />
        <Kpi valor={pendientes.length} label="Tareas para mí" />
        <Kpi valor={vencidas.length} label="Vencidas" alerta={vencidas.length > 0} />
        <Kpi valor={misSolicitudesAbiertas.length} label="Solicitudes mías sin responder" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Tareas de todos los eventos */}
        <section className="lg:col-span-2 rounded-3xl border border-border bg-surface/60 overflow-hidden">
          <header className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-text-1">Lo que me toca a mí</h2>
            <Link to="/mi-espacio" className="text-xs text-accent hover:underline">Ir a Mi Espacio →</Link>
          </header>
          {proximas.length === 0 ? (
            <p className="text-sm text-text-2 text-center py-10">
              Nadie te ha asignado nada pendiente. ✦
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {proximas.map(t => {
                const vencida = t.vence_at && new Date(t.vence_at) < new Date();
                return (
                  <li key={`${t.evento?.id}-${t.id}`} className="flex items-center gap-3 px-5 py-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                      ${t.prioridad === 'alta' ? 'bg-danger' : t.prioridad === 'media' ? 'bg-warning' : 'bg-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-1 truncate">{t.titulo}</p>
                      <p className="text-[11px] text-text-3 truncate">{t.evento?.titulo}{t.prioridad ? ` · prioridad ${t.prioridad}` : ''}</p>
                    </div>
                    {t.vence_at && (
                      <span className={`text-xs tabular-nums flex-shrink-0 ${vencida ? 'text-danger font-semibold' : 'text-text-3'}`}>
                        {new Date(t.vence_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Dónde colaboro y con qué papel */}
        <section className="rounded-3xl border border-border bg-surface/60 overflow-hidden">
          <header className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-text-1">Colaborando en</h2>
          </header>
          {colaborando.length === 0 ? (
            <p className="text-sm text-text-2 text-center py-8 px-5">Aún no te han invitado a colaborar en eventos de otros.</p>
          ) : (
            <ul className="divide-y divide-border">
              {colaborando.slice(0, 6).map(e => {
                /* Cuántas de las tareas pendientes son de ESTE evento. Un
                   listado de eventos sin esto obliga a entrar en cada uno
                   para saber en cuál hay algo esperándote. */
                const suyas = pendientes.filter(t => t.evento?.id === e.id).length;
                return (
                  <li key={e.id}>
                    <Link to={`/eventos/${e.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50 transition-colors">
                      <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {(e.titulo || '?')[0].toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-1 truncate">{e.titulo}</p>
                        <p className="text-[11px] text-text-3 truncate">
                          {/* El papel es lo primero: es la respuesta a "¿qué
                              pinto yo aquí?", que era lo que faltaba. */}
                          {e.mi_rol ? <span className="text-text-2 font-medium">{e.mi_rol}</span> : 'Miembro del equipo'}
                          {' · '}
                          {e.fecha_inicio ? new Date(e.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
                        </p>
                      </div>
                      {suyas > 0 && (
                        <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-accent/15 text-text-1 border border-accent/30 flex-shrink-0">
                          {suyas}
                        </span>
                      )}
                      <EstadoBadge estado={e.estado} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Lo que pedí y sigue esperando respuesta */}
      {misSolicitudesAbiertas.length > 0 && (
        <section className="rounded-3xl border border-border bg-surface/60 overflow-hidden">
          <header className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-text-1">Lo que pediste y sigue sin respuesta</h2>
            <Link to="/mi-espacio" className="text-xs text-accent hover:underline">Ver todo →</Link>
          </header>
          <ul className="divide-y divide-border">
            {misSolicitudesAbiertas.slice(0, 5).map(s => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                  ${s.estado === 'en_revision' ? 'bg-warning' : 'bg-text-3/50'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-1 truncate">{s.titulo || s.mensaje}</p>
                  <p className="text-[11px] text-text-3 truncate">
                    {s.evento?.titulo || 'Evento'} · {s.estado === 'en_revision' ? 'la están mirando' : 'sin abrir'}
                  </p>
                </div>
                <span className="text-[11px] text-text-3 tabular-nums flex-shrink-0">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kpi({ valor, label, alerta }) {
  return (
    <div className={`rounded-2xl border px-5 py-4 ${alerta ? 'border-danger/30 bg-danger/5' : 'border-border bg-surface/60'}`}>
      <p className={`text-2xl font-bold font-display tabular-nums ${alerta ? 'text-danger' : 'text-text-1'}`}>{valor}</p>
      <p className="text-xs text-text-3 mt-0.5">{label}</p>
    </div>
  );
}
