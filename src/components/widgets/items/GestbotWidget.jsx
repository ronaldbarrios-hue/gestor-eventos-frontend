/* «Sugerencias de Gestbot» en el Inicio.
 *
 * Es proactivo y no un chat: lo que se ve son cosas que ya pasaron —borradores
 * sin publicar, solicitudes esperando, notificaciones acumuladas— y cada una
 * lleva a donde se resuelve. Un widget que sólo dijera «pregúntame algo»
 * ocuparía sitio sin adelantar trabajo.
 *
 * ── El bot ya no vive aquí ────────────────────────────────────────────────
 *
 * Estaba dentro de la tarjeta, mirando al usuario, y ocupaba 78px de ancho en
 * la esquina. Se quitó por dos razones: el bot ya está en la barra lateral,
 * siempre presente, así que aquí era el mismo personaje dos veces en la misma
 * pantalla; y lo que esta tarjeta aporta son las sugerencias, que con el bot
 * al lado quedaban en una columna más estrecha de lo necesario.
 *
 * Lo que se pierde —el gesto que reaccionaba a lo urgente— se recupera en la
 * barra lateral, que es donde el personaje vive ahora. */

import { Link } from 'react-router-dom';
import { useInicioData } from '../../inicio/InicioDataContext.jsx';

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

  /* Publicado y a medias es peor que en borrador: el borrador no lo ve nadie,
     y esto sí. Se mira sobre los campos del evento que ya vienen en la carga
     del Inicio, así que no cuesta una petición más. */
  const incompletos = eventos.filter(e =>
    ['publicado', 'en_curso'].includes(e.estado) && (!e.cover_url || !e.location_nombre));
  if (incompletos.length > 0) {
    const [uno] = incompletos;
    avisos.push({
      texto: incompletos.length === 1
        ? `«${uno.titulo}» está publicado sin ${!uno.cover_url ? 'portada' : 'dirección'}.`
        : `${incompletos.length} eventos publicados a medias: les falta portada o dirección.`,
      a: incompletos.length === 1 ? `/eventos/${uno.id}` : '/eventos',
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
      <div className="flex-1 min-h-0 px-5 py-4">
        <div className="min-w-0">
          {tranquilo ? (
            <p className="text-sm text-text-1 leading-snug">
              Todo en orden. Puedo ayudarte a crear tu próximo evento.
            </p>
          ) : (
            /* Ahora el widget es ancho (lg), así que caben cuatro avisos sin
               partir frases en tres líneas. Más de cuatro sería una bandeja
               de entrada, y para eso están las notificaciones. */
            <ul className="space-y-2">
              {avisos.slice(0, 4).map((a, i) => (
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
