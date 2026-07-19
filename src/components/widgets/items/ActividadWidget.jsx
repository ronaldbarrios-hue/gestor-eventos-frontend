import { useInicioData } from '../../inicio/InicioDataContext.jsx';

function tiempoRelativo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return 'ahora';
  if (diff < 3600)   return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

/* Timeline global: por ahora se alimenta de notificaciones.
   (Fase 6: feed de actividad real de la organización en backend.) */
export default function ActividadWidget() {
  const { notifs, loading } = useInicioData();
  const items = notifs.slice(0, 6);

  if (loading) return <p className="text-sm text-text-3 p-5">Cargando…</p>;
  if (items.length === 0) return <p className="text-sm text-text-2 text-center py-8 px-5">Sin actividad reciente.</p>;

  return (
    <ul className="px-5 py-3 space-y-3">
      {items.map(n => (
        <li key={n.id} className="flex gap-2.5 items-start">
          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-text-1 leading-snug truncate">{n.titulo}</p>
            <p className="text-[11px] text-text-3">{tiempoRelativo(n.created_at)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
