import { Link } from 'react-router-dom';
import { useInicioData } from '../../inicio/InicioDataContext.jsx';
import { EstadoBadge } from '../../ui/Badge.jsx';

export default function EventosActivosWidget() {
  const { eventos, loading } = useInicioData();
  const activos = eventos
    .filter(e => ['publicado', 'borrador', 'en_curso'].includes(e.estado))
    .slice(0, 5);

  if (loading) return <Skeleton />;
  if (activos.length === 0) return (
    <div className="p-6 text-center">
      <p className="text-sm text-text-2 mb-3">Aún no tienes eventos activos.</p>
      <Link to="/eventos/nuevo" className="btn-primary btn-sm inline-flex">Crear evento</Link>
    </div>
  );

  return (
    <div className="divide-y divide-border">
      {activos.map(e => {
        const pct = e.aforo_total > 0 ? Math.min(100, Math.round((e.aforo_vendido || 0) / e.aforo_total * 100)) : null;
        return (
          <Link key={e.id} to={`/eventos/${e.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
              {(e.titulo || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-1 truncate">{e.titulo}</p>
              <p className="text-xs text-text-3 truncate">
                {e.fecha_inicio ? new Date(e.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
                {' · '}{e.aforo_vendido || 0} asistentes{pct !== null ? ` · ${pct}%` : ''}
              </p>
            </div>
            <EstadoBadge estado={e.estado} />
          </Link>
        );
      })}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="divide-y divide-border">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="w-9 h-9 rounded-xl bg-surface-2 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-40 bg-surface-2 rounded animate-pulse" />
            <div className="h-2.5 w-24 bg-surface-2 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
