import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../../api/client.js';
import GLoader from '../../components/ui/GLoader.jsx';
import Volver from '../../components/ui/Volver.jsx';

/* La rueda de negocios, para quien todavía no es nadie aquí.
 *
 * ── Por qué existe, y por qué es sólo lectura ────────────────────────────
 *
 * La otra pantalla de networking pide sesión y boleta, y está bien: es donde
 * quien va al evento reserva. Pero antes de eso hay alguien mirando desde
 * fuera y preguntándose si le interesa venir — y a esa persona no se le puede
 * pedir una cuenta para contestarle.
 *
 * Aquí se ve quién recibe, en qué mesa, a qué horas queda sitio y un contacto
 * si esa persona quiso publicarlo. **No se reserva.** Los vendedores no se
 * registran solos: los sienta quien gestiona la rueda, o se ponen en contacto
 * por fuera. Un botón de «reservar» sin cuenta convertiría esto en una lista
 * de nombres que cualquiera puede llenar.
 *
 * ── Lo que NO se enseña ──────────────────────────────────────────────────
 *
 * Quién ocupa cada hora. Que una mesa esté llena a las diez es información
 * útil; quién está sentado, no es de nadie. El servidor manda `libre: true` o
 * `false` y ni siquiera envía el nombre.
 *
 * Y los contactos: sólo los de quien lo autorizó. Eso se filtra en el
 * servidor, no aquí — filtrarlo en la pantalla dejaría los datos viajando en
 * la respuesta, y una respuesta se abre con la consola del navegador.
 */
export default function RuedaPublicaPage() {
  const { slug } = useParams();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    client.get(`/eventos/publicos/slug/${slug}/rueda`)
      .then(r => { if (vivo) setDatos(r.data); })
      .catch(e => { if (vivo) setError(e.response?.data?.error || e.message); });
    return () => { vivo = false; };
  }, [slug]);

  if (error) return (
    <section className="px-5 sm:px-8 py-16 max-w-3xl mx-auto text-center">
      <p className="text-sm text-danger">{error}</p>
      <Volver a={`/explorar/${slug}`} tono="chip" className="mt-4">Ver el evento</Volver>
    </section>
  );
  if (!datos) return <GLoader message="Cargando la rueda…" />;

  return (
    <section className="px-5 sm:px-8 py-8 sm:py-12 max-w-5xl mx-auto space-y-6">
      <div>
        <Volver a={`/explorar/${slug}`}>Volver al evento</Volver>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-1 tracking-tight mt-3">
          Rueda de negocios
        </h1>
        <p className="text-sm text-text-2 mt-1">{datos.evento?.titulo}</p>
      </div>

      {datos.total === 0 ? (
        /* «Todavía no» y «no hay» se leen igual en una pantalla vacía, y son
           cosas distintas: la primera invita a volver. */
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-2">Todavía no hay mesas publicadas para esta rueda.</p>
          <p className="text-xs text-text-3 mt-1">Vuelve a mirar más cerca de la fecha.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-text-2 leading-relaxed max-w-2xl">
            Estas son las empresas que reciben, con su mesa y las horas que siguen libres.
            Para pedir un espacio, escribe al contacto de la mesa que te interese o a quien
            organiza el evento — desde aquí no se reserva.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {datos.rueda.map(m => <Mesa key={m.id} m={m} />)}
          </div>
        </>
      )}
    </section>
  );
}

function Mesa({ m }) {
  const libres = m.horarios.filter(h => h.libre);

  return (
    <article className="rounded-2xl border border-border bg-surface/40 p-5 space-y-3">
      <header className="flex items-start gap-3">
        {m.logo_url
          ? <img src={m.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0" />
          : <div className="w-12 h-12 rounded-xl bg-surface-2 text-text-3 flex items-center justify-center font-semibold flex-shrink-0">
              {(m.nombre || '?').charAt(0).toUpperCase()}
            </div>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-1 truncate">{m.nombre}</h2>
          <p className="text-xs text-text-3">
            {m.mesa ? `Mesa ${m.mesa}` : 'Mesa por asignar'}
            {m.categoria ? ` · ${m.categoria}` : ''}
          </p>
        </div>
      </header>

      {m.descripcion && (
        <p className="text-sm text-text-2 leading-relaxed line-clamp-3">{m.descripcion}</p>
      )}

      <div>
        <p className="text-[11px] uppercase tracking-wide text-text-3 mb-1.5">
          {libres.length > 0
            ? `${libres.length} de ${m.horarios.length} horas libres`
            : m.horarios.length > 0 ? 'Sin horas libres' : 'Sin horario publicado'}
        </p>
        {/* Las ocupadas se enseñan tachadas en vez de esconderlas: saber que la
            mesa está llena a las diez es tan útil como saber que a las once
            hay sitio, y esconderlas haría parecer que el día es más corto. */}
        <div className="flex flex-wrap gap-1.5">
          {m.horarios.map(h => (
            <span key={h.id}
              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                h.libre
                  ? 'border-success/40 bg-success/10 text-text-1'
                  : 'border-border text-text-3 line-through'}`}>
              {new Date(h.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          ))}
        </div>
      </div>

      {m.contacto && (
        <div className="pt-3 border-t border-border space-y-0.5">
          <p className="text-[11px] uppercase tracking-wide text-text-3">Contacto</p>
          {m.contacto.nombre && <p className="text-sm text-text-1">{m.contacto.nombre}</p>}
          {m.contacto.email && (
            <a href={`mailto:${m.contacto.email}`} className="text-sm text-primary-light hover:underline block truncate">
              {m.contacto.email}
            </a>
          )}
          {m.contacto.telefono && (
            <a href={`tel:${m.contacto.telefono}`} className="text-sm text-primary-light hover:underline block">
              {m.contacto.telefono}
            </a>
          )}
        </div>
      )}

      {m.sitio_web && (
        <a href={m.sitio_web} target="_blank" rel="noreferrer noopener"
           className="text-xs text-text-3 hover:text-text-1 hover:underline block truncate">
          {m.sitio_web}
        </a>
      )}
    </article>
  );
}
