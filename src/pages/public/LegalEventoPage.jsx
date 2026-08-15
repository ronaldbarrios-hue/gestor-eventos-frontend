import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import Spinner from '../../components/ui/Spinner.jsx';

/* GESTEK — Los términos y la privacidad de UN evento, en público.

   Esta página faltaba, y su ausencia dejaba coja toda la cadena legal: el
   backend guardaba los documentos (0059), el editor del panel permitía
   escribirlos, y el bloque de consentimiento del checkout enlazaba a
   `/explorar/:slug/legal`… que no era una ruta. El enlace caía al inicio.

   O sea que un organizador podía escribir sus términos, ver la casilla de
   aceptación en el formulario, y el asistente que pulsaba «léelos» acababa en
   la portada. Aceptar unas condiciones que no se pueden leer no es aceptar
   nada — y con un formulario que pide documento, teléfono y datos sensibles,
   eso es justo lo que no puede pasar.

   Sin sesión: la sirve la ruta pública `/eventos/publicos/slug/:slug/legal`. */

export default function LegalEventoPage() {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    eventosApi.legalPublico(slug)
      .then(r => vivo && setD(r))
      .catch(e => vivo && setError(e.response?.data?.error || 'No se pudo cargar.'));
    return () => { vivo = false; };
  }, [slug]);

  /* El ancla del enlace («#terminos» o «#privacidad») decide a cuál se baja.
     Se hace después de pintar, porque antes el elemento no existe. */
  useEffect(() => {
    if (!d) return;
    const id = window.location.hash.replace('#', '');
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [d]);

  if (error) {
    return (
      <Marco>
        <p className="text-sm text-text-2">{error}</p>
        <Link to="/explorar" className="btn-secondary btn-sm mt-4">Ver otros eventos</Link>
      </Marco>
    );
  }
  if (!d) return <Marco><div className="py-10 flex justify-center"><Spinner /></div></Marco>;

  const { evento, legal, tiene_terminos, tiene_privacidad } = d;
  const organizador = evento?.organizador?.empresa || evento?.organizador?.nombre;

  return (
    <Marco>
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Condiciones del evento</p>
      <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-1 tracking-tight mt-1">
        {evento?.titulo}
      </h1>
      {organizador && (
        <p className="text-sm text-text-3 mt-1">Organiza {organizador}</p>
      )}

      {/* Quién responde, arriba del todo: es lo primero que hace falta cuando
          alguien viene a esta página con un problema. */}
      {(legal?.responsable || legal?.contacto_datos) && (
        <div className="mt-5 rounded-2xl border border-border bg-surface-2/40 px-4 py-3 text-sm">
          {legal.responsable && <p className="text-text-1">{legal.responsable}</p>}
          {legal.contacto_datos && (
            <p className="text-text-3 text-xs mt-0.5">
              Para reclamos sobre tus datos:{' '}
              <a href={`mailto:${legal.contacto_datos}`} className="text-primary-light hover:underline">
                {legal.contacto_datos}
              </a>
            </p>
          )}
        </div>
      )}

      <Documento id="terminos" titulo="Términos y condiciones"
        texto={legal?.terminos_texto} url={legal?.terminos_url} hay={tiene_terminos} />

      <Documento id="privacidad" titulo="Tratamiento de datos personales"
        texto={legal?.privacidad_texto} url={legal?.privacidad_url} hay={tiene_privacidad} />

      {/* Los de GESTEK cubren la plataforma y son otra cosa. Decirlo evita que
          alguien crea que aquí está todo, o que reclame a quien no es. */}
      <div className="mt-8 pt-5 border-t border-border text-xs text-text-3 leading-relaxed">
        Estas condiciones las publica quien organiza el evento y cubren el evento.
        El uso de la plataforma se rige por los{' '}
        <a href="/terminos" target="_blank" rel="noreferrer" className="underline hover:text-text-2">términos de GESTEK</a>{' '}
        y su{' '}
        <a href="/privacidad" target="_blank" rel="noreferrer" className="underline hover:text-text-2">política de privacidad</a>.
      </div>

      <Link to={`/explorar/${slug}`} className="btn-secondary btn-sm mt-6">← Volver al evento</Link>
    </Marco>
  );
}

function Documento({ id, titulo, texto, url, hay }) {
  return (
    <section id={id} className="mt-8 scroll-mt-6">
      <h2 className="text-lg font-semibold font-display text-text-1">{titulo}</h2>

      {!hay ? (
        /* Que no los haya publicado también es información, y la persona que
           llega hasta aquí merece saberlo en vez de encontrar un hueco. */
        <p className="text-sm text-text-3 mt-2 leading-relaxed">
          Quien organiza no publicó un documento propio para esta parte.
        </p>
      ) : url ? (
        <p className="text-sm text-text-2 mt-2">
          <a href={url} target="_blank" rel="noreferrer noopener" className="text-primary-light hover:underline break-all">
            {url}
          </a>
        </p>
      ) : (
        /* `whitespace-pre-wrap` porque el organizador lo escribió con sus
           propios saltos de línea y numeración: reformatearlo cambiaría un
           documento legal. */
        <div className="text-sm text-text-2 mt-3 leading-relaxed whitespace-pre-wrap break-words">
          {texto}
        </div>
      )}
    </section>
  );
}

function Marco({ children }) {
  return (
    <div className="min-h-screen bg-bg px-5 py-10">
      <div className="max-w-3xl mx-auto rounded-3xl border border-border-2 bg-surface/60 p-6 sm:p-10">
        {children}
      </div>
    </div>
  );
}
