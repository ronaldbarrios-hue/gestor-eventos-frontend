import { Link } from 'react-router-dom';
import { useEspacioData } from '../widgets/espacio/EspacioData.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { EstadoBadge } from '../ui/Badge.jsx';
import Icono from '../../components/ui/Icono.jsx';

/* ──────────────────────────────────────────────────────────────────
   Inicio · Vista Colaborador — panorama generalizado de TODO en lo
   que participo: mis tareas de todos los eventos y dónde colaboro.
   El detalle fino y personalizable vive en Mi Espacio.
   ────────────────────────────────────────────────────────────────── */

export default function VistaColaborador() {
  const { eventos, tareas, loading } = useEspacioData();
  const { usuario } = useAuth();

  const colaborando = eventos.filter(e => String(e.owner_id) !== String(usuario?.id));
  const pendientes  = tareas.filter(t => t.estado !== 'hecho');
  const vencidas    = pendientes.filter(t => t.vence_at && new Date(t.vence_at) < new Date());
  const proximas = [...pendientes]
    .sort((a, b) => {
      const peso = { alta: 0, media: 1, baja: 2 };
      const pa = peso[a.prioridad] ?? 1, pb = peso[b.prioridad] ?? 1;
      if (pa !== pb) return pa - pb;
      return new Date(a.vence_at || '2999') - new Date(b.vence_at || '2999');
    })
    .slice(0, 8);

  if (loading) return <p className="text-sm text-text-3 py-10 text-center">Reuniendo tu trabajo en todos los eventos…</p>;

  return (
    <div className="space-y-5">
      {/* KPIs del colaborador */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi valor={colaborando.length} label="Eventos donde colaboro" />
        <Kpi valor={eventos.length} label="Eventos en total" />
        <Kpi valor={pendientes.length} label="Tareas pendientes" />
        <Kpi valor={vencidas.length} label="Vencidas" alerta={vencidas.length > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Tareas de todos los eventos */}
        <section className="lg:col-span-2 rounded-3xl border border-border bg-surface/60 overflow-hidden">
          <header className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-text-1">Mis tareas en todos los eventos</h2>
            <Link to="/mi-espacio" className="text-xs text-accent hover:underline">Ir a Mi Espacio →</Link>
          </header>
          {proximas.length === 0 ? (
            <p className="text-sm text-text-2 text-center py-10">Sin tareas pendientes.</p>
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

        {/* Dónde colaboro */}
        <section className="rounded-3xl border border-border bg-surface/60 overflow-hidden">
          <header className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-text-1">Colaborando en</h2>
          </header>
          {colaborando.length === 0 ? (
            <p className="text-sm text-text-2 text-center py-8 px-5">Aún no te han invitado a colaborar en eventos de otros.</p>
          ) : (
            <ul className="divide-y divide-border">
              {colaborando.slice(0, 6).map(e => (
                <li key={e.id}>
                  <Link to={`/eventos/${e.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50 transition-colors">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {(e.titulo || '?')[0].toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-1 truncate">{e.titulo}</p>
                      <p className="text-[11px] text-text-3">
                        {e.fecha_inicio ? new Date(e.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
                      </p>
                    </div>
                    <EstadoBadge estado={e.estado} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
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
