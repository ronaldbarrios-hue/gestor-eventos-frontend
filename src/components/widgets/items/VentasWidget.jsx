import { useInicioData } from '../../inicio/InicioDataContext.jsx';

export default function VentasWidget() {
  const { eventos, loading } = useInicioData();
  const vendidos = eventos.reduce((s, e) => s + (e.aforo_vendido || 0), 0);
  const top = [...eventos].sort((a, b) => (b.aforo_vendido || 0) - (a.aforo_vendido || 0)).slice(0, 3);

  return (
    <div className="p-5 space-y-4">
      <div>
        <p className="text-3xl font-bold font-display text-text-1 tabular-nums">{loading ? '—' : vendidos.toLocaleString('es-CO')}</p>
        <p className="text-xs text-text-3">Boletas vendidas en total</p>
      </div>
      <div className="space-y-2">
        {top.map(e => {
          const pct = e.aforo_total > 0 ? Math.min(100, Math.round((e.aforo_vendido || 0) / e.aforo_total * 100)) : 0;
          return (
            <div key={e.id}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-2 truncate pr-2">{e.titulo}</span>
                <span className="text-text-3 tabular-nums flex-shrink-0">{e.aforo_vendido || 0}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {!loading && top.length === 0 && <p className="text-sm text-text-2">Aún no hay ventas registradas.</p>}
      </div>
    </div>
  );
}
