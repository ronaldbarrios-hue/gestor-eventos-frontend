import { Link } from 'react-router-dom';
import { useInicioData } from '../../inicio/InicioDataContext.jsx';

/* Sugerencias derivadas de la actividad (proactivo, no chat). */
export default function GestbotWidget() {
  const { eventos, notifs, solicitudes, loading } = useInicioData();

  const sugerencias = [];
  const borradores = eventos.filter(e => e.estado === 'borrador');
  if (borradores.length > 0)
    sugerencias.push(`Tienes ${borradores.length} evento${borradores.length > 1 ? 's' : ''} en borrador sin publicar.`);
  const pend = solicitudes.filter(s => s.estado === 'pendiente' || s.estado === 'abierta');
  if (pend.length > 0)
    sugerencias.push(`Hay ${pend.length} solicitud${pend.length > 1 ? 'es' : ''} esperando respuesta.`);
  const sinLeer = notifs.filter(n => !n.leida);
  if (sinLeer.length > 3)
    sugerencias.push(`Se acumulan ${sinLeer.length} notificaciones sin leer.`);
  if (!loading && sugerencias.length === 0)
    sugerencias.push('Todo en orden. Puedo ayudarte a crear tu próximo evento.');

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-accent/10 to-transparent">
      <ul className="flex-1 px-5 py-4 space-y-2.5">
        {sugerencias.slice(0, 3).map((s, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="text-accent mt-0.5">✦</span>
            <p className="text-sm text-text-1 leading-snug">{s}</p>
          </li>
        ))}
      </ul>
      <Link to="/gestbot" className="block text-center text-sm font-medium text-white bg-accent hover:bg-accent-dark transition-colors py-2.5 mx-4 mb-4 rounded-xl">
        Hablar con Gestbot
      </Link>
    </div>
  );
}
