import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import Icono from '../ui/Iconos.jsx';
import { resolveBranding, navbarConfig, seccionesDe } from './EventChrome.jsx';

/* GESTEK — El marco del evento: lo que hace que sus páginas se sientan una sola.
 *
 * ── El problema, dicho por quien lo usa ──────────────────────────────────
 *
 * «Al seleccionar Mapa del evento, y al darle en Rueda de negocios, es como si
 * redirigiera a otra página». Y es literal, aunque el enlace fuera correcto:
 * la portada llevaba el logo del organizador, su marca y su navbar; la agenda,
 * el torneo, el mapa y el ranking llevaban otra cosa —esta barra, con el título
 * dentro de un botón de volver y nada más—. No es que el visitante saliera del
 * evento: es que el evento dejaba de verse.
 *
 * Así que aquí vive esa ropa, una sola vez y para todas: quién organiza esto,
 * cómo se llama el evento y a qué otras partes suyas se puede ir. Moverse entre
 * ellas pasa a ser cambiar de sección, no de sitio.
 *
 * ── Un solo color, y la actual marcada ───────────────────────────────────
 *
 * Los botones estaban pintados de cinco colores distintos —dorado, ámbar, verde
 * y dos grises— sin que el color significara nada: la rueda de negocios no es
 * más importante que el mapa. Cinco cosas del mismo tipo pintadas de cinco
 * maneras es media respuesta a por qué algo «se ve hecho a medias». Ahora todas
 * se ven igual y **la actual se marca**, que es la única diferencia que un
 * visitante necesita para saber dónde está.
 *
 * ── Por qué ya no hay un «volver» ────────────────────────────────────────
 *
 * Antes el evento era un botón de volver con una flecha. Pero desde la agenda
 * no se «vuelve» al evento: se va a Inicio, que es una sección más de la misma
 * lista. Y quien llega desde una búsqueda nunca pasó por la portada, así que no
 * tiene a dónde volver. El nombre del evento sigue llevando a la portada
 * —encabeza el marco— y eso es lo que hace de casa.
 *
 * Dentro de un iframe NO se pinta: ahí el visitante está en la web de otro y
 * estos enlaces lo sacarían del sitio que estaba mirando; el embed ya trae su
 * propia regla de que todo abra en pestaña nueva.
 */

/* Los ids que usaban las páginas antes de que la lista fuera compartida. Se
   aceptan los dos para no tener que tocar once llamadas por un cambio de
   nombre —y porque «agenda» sigue siendo como la llama la ruta. */
const ALIAS = { agenda: 'espacio' };

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
      /* Si no carga, el marco desaparece y la página sigue siendo legible.
         Nunca al revés: un fallo del marco no puede tumbar el contenido. */
      .catch(() => {});
    return () => { vivo = false; };
  }, [slug, eventoProp, enEmbed]);

  if (enEmbed || !evento) return null;

  const { logoUrl, nombreOrg } = resolveBranding(evento);
  const secciones = seccionesDe(evento, navbarConfig(evento.page_json));
  const aqui = ALIAS[actual] || actual;

  return (
    <header className="mb-6 space-y-3">
      <Link to={`/explorar/${slug}`} className="flex items-center gap-3 min-w-0 group w-fit">
        {logoUrl
          ? <img src={logoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, var(--brand-primary, #C9A227), var(--brand-accent, #E0B12B))' }}>
              {(nombreOrg || 'E').charAt(0).toUpperCase()}
            </div>
          )}
        <div className="min-w-0">
          <p className="text-base font-bold font-display text-text-1 tracking-tight truncate group-hover:underline">
            {evento.titulo}
          </p>
          {nombreOrg && nombreOrg !== evento.titulo && (
            <p className="text-[11px] text-text-3 truncate">{nombreOrg}</p>
          )}
        </div>
      </Link>

      {secciones.length > 0 && (
        <nav aria-label="Secciones del evento" className="flex items-center gap-2 flex-wrap">
          {secciones.map(s => {
            const esta = s.id === aqui;
            return (
              <Link key={s.id}
                to={`/explorar/${slug}${s.ruta ? `/${s.ruta}` : ''}`}
                aria-current={esta ? 'page' : undefined}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors
                  ${esta
                    ? 'border-text-1 bg-text-1 text-bg font-medium'
                    : 'border-border text-text-2 hover:text-text-1 hover:bg-surface-2'}`}>
                <Icono nombre={s.icono} className="w-4 h-4" />{s.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
