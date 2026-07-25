import { Link } from 'react-router-dom';
import { useInicioData } from '../../inicio/InicioDataContext.jsx';

export default function NotificacionesWidget() {
  const { notifs, loading } = useInicioData();
  const sinLeer = notifs.filter(n => !n.leida).slice(0, 5);

  if (loading) return <p className="text-sm text-text-3 p-5">Cargando…</p>;
  if (sinLeer.length === 0) return <p className="text-sm text-text-2 text-center py-8 px-5">Sin alertas nuevas.</p>;

  return (
    <div className="h-full flex flex-col">
      <ul className="flex-1 divide-y divide-border">
        {sinLeer.map(n => (
          <li key={n.id} className="px-5 py-2.5">
            <p className="text-sm text-text-1 leading-snug truncate">{n.titulo}</p>
            {n.cuerpo && <p className="text-xs text-text-3 truncate">{n.cuerpo}</p>}
          </li>
        ))}
      </ul>
      <Link to="/notificaciones" className="block text-center text-sm text-accent hover:underline py-3 border-t border-border">
        Ver todas →
      </Link>
    </div>
  );
}
