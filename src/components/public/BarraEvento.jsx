import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import Icono from '../ui/Iconos.jsx';

/* GESTEK — La barra que conecta las páginas de UN evento entre sí.

   El evento tenía sus espacios repartidos en rutas hermanas —agenda, rueda de
   negocios, torneo, ranking, términos— y sólo la página principal sabía que
   existían. Al entrar en cualquiera de ellas el visitante se quedaba sin
   nombre del evento, sin las otras y sin manera de volver: la agenda pública
   decía «Todo lo que pasa dentro» y nada más, sin decir dentro de QUÉ.

   La salida no es añadir un «volver» a cada página, que devolvería al punto de
   partida y obligaría a pasar por el evento para ir de la agenda al torneo. Es
   que todas lleven la misma barra: quién organiza esto, y a dónde más se puede
   ir desde aquí.

   Dentro de un iframe NO se pinta. Ahí el visitante está en la web de otro y
   estos enlaces lo sacarían del sitio que estaba mirando; el embed ya trae su
   propia regla de que todo abra en pestaña nueva. */

const ESPACIOS = [
  { id: 'agenda',     ruta: 'agenda',     label: 'Espacio del evento', icono: 'calendario', bandera: (e) => e.tiene_espacio ?? e.tiene_agenda },
  { id: 'networking', ruta: 'networking', label: 'Rueda de Negocios',  icono: 'manos',      bandera: (e) => e.tiene_networking },
  { id: 'torneo',     ruta: 'torneo',     label: 'Torneo',             icono: 'trofeo',     bandera: (e) => e.tiene_torneo },
  { id: 'ranking',    ruta: 'ranking',    label: 'Ranking',            icono: 'estrella',   bandera: (e) => e.tiene_expositores },
];

export default function BarraEvento({ actual, evento: eventoProp = null }) {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const [evento, setEvento] = useState(eventoProp);

  const enEmbed = pathname.startsWith('/embed/');

  useEffect(() => {
    if (enEmbed || eventoProp || !slug) return;
    let vivo = true;
    eventosApi.publicoBySlug(slug)
      .then(d => { if (vivo) setEvento(d.evento); })
      /* Si no carga, la barra desaparece y la página sigue siendo legible.
         Nunca al revés: un fallo de la barra no puede tumbar el contenido. */
      .catch(() => {});
    return () => { vivo = false; };
  }, [slug, eventoProp, enEmbed]);

  if (enEmbed || !evento) return null;

  const otros = ESPACIOS.filter(e => e.id !== actual && e.bandera(evento));

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
      {/* Al EVENTO, no a explorar: quien llega a la agenda desde un enlace
          compartido casi nunca ha pasado por el listado, y mandarlo allí es
          alejarlo de lo que vino a ver. */}
      <Link to={`/explorar/${slug}`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                   text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors min-w-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="truncate max-w-[15rem]">{evento.titulo || 'Volver al evento'}</span>
      </Link>

      {/* Los demás espacios, para saltar entre ellos sin pasar por el evento. */}
      {otros.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {otros.map(e => (
            <Link key={e.id} to={`/explorar/${slug}/${e.ruta}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                         text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
              <Icono nombre={e.icono} className="w-4 h-4" />{e.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
