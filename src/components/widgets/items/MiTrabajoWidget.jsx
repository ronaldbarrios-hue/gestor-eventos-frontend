import { Link } from 'react-router-dom';
import { useInicioData } from '../../inicio/InicioDataContext.jsx';

export default function MiTrabajoWidget() {
  const { solicitudes, loading } = useInicioData();
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente' || s.estado === 'abierta');
  const items = solicitudes.slice(0, 5);

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-2 gap-3 p-4 pb-3">
        <Stat label="Pendientes" valor={loading ? '—' : pendientes.length} tono="warning" />
        <Stat label="Totales" valor={loading ? '—' : solicitudes.length} tono="primary" />
      </div>
      <div className="flex-1 divide-y divide-border overflow-hidden">
        {items.map((s, i) => (
          <div key={s.id || i} className="px-5 py-2.5">
            <p className="text-sm text-text-1 truncate">{s.titulo || s.contenido?.slice(0, 60) || '(sin texto)'}</p>
            <p className="text-xs text-text-3 truncate">{s.evento_titulo} · {s.estado}</p>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="text-sm text-text-2 text-center py-6">Nada pendiente. Buen trabajo ✨</p>
        )}
      </div>
      <Link to="/mi-espacio" className="block text-center text-sm text-accent hover:underline py-3 border-t border-border">
        Ir a Mi Espacio →
      </Link>
    </div>
  );
}

function Stat({ label, valor, tono }) {
  const tonos = { warning: 'text-warning bg-warning/10', primary: 'text-primary bg-primary/10' };
  return (
    <div className={`rounded-2xl px-4 py-3 ${tonos[tono] || tonos.primary}`}>
      <p className="text-2xl font-bold font-display tabular-nums">{valor}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}
