/* Tab Ranking — clasificación del equipo y de los expositores por puntos. */

import { useEffect, useState, useCallback } from 'react';
import { loyaltyApi } from '../../../api/loyalty.js';
import { interaccionesApi } from '../../../api/interacciones.js';
import { useToast } from '../../../context/ToastContext.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import Icono from '../../../components/ui/Icono.jsx';

/* Las tres primeras posiciones llevan medalla; el resto, su número. El color
   distingue oro, plata y bronce sin necesitar tres dibujos distintos. */
const COLOR_MEDALLA = ['text-warning', 'text-text-2', 'text-accent'];
function Medalla({ i, className = 'w-5 h-5' }) {
  if (i > 2) return <span className="text-sm font-mono tabular-nums text-text-3">{`#${i + 1}`}</span>;
  return <Icono name="medalla" titulo={`Puesto ${i + 1}`} className={`${className} ${COLOR_MEDALLA[i]}`} />;
}

export default function RankingTab({ evento }) {
  const { error: toastErr } = useToast();
  const [modo, setModo] = useState('equipo');    // equipo | expositores
  const [equipo, setEquipo] = useState(null);
  const [expositores, setExpositores] = useState(null);

  useEffect(() => {
    loyaltyApi.rankingEvento(evento.id).then(d => setEquipo(d.ranking || [])).catch(e => { setEquipo([]); toastErr(e.message); });
  }, [evento.id, toastErr]);

  const cargarExpositores = useCallback(() => {
    if (expositores !== null) return;
    interaccionesApi.rankingExpositores(evento.id).then(d => setExpositores(d.ranking || [])).catch(() => setExpositores([]));
  }, [evento.id, expositores]);

  useEffect(() => { if (modo === 'expositores') cargarExpositores(); }, [modo, cargarExpositores]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Ranking</h2>
          <p className="text-sm text-text-2 mt-1">
            {modo === 'equipo'
              ? 'Puntos que tu equipo acumula en este evento (tareas, check-ins, gestión).'
              : 'Expositores por puntos otorgados e interacciones con asistentes en sus stands.'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1">
          {[['equipo', 'Equipo'], ['expositores', 'Expositores']].map(([k, l]) => (
            <button key={k} onClick={() => setModo(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${modo === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {modo === 'equipo' ? <ListaEquipo ranking={equipo} /> : <ListaExpositores ranking={expositores} />}
    </div>
  );
}

function ListaEquipo({ ranking }) {
  if (ranking === null) return <GLoader message="Cargando ranking…" />;
  if (ranking.length === 0) return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-14 text-center">
      <p className="text-text-2">Todavía no hay puntos. A medida que el equipo complete tareas y haga check-ins, aparecerán aquí.</p>
    </div>
  );
  return (
    <div className="rounded-2xl border border-border bg-surface/40 divide-y divide-border">
      {ranking.map((r, i) => (
        <div key={r.user_id} className={`flex items-center gap-3 px-4 py-3 ${r.es_yo ? 'bg-primary/10' : ''}`}>
          <span className="w-9 flex items-center justify-center"><Medalla i={i} /></span>
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-primary flex items-center justify-center flex-shrink-0">
            {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-sm font-semibold">{(r.nombre || 'U').charAt(0).toUpperCase()}</span>}
          </div>
          <span className="flex-1 min-w-0 truncate text-sm text-text-1">{r.nombre}{r.es_yo && <span className="text-xs text-primary-light ml-1.5">(vos)</span>}</span>
          <span className="text-lg font-bold font-display text-primary-light tabular-nums">{Number(r.puntos || 0).toLocaleString('es-CO')}</span>
        </div>
      ))}
    </div>
  );
}

function ListaExpositores({ ranking }) {
  if (ranking === null) return <GLoader message="Cargando expositores…" />;
  if (ranking.length === 0) return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-14 text-center">
      <p className="text-text-2">Aún no hay puntos otorgados por expositores. Aparecerán a medida que escaneen escarapelas en sus stands.</p>
    </div>
  );
  return (
    <div className="rounded-2xl border border-border bg-surface/40 divide-y divide-border">
      {ranking.map((r, i) => (
        <div key={r.expositor_id} className="flex items-center gap-3 px-4 py-3">
          <span className="w-9 flex items-center justify-center"><Medalla i={i} /></span>
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-surface-2 flex items-center justify-center flex-shrink-0">
            {r.logo_url ? <img src={r.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-text-3 text-sm font-semibold">{(r.nombre || 'E').charAt(0).toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-1 truncate">{r.nombre}{r.stand && <span className="text-xs text-text-3 ml-1.5">{r.stand}</span>}</p>
            <p className="text-xs text-text-3">{r.interacciones} interacci{r.interacciones !== 1 ? 'ones' : 'ón'}</p>
          </div>
          <span className="text-lg font-bold font-display text-accent-light tabular-nums">{Number(r.puntos || 0).toLocaleString('es-CO')}</span>
        </div>
      ))}
    </div>
  );
}
