/* El widget de Gestbot en el Inicio.

   Antes era una ranura estrecha con un aviso y un botón, y no se distinguía
   de cualquier otra tarjeta de la rejilla. Ahora el bot está DENTRO: mira al
   usuario, y lo que dice sale de él en vez de aparecer como texto suelto.

   Sigue siendo proactivo y no un chat. Lo que se ve son cosas que ya pasaron
   —borradores sin publicar, solicitudes esperando, notificaciones acumuladas—
   y cada una lleva a donde se resuelve. Un widget que solo dijera "pregúntame
   algo" ocuparía sitio sin adelantar trabajo.

   El aviso más urgente manda el gesto del bot: si hay algo esperando
   respuesta se pone atento, y si no, se queda contento. Es la diferencia
   entre un personaje decorativo y uno que reacciona a tu situación. */

import { Link } from 'react-router-dom';
import { useInicioData } from '../../inicio/InicioDataContext.jsx';
import Criatura from '../../agente/Criatura.jsx';

export default function GestbotWidget() {
  const { eventos, notifs, solicitudes, loading } = useInicioData();

  /* Cada aviso lleva a donde se resuelve. Decirle a alguien que tiene tres
     borradores sin publicar y no llevarlo a ellos es darle una tarea, no
     ayuda. */
  const avisos = [];

  const borradores = eventos.filter(e => e.estado === 'borrador');
  if (borradores.length > 0) {
    avisos.push({
      texto: `Tienes ${borradores.length} evento${borradores.length > 1 ? 's' : ''} en borrador sin publicar.`,
      a: '/eventos',
      urgente: false,
    });
  }

  const pend = solicitudes.filter(s => s.estado === 'pendiente' || s.estado === 'abierta');
  if (pend.length > 0) {
    avisos.push({
      texto: `Hay ${pend.length} solicitud${pend.length > 1 ? 'es' : ''} esperando respuesta.`,
      a: '/espacio',
      urgente: true,
    });
  }

  const sinLeer = notifs.filter(n => !n.leida);
  if (sinLeer.length > 3) {
    avisos.push({
      texto: `Se acumulan ${sinLeer.length} notificaciones sin leer.`,
      a: '/espacio',
      urgente: false,
    });
  }

  const tranquilo = !loading && avisos.length === 0;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-accent/10 to-transparent">
      <div className="flex-1 min-h-0 flex items-start gap-4 px-5 py-4">
        {/* El bot. Reacciona a lo que hay: atento si algo espera respuesta,
            contento si no hay nada pendiente. */}
        <div className="flex-shrink-0 -mt-1" aria-hidden="true">
          <Criatura
            size={78}
            mood={loading ? "thinking" : (avisos.some(a => a.urgente) ? "atento" : (tranquilo ? "happy" : "talking"))}
            seguirCursor
          />
        </div>

        <div className="min-w-0 flex-1">
          {tranquilo ? (
            <p className="text-sm text-text-1 leading-snug">
              Todo en orden. Puedo ayudarte a crear tu próximo evento.
            </p>
          ) : (
            <ul className="space-y-2">
              {avisos.slice(0, 3).map((a, i) => (
                <li key={i}>
                  <Link
                    to={a.a}
                    className="group flex items-start gap-2.5 rounded-lg -mx-1.5 px-1.5 py-1
                               hover:bg-surface-2/70 transition-colors"
                  >
                    {/* Un punto, no un símbolo decorativo. El punto de los
                        urgentes va en latón y el resto apagado, así el orden
                        de importancia se ve sin leer. */}
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0
                                      ${a.urgente ? 'bg-accent' : 'bg-text-3/50'}`} />
                    <p className="text-sm text-text-1 leading-snug group-hover:text-accent transition-colors">
                      {a.texto}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Link
        to="/gestbot"
        className="block text-center text-sm font-medium text-white bg-accent hover:bg-accent-dark
                   transition-colors py-2.5 mx-4 mb-4 rounded-xl flex-shrink-0"
      >
        Hablar con Gestbot
      </Link>
    </div>
  );
}
