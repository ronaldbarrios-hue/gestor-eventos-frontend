import { Link, useSearchParams } from 'react-router-dom';

/* Barra de contexto: cuando llegas a una página GLOBAL (Gestbot, Chats…) desde
   un evento, el shell cambia al de inicio y se pierde el hilo. Esta barra deja
   claro de dónde vienes y da el camino de vuelta. Se muestra solo si la URL
   trae `?evento=<id>` (y opcional `?nom=<nombre>`). */
export default function VolverAlEvento() {
  const [params] = useSearchParams();
  const eventoId = params.get('evento');
  if (!eventoId) return null;
  const nombre = params.get('nom');
  const q = params.get('s') ? `?s=${params.get('s')}` : '';

  return (
    <Link
      to={`/eventos/${eventoId}${q}`}
      className="flex items-center gap-2 mb-4 px-3.5 py-2.5 rounded-2xl border border-accent/30 bg-accent/5 text-sm text-text-2 hover:text-text-1 hover:bg-accent/10 transition-colors w-fit"
    >
      <svg className="w-4 h-4 flex-shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
      </svg>
      Volver al evento{nombre ? <> «<b className="font-semibold text-text-1">{nombre}</b>»</> : null}
    </Link>
  );
}
