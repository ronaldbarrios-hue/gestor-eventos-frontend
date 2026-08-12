import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import { legalApi } from '../../api/legal.js';
import GLoader from '../../components/ui/GLoader.jsx';
import EventoSubPagina from '../../components/public/EventoSubPagina.jsx';

/* /explorar/:slug/legal — los términos y la privacidad DEL EVENTO.

   Existe para que el enlace del formulario de inscripción tenga siempre a dónde
   ir. Antes lo legal del evento era un `terminos_url` opcional apagado por
   defecto: si el organizador no tenía web, el formulario recogía documento,
   teléfono y datos de la ficha de caracterización sin decir bajo qué condiciones.

   Los de GESTEK y los del evento son cosas distintas y aquí se dicen las dos:
   GESTEK responde por la plataforma, el organizador por su evento. Si el
   organizador no publicó los suyos, esta página lo dice en vez de fingir que no
   existen — y deja los de GESTEK a un clic. */

export default function EventoLegalPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const [datos, setDatos] = useState(undefined);
  const [evento, setEvento] = useState(null);
  const [error, setError] = useState('');
  /* ?doc=privacidad abre directamente esa pestaña, para que el enlace del
     formulario pueda apuntar a la que toca. */
  const [tab, setTab] = useState(params.get('doc') === 'privacidad' ? 'privacidad' : 'terminos');

  useEffect(() => {
    legalApi.publico(slug)
      .then(d => { setDatos(d); setEvento(d.evento); })
      .catch(e => setError(e.response?.data?.error || e.message));
    /* La cabecera necesita la marca del organizador, que viene del evento. */
    eventosApi.publicoBySlug(slug).then(d => setEvento(v => ({ ...(v || {}), ...d.evento }))).catch(() => {});
  }, [slug]);

  if (error) return (
    <section className="px-5 py-20 max-w-md mx-auto text-center">
      <p className="text-sm text-danger mb-4">{error}</p>
      <Link to="/explorar" className="text-sm text-text-2 hover:text-text-1">← Volver a explorar</Link>
    </section>
  );

  if (datos === undefined) return (
    <section className="px-5 py-20 max-w-2xl mx-auto"><GLoader message="Cargando…" /></section>
  );

  const l = datos.legal || {};
  const activo = tab === 'terminos'
    ? { texto: l.terminos_texto, url: l.terminos_url, tiene: datos.tiene_terminos, nombre: 'términos y condiciones' }
    : { texto: l.privacidad_texto, url: l.privacidad_url, tiene: datos.tiene_privacidad, nombre: 'política de privacidad' };

  const organizador = datos.evento?.organizador?.empresa
    || datos.evento?.organizador?.nombre
    || 'el organizador';

  return (
    <EventoSubPagina
      evento={evento}
      slug={slug}
      titulo="Términos del evento"
      descripcion={`Condiciones propias de este evento, definidas por ${organizador}. Los de la plataforma van aparte.`}
      ancho="max-w-3xl"
      tabs={[
        { id: 'terminos', label: 'Términos y condiciones' },
        { id: 'privacidad', label: 'Privacidad' },
      ]}
      tabActiva={tab}
      onTab={setTab}
    >
      {/* Quién responde por qué. Es la razón de que esta página exista. */}
      <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3 mb-6">
        <p className="text-xs text-text-2 leading-relaxed">
          Estos documentos los define <strong className="text-text-1">{organizador}</strong> y
          cubren este evento. Los de la plataforma son otros y los firma GESTEK:{' '}
          <Link to="/terminos" className="text-primary-light hover:underline">términos de GESTEK</Link>
          {' · '}
          <Link to="/privacidad" className="text-primary-light hover:underline">privacidad de GESTEK</Link>.
        </p>
      </div>

      {!activo.tiene ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-10">
          <p className="text-base text-text-1 font-medium mb-2">
            {organizador} no publicó {activo.nombre} propios.
          </p>
          <p className="text-sm text-text-2 leading-relaxed">
            Mientras no los publique, rigen los de la plataforma. Si necesitas algo específico
            sobre este evento —qué se hace con tus datos, cancelaciones, devoluciones— pregúntale
            directamente a quien lo organiza.
          </p>
          <Link to={tab === 'terminos' ? '/terminos' : '/privacidad'}
            className="inline-block mt-4 text-sm text-primary-light hover:underline">
            Ver {activo.nombre} de GESTEK →
          </Link>
        </div>
      ) : activo.url ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-10 text-center">
          <p className="text-sm text-text-2 mb-4 leading-relaxed">
            {organizador} publica {activo.nombre} en su propio sitio.
          </p>
          <a href={activo.url} target="_blank" rel="noreferrer noopener" className="btn-primary">
            Abrir {activo.nombre}
          </a>
          <p className="text-[11px] text-text-3 mt-3 font-mono break-all">{activo.url}</p>
        </div>
      ) : (
        /* Texto escrito por el organizador. Se pinta con whitespace-pre-wrap y
           NO como HTML: es texto de un tercero, y renderizarlo como marcado
           sería dejar que cualquiera inyecte lo que quiera en una página que
           todo el mundo abre. */
        <article className="rounded-3xl border border-border bg-surface/40 px-6 py-7">
          <p className="text-sm text-text-1 leading-relaxed whitespace-pre-wrap">{activo.texto}</p>
        </article>
      )}

      {(l.responsable || l.contacto_datos) && (
        <div className="mt-6 rounded-2xl border border-border bg-surface/40 px-4 py-3">
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1.5">
            Responsable de los datos
          </p>
          {l.responsable && <p className="text-sm text-text-1">{l.responsable}</p>}
          {l.contacto_datos && <p className="text-sm text-text-2">{l.contacto_datos}</p>}
        </div>
      )}

      {l.updated_at && (
        <p className="text-[11px] text-text-3 mt-4">
          Actualizado el {new Date(l.updated_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
      )}
    </EventoSubPagina>
  );
}
