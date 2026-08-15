import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import client from '../../api/client.js';
import { eventosApi } from '../../api/eventos.js';
import { agendaApi } from '../../api/agenda.js';
import { useAuth } from '../../context/AuthContext.jsx';
import GLoader from '../../components/ui/GLoader.jsx';
import { TIPOS_ESPACIO, TIPO_DEFECTO, tipoEspacio, tipoEstilo } from '../../lib/espacio.js';
import { ymdLocal } from '../../lib/fechaLocal.js';
import Icono from '../../components/ui/Iconos.jsx';
import InscripcionSesionModal from './InscripcionSesionModal.jsx';
import BarraEvento from '../../components/public/BarraEvento.jsx';

/* Página pública /explorar/:slug/agenda — "Espacio del evento": el calendario
   público de todo lo que pasa dentro (charlas, stands, competencias, shows…),
   de solo lectura, con itinerario personal opcional (favoritos) para quien
   tenga boleta e inicie sesión, y enlace a las llaves de las competencias. */
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
  /* Inscripción a sub-eventos: qué preguntas tiene cada uno y cuál se está
     abriendo ahora. `inscritas` recuerda las de esta visita para que el botón
     no siga diciendo "Apuntarme" después de haberse apuntado — el servidor lo
     sabe, pero la agenda pública no vuelve a preguntárselo. */
  const [preguntas, setPreguntas] = useState({});
  const [inscribiendo, setInscribiendo] = useState(null);
  const [inscritas, setInscritas] = useState(new Set());

  /* Quién es el que mira, si se puede saber sin preguntárselo.

     Apuntarse a un torneo pedía escribir a mano el código de ocho caracteres
     de la boleta. Quien acaba de comprar lo tiene en un correo, en otra
     pestaña, o en ningún sitio: ahí es donde se caía el registro a los
     sub-eventos, no en el formulario.

     Dos vías, y ninguna obliga a escribir nada:
       · `?boleta=CODIGO`, que es lo que arrastra el enlace desde la boleta.
         Se comprueba contra el servidor antes de dar por buena a la persona —
         si no, bastaría con inventar un código en la barra de direcciones para
         que la pantalla dijera el nombre de otro.
       · La sesión iniciada, buscando entre las boletas de quien entró. */
  const [params] = useSearchParams();
  const codigoUrl = (params.get('boleta') || '').trim().toUpperCase();
  const [boleta, setBoleta] = useState(null);

  useEffect(() => {
    let vivo = true;
    if (codigoUrl) {
      eventosApi.ticketByCode(codigoUrl)
        .then(d => {
          const t = d?.ticket;
          if (vivo && t?.evento?.slug === slug) setBoleta({ codigo: t.codigo, nombre: t.guest_nombre });
        })
        .catch(() => { /* código inventado o de otro evento: se pide a mano */ });
      return () => { vivo = false; };
    }
    if (!usuario) return;
    client.get('/me/boletas')
      .then(r => {
        const suya = (r.data?.boletas || []).find(b => b.evento?.slug === slug);
        if (vivo && suya) setBoleta({ codigo: suya.codigo, nombre: usuario.nombre || suya.guest_nombre });
      })
      .catch(() => { /* sin boleta propia: el modal la pedirá */ });
    return () => { vivo = false; };
  }, [codigoUrl, usuario, slug]);

  useEffect(() => {
    eventosApi.agendaPublica(slug)
      .then(d => {
        setEvento({ id: d.evento_id });
        setSessions(d.sessions || []);
        setPreguntas(d.preguntas || {});
      })
      .catch(e => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (!evento?.id || !usuario) return;
    agendaApi.misFavoritos(evento.id)
      .then(d => setFavoritos(new Set(d.favoritos || [])))
      .catch(e => setBloqueado(e.response?.data?.error || null));
  }, [evento, usuario]);

  /* El día se calcula en hora LOCAL, no en UTC.

     Con `toISOString().slice(0,10)` una sesión de las 8 de la noche del 15 en
     Bogotá (UTC-5) da la clave 2026-09-16 y aparecía en la pestaña del día
     siguiente. O sea que en un evento con actividades de tarde-noche —shows,
     torneos, ceremonias de cierre— todo lo posterior a las 7 p. m. se movía un
     día, y el asistente llegaba cuando ya había pasado.

     El panel ya lo hacía bien (`ymd` en AgendaTab). El único sitio con el
     cálculo en UTC era este, que es precisamente el que ve el público.

     El cálculo vive ahora en `lib/fechaLocal.js`: era una línea copiada en
     tres sitios, y por ser copia arreglar uno no arreglaba los demás — el
     modal de programar partidos seguía con la versión mala. */
  const dias = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      const k = ymdLocal(s.inicio);
      (map[k] = map[k] || []).push(s);
    }
    return Object.keys(map).sort().map(k => ({ fecha: k, sesiones: map[k].sort((a, b) => new Date(a.inicio) - new Date(b.inicio)) }));
  }, [sessions]);

  const [diaActivo, setDiaActivo] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroExpo, setFiltroExpo] = useState('');

  const tiposPresentes = useMemo(() => {
    const set = new Set(sessions.map(s => s.tipo || TIPO_DEFECTO));
    return TIPOS_ESPACIO.filter(t => set.has(t.id));
  }, [sessions]);

  /* Expositores que tienen franjas en el cronograma. */
  const expositoresPresentes = useMemo(() => {
    const map = new Map();
    for (const s of sessions) if (s.expositor?.id) map.set(s.expositor.id, s.expositor);
    return [...map.values()];
  }, [sessions]);

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
    /* La barra también aquí: una pantalla vacía sin salida es donde más se
       nota que no hay por dónde volver. */
    return (
      <section className="px-5 py-10 max-w-4xl mx-auto animate-[fadeUp_0.4s_ease_both]">
        <BarraEvento actual="agenda" />
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-3">Este evento todavía no tiene sesiones publicadas en su agenda.</p>
        </div>
      </section>
    );
  }

  const tracks = [...new Set(sessions.map(s => s.track || 'principal'))];
  const esMultiSala = tracks.length > 1;

  const diaMostrado = dias[diaActivo];
  const sesionesDelDia = (diaMostrado?.sesiones || [])
    .filter(s => !soloFavoritos || favoritos.has(s.id))
    .filter(s => !filtroTipo || (s.tipo || TIPO_DEFECTO) === filtroTipo)
    .filter(s => !filtroExpo || s.expositor?.id === filtroExpo);

  return (
    <section className="px-5 py-10 max-w-4xl mx-auto animate-[fadeUp_0.4s_ease_both]">
      <BarraEvento actual="agenda" />
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-1">Espacio del evento</p>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-text-1">
          {esMultiSala ? 'Programa completo' : 'Todo lo que pasa dentro'}
        </h1>
      </div>

      {tiposPresentes.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-5">
          <button onClick={() => setFiltroTipo('')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
              ${filtroTipo === '' ? 'border-primary bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
            Todo
          </button>
          {tiposPresentes.map(t => (
            <button key={t.id} onClick={() => setFiltroTipo(filtroTipo === t.id ? '' : t.id)}
              style={filtroTipo === t.id ? tipoEstilo(t.id) : undefined}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1
                ${filtroTipo === t.id ? '' : 'border-border text-text-3 hover:text-text-1'}`}>
              <Icono nombre={t.icono} className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
      )}

      {expositoresPresentes.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-5">
          <span className="text-[11px] text-text-3 mr-1">Expositores:</span>
          <button onClick={() => setFiltroExpo('')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
              ${filtroExpo === '' ? 'border-primary bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
            Todos
          </button>
          {expositoresPresentes.map(x => (
            <button key={x.id} onClick={() => setFiltroExpo(filtroExpo === x.id ? '' : x.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5
                ${filtroExpo === x.id ? 'border-primary bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
              {x.logo_url && <img src={x.logo_url} alt="" className="w-4 h-4 rounded object-cover" />}
              <Icono nombre="empresa" className="w-3.5 h-3.5" />{x.nombre}
            </button>
          ))}
        </div>
      )}

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
          puedeMarcar={usuario && !bloqueado} onToggle={toggleFavorito} slug={slug}
          inscritas={inscritas} onInscribir={setInscribiendo}
        />
      ) : (
        <AgendaLista
          sesiones={sesionesDelDia} favoritos={favoritos}
          puedeMarcar={usuario && !bloqueado} onToggle={toggleFavorito} slug={slug}
          inscritas={inscritas} onInscribir={setInscribiendo}
        />
      )}

      {inscribiendo && (
        <InscripcionSesionModal
          slug={slug}
          sesion={inscribiendo}
          preguntas={preguntas[inscribiendo.id] || []}
          boleta={boleta}
          onClose={() => setInscribiendo(null)}
          onInscrito={(id) => {
            setInscritas(prev => new Set(prev).add(id));
            /* El contador local sube solo: recargar la agenda entera por una
               inscripción sería tirar la lista y el día que se estaba mirando. */
            setSessions(prev => prev.map(s => s.id === id
              ? { ...s, inscritos: (s.inscritos || 0) + 1,
                  libres: s.libres == null ? null : Math.max(0, s.libres - 1),
                  lleno: s.cupo != null && (s.inscritos || 0) + 1 >= s.cupo }
              : s));
          }}
        />
      )}
    </section>
  );
}

function AgendaLista({ sesiones, favoritos, puedeMarcar, onToggle, slug, inscritas, onInscribir }) {
  return (
    <div className="rounded-3xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">
      {sesiones.map(s => (
        <SesionRow key={s.id} sesion={s} esFavorita={favoritos.has(s.id)} puedeMarcar={puedeMarcar} onToggle={onToggle} slug={slug}
          yaInscrito={inscritas?.has(s.id)} onInscribir={onInscribir} />
      ))}
    </div>
  );
}

function AgendaGridSalas({ sesiones, tracks, favoritos, puedeMarcar, onToggle, slug, inscritas, onInscribir }) {
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
                    <SesionChipPublica key={s.id} sesion={s} esFavorita={favoritos.has(s.id)} puedeMarcar={puedeMarcar} onToggle={onToggle} slug={slug}
                      yaInscrito={inscritas?.has(s.id)} onInscribir={onInscribir} />
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

/* Botón de apuntarse. Sólo aparece en los sub-eventos que lo piden: en los
   demás la entrada al evento basta, y un botón de inscripción donde no hace
   falta hace dudar de si la boleta sirve. */
function BotonInscribir({ sesion, yaInscrito, onInscribir, compacto }) {
  if (!sesion.requiere_inscripcion) return null;

  const clase = compacto
    ? 'text-[11px] font-medium px-2 py-0.5 rounded-full border'
    : 'btn-sm rounded-full';

  if (yaInscrito) {
    return (
      <span className={`${clase} border-success/40 bg-success/10 text-success ${compacto ? '' : 'px-3 py-1.5 border'}`}>
        ✓ Apuntado
      </span>
    );
  }
  if (sesion.lleno) {
    return (
      <span className={`${clase} border-border text-text-3 ${compacto ? '' : 'px-3 py-1.5 border'}`}>
        Sin lugares
      </span>
    );
  }
  return (
    <button onClick={() => onInscribir?.(sesion)}
      className={compacto
        ? 'text-[11px] font-medium px-2 py-0.5 rounded-full border border-accent/50 bg-accent/10 text-text-1 hover:bg-accent/20 transition-colors'
        : 'btn-primary btn-sm rounded-full'}>
      Apuntarme
      {sesion.libres != null && sesion.libres <= 5 && ` · quedan ${sesion.libres}`}
    </button>
  );
}

function SesionRow({ sesion, esFavorita, puedeMarcar, onToggle, slug, yaInscrito, onInscribir }) {
  const hi = new Date(sesion.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const hf = sesion.fin ? new Date(sesion.fin).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : null;
  const tip = tipoEspacio(sesion.tipo);
  return (
    <div className="flex items-start gap-4 px-5 py-4" style={{ boxShadow: `inset 3px 0 0 ${tip.color}` }}>
      <div className="text-text-1 font-display font-bold tabular-nums text-base w-20 flex-shrink-0 leading-tight">
        {hi}
        {hf && <span className="block text-xs text-text-3 font-sans font-normal mt-0.5">— {hf}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1" style={tipoEstilo(sesion.tipo)}>
            <Icono nombre={tip.icono} className="w-3.5 h-3.5" />{tip.label}
          </span>
          <h3 className="text-base font-semibold text-text-1">{sesion.titulo}</h3>
          {sesion.track && sesion.track !== 'principal' && (
            <span className="text-xs uppercase tracking-widest text-primary-light bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">{sesion.track}</span>
          )}
        </div>
        {sesion.descripcion && <p className="text-sm text-text-2 mt-1 leading-relaxed">{sesion.descripcion}</p>}
        <div className="flex items-center gap-3 mt-2 text-sm text-text-3 flex-wrap">
          {sesion.ubicacion && <span className="inline-flex items-center gap-1"><Icono nombre="pin" className="w-3.5 h-3.5" />{sesion.ubicacion}</span>}
          {sesion.speaker && (
            <span className="inline-flex items-center gap-2">
              {sesion.speaker.foto_url
                ? <img src={sesion.speaker.foto_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                : <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-[10px] font-bold">{sesion.speaker.nombre.charAt(0)}</span>}
              <span>{sesion.speaker.nombre}{sesion.speaker.empresa ? ` · ${sesion.speaker.empresa}` : ''}</span>
            </span>
          )}
          {sesion.torneo_id && slug && (
            <Link to={`/explorar/${slug}/torneo`} className="inline-flex items-center gap-1 text-primary-light hover:underline font-medium">
              <Icono nombre="trofeo" className="w-3.5 h-3.5" />Ver llaves
            </Link>
          )}
        </div>
        {sesion.requiere_inscripcion && (
          <div className="mt-3">
            <BotonInscribir sesion={sesion} yaInscrito={yaInscrito} onInscribir={onInscribir} />
          </div>
        )}
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

function SesionChipPublica({ sesion, esFavorita, puedeMarcar, onToggle, slug, yaInscrito, onInscribir }) {
  const tip = tipoEspacio(sesion.tipo);
  return (
    <div className="rounded-xl border px-2.5 py-2 relative"
      style={esFavorita ? { borderColor: 'rgba(234,179,8,0.4)', background: 'rgba(234,179,8,0.1)' } : tipoEstilo(sesion.tipo)}>
      <p className="text-[11px] font-mono tabular-nums opacity-80 pr-6">
        <Icono nombre={tip.icono} className="w-3 h-3 inline-block align-[-2px]" /> {new Date(sesion.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-sm font-semibold text-text-1 truncate pr-6">{sesion.titulo}</p>
      {sesion.speaker?.nombre && <p className="text-xs text-text-3 truncate">{sesion.speaker.nombre}</p>}
      {sesion.torneo_id && slug && (
        <Link to={`/explorar/${slug}/torneo`} className="text-[11px] text-primary-light hover:underline font-medium"><Icono nombre="trofeo" className="w-3.5 h-3.5" />Ver llaves</Link>
      )}
      {sesion.requiere_inscripcion && (
        <div className="mt-1.5">
          <BotonInscribir sesion={sesion} yaInscrito={yaInscrito} onInscribir={onInscribir} compacto />
        </div>
      )}
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
