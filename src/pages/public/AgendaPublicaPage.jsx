import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import { agendaApi } from '../../api/agenda.js';
import { useAuth } from '../../context/AuthContext.jsx';
import GLoader from '../../components/ui/GLoader.jsx';

/* Página pública /explorar/:slug/agenda — agenda completa de solo lectura
   (visible para cualquiera), con itinerario personal opcional (marcar
   favoritos) para quien tenga boleta y haya iniciado sesión. */
export default function AgendaPublicaPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { usuario, loading: authLoading } = useAuth();
  const [evento, setEvento] = useState(undefined);
  const [sessions, setSessions] = useState([]);
  const [favoritos, setFavoritos] = useState(new Set());
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [bloqueado, setBloqueado] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    eventosApi.agendaPublica(slug)
      .then(d => { setEvento({ id: d.evento_id }); setSessions(d.sessions || []); })
      .catch(e => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (!evento?.id || !usuario) return;
    agendaApi.misFavoritos(evento.id)
      .then(d => setFavoritos(new Set(d.favoritos || [])))
      .catch(e => setBloqueado(e.response?.data?.error || null));
  }, [evento, usuario]);

  const dias = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      const k = new Date(s.inicio).toISOString().slice(0, 10);
      (map[k] = map[k] || []).push(s);
    }
    return Object.keys(map).sort().map(k => ({ fecha: k, sesiones: map[k].sort((a, b) => new Date(a.inicio) - new Date(b.inicio)) }));
  }, [sessions]);

  const [diaActivo, setDiaActivo] = useState(0);

  const toggleFavorito = async (sessionId) => {
    if (!usuario) return;
    const yaEs = favoritos.has(sessionId);
    setFavoritos(prev => {
      const next = new Set(prev);
      yaEs ? next.delete(sessionId) : next.add(sessionId);
      return next;
    });
    try {
      if (yaEs) await agendaApi.quitarFavorito(evento.id, sessionId);
      else await agendaApi.marcarFavorito(evento.id, sessionId);
    } catch {
      /* revertir en caso de error */
      setFavoritos(prev => {
        const next = new Set(prev);
        yaEs ? next.add(sessionId) : next.delete(sessionId);
        return next;
      });
    }
  };

  if (evento === undefined && !error) return (
    <section className="px-5 py-20 max-w-2xl mx-auto"><GLoader message="Cargando agenda..." /></section>
  );

  if (error) return (
    <section className="px-5 py-20 max-w-md mx-auto text-center animate-[fadeUp_0.4s_ease_both]">
      <p className="text-sm text-danger mb-4">Evento no encontrado.</p>
      <Link to="/explorar" className="text-sm text-text-2 hover:text-text-1">← Volver a explorar</Link>
    </section>
  );

  if (sessions.length === 0) {
    return (
      <section className="px-5 py-20 max-w-md mx-auto text-center animate-[fadeUp_0.4s_ease_both]">
        <p className="text-sm text-text-3">Este evento todavía no tiene sesiones publicadas en su agenda.</p>
      </section>
    );
  }

  const tracks = [...new Set(sessions.map(s => s.track || 'principal'))];
  const esMultiSala = tracks.length > 1;

  const diaMostrado = dias[diaActivo];
  const sesionesDelDia = soloFavoritos
    ? (diaMostrado?.sesiones || []).filter(s => favoritos.has(s.id))
    : (diaMostrado?.sesiones || []);

  return (
    <section className="px-5 py-10 max-w-4xl mx-auto animate-[fadeUp_0.4s_ease_both]">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-1">Agenda</p>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-text-1">
          {esMultiSala ? 'Programa completo' : 'Agenda del evento'}
        </h1>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        {dias.length > 1 && (
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 flex-wrap">
            {dias.map((d, i) => (
              <button key={d.fecha} onClick={() => setDiaActivo(i)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${diaActivo === i ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
                {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })}
              </button>
            ))}
          </div>
        )}

        {usuario && !bloqueado && (
          <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
            <input type="checkbox" checked={soloFavoritos} onChange={e => setSoloFavoritos(e.target.checked)}
              className="w-4 h-4 rounded accent-primary" />
            Solo mis favoritas
          </label>
        )}
      </div>

      {!usuario && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 mb-6 text-sm text-text-2 flex items-center justify-between gap-3 flex-wrap">
          <span>Inicia sesión para marcar tus charlas favoritas y armar tu itinerario personal.</span>
          <Link to="/login" state={{ from: location.pathname }} className="text-primary-light hover:underline whitespace-nowrap font-medium">Iniciar sesión</Link>
        </div>
      )}
      {usuario && bloqueado && (
        <div className="rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 mb-6 text-sm text-text-2">
          {bloqueado}
        </div>
      )}

      {sesionesDelDia.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-3">{soloFavoritos ? 'No has marcado ninguna sesión de este día como favorita.' : 'Sin sesiones este día.'}</p>
        </div>
      ) : esMultiSala ? (
        <AgendaGridSalas
          sesiones={sesionesDelDia} tracks={tracks} favoritos={favoritos}
          puedeMarcar={usuario && !bloqueado} onToggle={toggleFavorito}
        />
      ) : (
        <AgendaLista
          sesiones={sesionesDelDia} favoritos={favoritos}
          puedeMarcar={usuario && !bloqueado} onToggle={toggleFavorito}
        />
      )}
    </section>
  );
}

function AgendaLista({ sesiones, favoritos, puedeMarcar, onToggle }) {
  return (
    <div className="rounded-3xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">
      {sesiones.map(s => (
        <SesionRow key={s.id} sesion={s} esFavorita={favoritos.has(s.id)} puedeMarcar={puedeMarcar} onToggle={onToggle} />
      ))}
    </div>
  );
}

function AgendaGridSalas({ sesiones, tracks, favoritos, puedeMarcar, onToggle }) {
  const horas = [...new Set(sesiones.map(s => new Date(s.inicio).getHours()))].sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto">
      <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden" style={{ minWidth: `${80 + tracks.length * 220}px` }}>
        <div className="flex border-b border-border bg-surface-2/40">
          <div className="w-20 flex-shrink-0 px-3 py-3 text-xs uppercase tracking-widest text-text-3 font-semibold">Hora</div>
          {tracks.map(t => (
            <div key={t} className="flex-1 min-w-[220px] px-3 py-3 border-l border-border">
              <p className="text-sm font-bold text-text-1 truncate">{t === 'principal' ? 'Principal' : t}</p>
            </div>
          ))}
        </div>
        {horas.map(h => (
          <div key={h} className="flex border-b border-border last:border-b-0">
            <div className="w-20 flex-shrink-0 px-3 py-3 text-right text-xs font-mono tabular-nums text-text-3">
              {String(h).padStart(2, '0')}:00
            </div>
            {tracks.map(t => {
              const items = sesiones.filter(s => (s.track || 'principal') === t && new Date(s.inicio).getHours() === h);
              return (
                <div key={t} className="flex-1 min-w-[220px] border-l border-border px-2 py-2 space-y-1.5">
                  {items.map(s => (
                    <SesionChipPublica key={s.id} sesion={s} esFavorita={favoritos.has(s.id)} puedeMarcar={puedeMarcar} onToggle={onToggle} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function SesionRow({ sesion, esFavorita, puedeMarcar, onToggle }) {
  const hi = new Date(sesion.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const hf = sesion.fin ? new Date(sesion.fin).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : null;
  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <div className="text-text-1 font-display font-bold tabular-nums text-base w-20 flex-shrink-0 leading-tight">
        {hi}
        {hf && <span className="block text-xs text-text-3 font-sans font-normal mt-0.5">— {hf}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-text-1">{sesion.titulo}</h3>
          {sesion.track && sesion.track !== 'principal' && (
            <span className="text-xs uppercase tracking-widest text-primary-light bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">{sesion.track}</span>
          )}
        </div>
        {sesion.descripcion && <p className="text-sm text-text-2 mt-1 leading-relaxed">{sesion.descripcion}</p>}
        <div className="flex items-center gap-3 mt-2 text-sm text-text-3 flex-wrap">
          {sesion.ubicacion && <span>📍 {sesion.ubicacion}</span>}
          {sesion.speaker && (
            <span className="inline-flex items-center gap-2">
              {sesion.speaker.foto_url
                ? <img src={sesion.speaker.foto_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                : <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-[10px] font-bold">{sesion.speaker.nombre.charAt(0)}</span>}
              <span>{sesion.speaker.nombre}{sesion.speaker.empresa ? ` · ${sesion.speaker.empresa}` : ''}</span>
            </span>
          )}
        </div>
      </div>
      {puedeMarcar && (
        <button onClick={() => onToggle(sesion.id)} aria-label="Marcar favorita"
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${esFavorita ? 'text-warning bg-warning/10' : 'text-text-3 hover:text-warning hover:bg-warning/10'}`}>
          <svg className="w-5 h-5" fill={esFavorita ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SesionChipPublica({ sesion, esFavorita, puedeMarcar, onToggle }) {
  return (
    <div className={`rounded-xl border px-2.5 py-2 relative ${esFavorita ? 'border-warning/40 bg-warning/10' : 'border-primary/25 bg-primary/10'}`}>
      <p className="text-[11px] font-mono tabular-nums text-primary-light pr-6">
        {new Date(sesion.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-sm font-semibold text-text-1 truncate pr-6">{sesion.titulo}</p>
      {sesion.speaker?.nombre && <p className="text-xs text-text-3 truncate">{sesion.speaker.nombre}</p>}
      {puedeMarcar && (
        <button onClick={() => onToggle(sesion.id)} aria-label="Marcar favorita"
          className={`absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center ${esFavorita ? 'text-warning' : 'text-text-3 hover:text-warning'}`}>
          <svg className="w-3.5 h-3.5" fill={esFavorita ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      )}
    </div>
  );
}
