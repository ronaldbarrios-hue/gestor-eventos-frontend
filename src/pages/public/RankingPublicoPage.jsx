import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import GLoader from '../../components/ui/GLoader.jsx';

/* Página pública /explorar/:slug/ranking — clasificación de expositores por
   puntos otorgados en sus stands.

   SÓLO expositores. El ranking de asistentes existe en el panel y ahí se
   queda: publicarlo diría quién fue al evento y cuánto se movió por dentro,
   que es dato de la persona y no información del evento. Aquí las filas son
   empresas, que están en el evento precisamente para que se las vea. */

const MEDALLA = ['🥇', '🥈', '🥉'];

export default function RankingPublicoPage() {
  const { slug } = useParams();
  const [ranking, setRanking] = useState(undefined); // undefined = cargando
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    eventosApi.rankingPublico(slug)
      .then(d => { if (vivo) setRanking(d.ranking || []); })
      .catch(e => { if (vivo) setError(e.response?.data?.error || e.message); });
    return () => { vivo = false; };
  }, [slug]);

  if (error) return (
    <section className="px-5 py-20 max-w-md mx-auto text-center">
      <p className="text-sm text-danger mb-4">Evento no encontrado.</p>
      <Link to="/explorar" className="text-sm text-text-2 hover:text-text-1">← Volver a explorar</Link>
    </section>
  );

  if (ranking === undefined) return (
    <section className="px-5 py-20 max-w-2xl mx-auto"><GLoader message="Cargando ranking…" /></section>
  );

  return (
    <section className="px-5 py-10 max-w-3xl mx-auto animate-[fadeUp_0.4s_ease_both]">
      <TablaRanking ranking={ranking} />
    </section>
  );
}

/* Exportado aparte para que el iframe lo monte sin el ancho ni el padding de
   página: dentro de la web de otro manda el hueco que le hayan dado. */
export function TablaRanking({ ranking, titulo = 'Ranking de expositores' }) {
  if (!ranking?.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm text-text-3">
          Todavía no se han dado puntos en los stands. En cuanto los expositores
          empiecen a escanear escarapelas, la clasificación aparece aquí.
        </p>
      </div>
    );
  }

  const lider = ranking[0].puntos || 1;

  return (
    <div className="space-y-4">
      {titulo && (
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-text-1">{titulo}</h2>
          <p className="text-sm text-text-2 mt-1">
            Por puntos entregados a los asistentes desde cada stand.
          </p>
        </div>
      )}

      <ol className="rounded-3xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">
        {ranking.map((x, i) => (
          <li key={x.expositor_id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
            <span className={`w-8 flex-shrink-0 text-center tabular-nums ${i < 3 ? 'text-xl' : 'text-sm text-text-3 font-semibold'}`}>
              {MEDALLA[i] || `#${i + 1}`}
            </span>

            <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-2 flex items-center justify-center text-sm font-bold text-text-3 flex-shrink-0">
              {x.logo_url
                ? <img src={x.logo_url} alt="" className="w-full h-full object-cover" />
                : (x.nombre || '?')[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-1 truncate">{x.nombre}</p>
              <p className="text-[11px] text-text-3">
                {x.stand ? `Stand ${x.stand} · ` : ''}
                {x.interacciones} {x.interacciones === 1 ? 'interacción' : 'interacciones'}
              </p>
              {/* La barra da la distancia real entre puestos, que un número
                  suelto no cuenta: 900 y 880 no es lo mismo que 900 y 40. */}
              <div className="h-1 mt-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full rounded-full bg-primary/60"
                     style={{ width: `${Math.max(4, Math.round((x.puntos / lider) * 100))}%` }} />
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-base font-bold tabular-nums text-text-1">{x.puntos}</p>
              <p className="text-[10px] uppercase tracking-wide text-text-3">puntos</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
