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
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [sub, setSub] = useState('explorar');

  useEffect(() => {
    setLoading(true);
    eventosApi.publicoBySlug(slug)
      .then(d => setEvento(d.evento))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!evento || !usuario) { setCheckingAccess(false); return; }
    setCheckingAccess(true);
    networkingApi.expositores(evento.id)
      .then(() => setBloqueado(null))
      .catch(e => setBloqueado(e.response?.data?.error || 'No tienes acceso a la Rueda de Negocios de este evento.'))
      .finally(() => setCheckingAccess(false));
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
      <section className="px-5 py-16 max-w-lg mx-auto animate-[fadeUp_0.4s_ease_both]">
        <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 px-6 py-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 mb-5">
            <svg className="w-7 h-7 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-xs uppercase tracking-widest text-primary-light font-semibold mb-2">Rueda de Negocios</p>
          <h1 className="text-2xl font-bold font-display text-text-1 mb-3">{evento.titulo}</h1>
          <p className="text-sm text-text-2 mb-7 leading-relaxed max-w-sm mx-auto">
            Necesitas iniciar sesión con la cuenta de tu boleta para explorar expositores y reservar citas.
          </p>
          <Link to="/login" state={{ from: location.pathname }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
            Iniciar sesión
          </Link>
        </div>
      </section>
    );
  }

  if (checkingAccess) return (
    <section className="px-5 py-20 max-w-2xl mx-auto"><GLoader message="Verificando acceso..." /></section>
  );

  if (bloqueado) {
    return (
      <section className="px-5 py-16 max-w-lg mx-auto animate-[fadeUp_0.4s_ease_both]">
        <div className="rounded-3xl border-2 border-warning/40 bg-warning/10 px-6 py-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-warning/20 border border-warning/40 mb-5">
            <svg className="w-7 h-7 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-8.25 3.75h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <p className="text-xs uppercase tracking-widest text-warning font-semibold mb-2">Acceso restringido</p>
          <h1 className="text-2xl font-bold font-display text-text-1 mb-3">{evento.titulo}</h1>
          <p className="text-base text-text-1 font-medium mb-7 leading-relaxed max-w-sm mx-auto">
            {bloqueado}
          </p>
          <Link to={`/explorar/${slug}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
            Ver el evento y conseguir mi boleta
          </Link>
        </div>
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
