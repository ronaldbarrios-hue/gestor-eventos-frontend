import { useEffect, useState } from 'react';
import Icono from '../../components/ui/Iconos.jsx';
import { useParams, Link } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import GLoader from '../../components/ui/GLoader.jsx';
import { aplanar, ramaCompleta, rutaDe } from '../../lib/torneoCategorias.js';

/* Página pública /explorar/:slug/torneos — el resumen de TODOS los torneos del
   evento: quién ganó y quién jugó.

   Es la hermana corta de TorneoPublicoPage. Esa navega un bracket entero y
   pide pantalla; ésta responde de un vistazo la única pregunta que hace quien
   llega desde fuera —"¿quién ganó?"— y por eso es la que se incrusta en la web
   del organizador (/embed/:slug/torneos). */

const ETIQUETA_FORMATO = {
  eliminacion: 'Eliminación',
  liga: 'Liga',
  grupos: 'Grupos + Eliminación',
};

export default function TorneosResumenPage() {
  const { slug } = useParams();
  const [torneos, setTorneos] = useState(undefined); // undefined = cargando
  const [categorias, setCategorias] = useState([]);
  const [ramaSel, setRamaSel] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    eventosApi.torneosResumen(slug)
      .then(d => {
        if (!vivo) return;
        setTorneos(d.torneos || []);
        setCategorias(d.categorias || []);
      })
      .catch(e => { if (vivo) setError(e.response?.data?.error || e.message); });
    return () => { vivo = false; };
  }, [slug]);

  if (error) return (
    <section className="px-5 py-20 max-w-md mx-auto text-center">
      <p className="text-sm text-danger mb-4">Evento no encontrado.</p>
      <Link to="/explorar" className="text-sm text-text-2 hover:text-text-1">← Volver a explorar</Link>
    </section>
  );

  if (torneos === undefined) return (
    <section className="px-5 py-20 max-w-2xl mx-auto"><GLoader message="Cargando torneos…" /></section>
  );

  if (torneos.length === 0) return (
    <section className="px-5 py-20 max-w-md mx-auto text-center">
      <p className="text-sm text-text-3">Este evento todavía no tiene torneos.</p>
    </section>
  );

  /* #48 · Navegar de lo general a lo concreto. Elegir "deportes" incluye
     todo lo que cuelga de él; si no, el árbol sería sólo decoración. */
  const dentro = ramaCompleta(categorias, ramaSel);
  const visibles = ramaSel
    ? torneos.filter(t => t.categoria_id && dentro.has(String(t.categoria_id)))
    : torneos;

  return (
    <section className="px-5 py-10 max-w-4xl mx-auto space-y-4 animate-[fadeUp_0.4s_ease_both]">
      {categorias.length > 0 && (
        <nav className="flex items-center gap-1.5 flex-wrap pb-2" aria-label="Categorías de torneos">
          <button onClick={() => setRamaSel(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
              ${ramaSel === null ? 'border-primary bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
            Todos
          </button>
          {aplanar(categorias).map(c => {
            const cuantos = torneos.filter(t => t.categoria_id && ramaCompleta(categorias, c.id).has(String(t.categoria_id))).length;
            /* Las ramas sin ningún torneo no se enseñan al público: un filtro
               que sólo puede dar cero no es una opción, es un callejón. */
            if (cuantos === 0) return null;
            return (
              <button key={c.id} onClick={() => setRamaSel(ramaSel === c.id ? null : c.id)}
                style={{ marginLeft: c.profundidad ? c.profundidad * 8 : 0 }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                  ${ramaSel === c.id ? 'border-primary bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
                {c.profundidad > 0 && <span className="opacity-50 mr-1">›</span>}
                {c.nombre} <span className="opacity-70">{cuantos}</span>
              </button>
            );
          })}
        </nav>
      )}

      {visibles.length === 0 ? (
        <p className="text-sm text-text-3 py-10 text-center">No hay torneos en esta categoría.</p>
      ) : (
        visibles.map(t => (
          <TarjetaTorneo key={t.id} torneo={t} slug={slug} ruta={rutaDe(categorias, t.categoria_id)} />
        ))
      )}
    </section>
  );
}

/* Exportado aparte del `default` para que el iframe lo monte sin la cabecera
   ni el enlace de vuelta: dentro de la web de otro, "volver a explorar" saca
   al visitante del sitio que estaba mirando. */
export function TarjetaTorneo({ torneo, slug, ruta = [] }) {
  const { campeon, equipos = [], estado } = torneo;
  const terminado = torneo.partidos_total > 0 && torneo.partidos_jugados === torneo.partidos_total;
  const enJuego = torneo.partidos_jugados > 0 && !terminado;

  return (
    <article className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {/* De dónde cuelga. Sin esto, un torneo en un nivel hondo llega con
              una palabra suelta que no dice dónde estás. */}
          {ruta.length > 0 && (
            <p className="text-[11px] text-text-3 mb-0.5">{ruta.join(' › ')}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold font-display tracking-tight text-text-1">{torneo.nombre}</h2>
            {torneo.disciplina && (
              <span className="text-[10px] uppercase tracking-wide bg-surface-3 text-text-2 px-2 py-0.5 rounded">
                {torneo.disciplina}
              </span>
            )}
            <span className="badge badge-blue text-[10px]">
              {ETIQUETA_FORMATO[torneo.formato] || torneo.formato}
            </span>
          </div>
          <p className="text-[11px] text-text-3 mt-1">
            {equipos.length} {equipos.length === 1 ? 'participante' : 'participantes'}
            {torneo.partidos_total > 0 && ` · ${torneo.partidos_jugados} de ${torneo.partidos_total} partidos jugados`}
          </p>
        </div>
        {slug && (
          <Link to={`/explorar/${slug}/torneo`} className="btn-ghost btn-sm flex-shrink-0">
            Ver el cuadro →
          </Link>
        )}
      </header>

      {/* El campeón sólo aparece cuando ya no queda nada por jugar: el backend
          devuelve null mientras el torneo esté vivo, para no coronar a nadie
          antes de tiempo. */}
      {campeon ? (
        <div className="px-5 py-5 flex items-center gap-4 bg-success/5 border-b border-border">
          <Icono nombre="trofeo" className="w-8 h-8 text-success flex-shrink-0" />
          <div className="flex items-center gap-3 min-w-0">
            <Escudo equipo={campeon} size="lg" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Campeón</p>
              <p className="text-base font-bold text-text-1 truncate">{campeon.nombre}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs text-text-3">
            {enJuego ? 'Torneo en juego — todavía no hay campeón.'
              : estado === 'cancelado' ? 'Torneo cancelado.'
              : 'El torneo aún no ha empezado.'}
          </p>
        </div>
      )}

      <div className="px-5 py-4">
        <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-3">Participantes</p>
        {equipos.length === 0 ? (
          <p className="text-xs text-text-3">Todavía no hay equipos inscritos.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {equipos.map(eq => {
              const esCampeon = campeon && eq.id === campeon.id;
              return (
                <li key={eq.id}
                  className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-sm
                              ${esCampeon ? 'border-success/50 bg-success/10 text-text-1 font-semibold'
                                          : 'border-border bg-surface/60 text-text-2'}`}>
                  <Escudo equipo={eq} />
                  <span className="truncate max-w-[180px]">{eq.nombre}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}

function Escudo({ equipo, size = 'sm' }) {
  const cls = size === 'lg' ? 'w-11 h-11 text-base rounded-xl' : 'w-6 h-6 text-[10px] rounded-md';
  return (
    <div className={`${cls} overflow-hidden bg-surface-2 flex items-center justify-center font-semibold text-text-2 flex-shrink-0`}>
      {equipo?.foto_url
        ? <img src={equipo.foto_url} alt="" className="w-full h-full object-cover" />
        : (equipo?.nombre?.[0]?.toUpperCase() || '?')}
    </div>
  );
}
