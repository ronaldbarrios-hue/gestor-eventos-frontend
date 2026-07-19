import { Link } from 'react-router-dom';
import { useInicioData } from '../../inicio/InicioDataContext.jsx';

/* Resumen de chats: por ahora vía notificaciones de tipo chat.
   (El resumen real por canal llega con la sección Comunicación.) */
export default function MensajesWidget() {
  const { notifs } = useInicioData();
  const deChat = notifs.filter(n => (n.tipo || '').includes('chat') || (n.titulo || '').toLowerCase().includes('mensaje'));

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 px-5 py-4">
        {deChat.length > 0 ? (
          <ul className="space-y-2.5">
            {deChat.slice(0, 4).map(n => (
              <li key={n.id} className="text-sm text-text-1 truncate">{n.titulo}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-2">Sin mensajes nuevos.</p>
        )}
      </div>
      <Link to="/chat" className="block text-center text-sm text-accent hover:underline py-3 border-t border-border">
        Abrir chats →
      </Link>
    </div>
  );
}
