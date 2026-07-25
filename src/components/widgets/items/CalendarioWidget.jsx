import { Link } from 'react-router-dom';
import { useInicioData } from '../../inicio/InicioDataContext.jsx';

/* Próximos compromisos: por ahora, fechas de los eventos del usuario.
   (Reuniones/check-in/montajes se integran cuando la agenda global exista.) */
export default function CalendarioWidget() {
  const { eventos, loading } = useInicioData();
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const proximos = eventos
    .filter(e => e.fecha_inicio && new Date(e.fecha_inicio) >= hoy)
    .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
    .slice(0, 5);

  if (loading) return <p className="text-sm text-text-3 p-5">Cargando…</p>;
  if (proximos.length === 0) return <p className="text-sm text-text-2 text-center py-8 px-5">Sin compromisos próximos.</p>;

  return (
    <div className="divide-y divide-border">
      {proximos.map(e => {
        const f = new Date(e.fecha_inicio);
        return (
          <Link key={e.id} to={`/eventos/${e.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50 transition-colors">
            <div className="w-10 rounded-xl bg-surface-2 text-center py-1 flex-shrink-0">
              <p className="text-[10px] uppercase text-text-3 leading-none">{f.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}</p>
              <p className="text-base font-bold font-display text-text-1 leading-tight">{f.getDate()}</p>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-1 truncate">{e.titulo}</p>
              <p className="text-xs text-text-3">{f.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
