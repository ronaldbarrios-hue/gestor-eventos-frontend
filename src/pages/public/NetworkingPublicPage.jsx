import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import { networkingApi } from '../../api/networking.js';
import { useAuth } from '../../context/AuthContext.jsx';
import GLoader from '../../components/ui/GLoader.jsx';
import { ExplorarView, MisCitasView } from '../events/tabs/NetworkingTab.jsx';

/* Página pública /explorar/:slug/networking — acceso a la Rueda de Negocios
   desde afuera del panel interno. Requiere: 1) sesión iniciada, 2) tener
   una boleta para este evento (o ser el organizador). */
export default function NetworkingPublicPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { usuario, loading: authLoading } = useAuth();
  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bloqueado, setBloqueado] = useState(null);
  const [sub, setSub] = useState('explorar');

  useEffect(() => {
    setLoading(true);
    eventosApi.publicoBySlug(slug)
      .then(d => setEvento(d.evento))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!evento || !usuario) return;
    networkingApi.expositores(evento.id).catch(e => {
      const msg = e.response?.data?.error;
      if (msg) setBloqueado(msg);
    });
  }, [evento, usuario]);

  if (loading || authLoading) return (
    <section className="px-5 py-20 max-w-2xl mx-auto"><GLoader message="Cargando..." /></section>
  );

  if (error || !evento) return (
    <section className="px-5 py-20 max-w-md mx-auto text-center animate-[fadeUp_0.4s_ease_both]">
      <p className="text-sm text-danger mb-4">Evento no encontrado.</p>
      <Link to="/explorar" className="text-sm text-text-2 hover:text-text-1">← Volver a explorar</Link>
    </section>
  );

  if (!usuario) {
    return (
      <section className="px-5 py-20 max-w-md mx-auto text-center animate-[fadeUp_0.4s_ease_both]">
        <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-3">Rueda de Negocios</p>
        <h1 className="text-2xl font-bold font-display text-text-1 mb-3">{evento.titulo}</h1>
        <p className="text-sm text-text-2 mb-6 leading-relaxed">
          Inicia sesión con la cuenta que usaste para tu boleta para reservar citas de networking.
        </p>
        <Link to="/login" state={{ from: location.pathname }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
          Iniciar sesión
        </Link>
      </section>
    );
  }

  if (bloqueado) {
    return (
      <section className="px-5 py-20 max-w-md mx-auto text-center animate-[fadeUp_0.4s_ease_both]">
        <p className="text-xs uppercase tracking-widest text-warning font-semibold mb-3">Rueda de Negocios</p>
        <h1 className="text-2xl font-bold font-display text-text-1 mb-3">{evento.titulo}</h1>
        <p className="text-sm text-text-2 mb-6 leading-relaxed">{bloqueado}</p>
        <Link to={`/explorar/${slug}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
          Ver el evento y conseguir mi boleta
        </Link>
      </section>
    );
  }

  return (
    <section className="px-5 py-10 max-w-4xl mx-auto animate-[fadeUp_0.4s_ease_both]">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-1">{evento.titulo}</p>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-text-1">Rueda de Negocios</h1>
      </div>

      <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 w-fit mb-6">
        <button onClick={() => setSub('explorar')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'explorar' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
          Explorar
        </button>
        <button onClick={() => setSub('mis-citas')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'mis-citas' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
          Mis citas
        </button>
      </div>

      {sub === 'explorar'  && <ExplorarView evento={evento} />}
      {sub === 'mis-citas' && <MisCitasView evento={evento} />}
    </section>
  );
}
