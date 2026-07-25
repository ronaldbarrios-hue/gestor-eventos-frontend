import { useState, useEffect, useRef, useMemo } from 'react';
import { eventosApi } from '../../../api/eventos.js';
import { networkingApi } from '../../../api/networking.js';
import { agendaApi } from '../../../api/agenda.js';
import { useToast } from '../../../context/ToastContext.jsx';
import ImagePicker from '../../../components/ui/ImagePicker.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import { tipoEspacio } from '../../../lib/espacio.js';

/* Mapa del evento — plano del recinto con las UBICACIONES de todo lo que pasa:
   expositores (círculo con logo), sub-eventos del cronograma (pin con su icono)
   y puntos de interés (entrada, comida, baño, escenario…). El organizador
   arrastra cada marcador a su lugar; el asistente hace clic y ve la info.
   Config en page_json.mapa; posiciones en % (0-100) para ser responsivo. */

const PUNTOS_INTERES = [
  { icono: '🚪', label: 'Entrada' },
  { icono: '🚻', label: 'Baños' },
  { icono: '🍔', label: 'Comida' },
  { icono: '🎤', label: 'Escenario' },
  { icono: 'ℹ️', label: 'Información' },
  { icono: '🅿️', label: 'Parqueadero' },
  { icono: '🚑', label: 'Primeros auxilios' },
  { icono: '🏳️', label: 'Salida' },
];

function uid() { return 'm_' + Math.random().toString(36).slice(2, 9); }

/* Normaliza marcadores viejos (sin `tipo`, solo expositor_id) y les da una key. */
function normMarcadores(arr) {
  return (arr || []).filter(Boolean).map(m => {
    const tipo = m.tipo || (m.expositor_id ? 'expositor' : m.sesion_id ? 'sesion' : 'punto');
    return { ...m, tipo, _k: m._k || m.expositor_id || m.sesion_id || uid() };
  });
}

export default function MapaSection({ evento }) {
  const { success, error } = useToast();
  const [expositores, setExpositores] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [imagen, setImagen] = useState(evento.page_json?.mapa?.imagen_url || '');
  const [marcadores, setMarcadores] = useState(() => normMarcadores(evento.page_json?.mapa?.marcadores));
  const [pestana, setPestana] = useState('expositor'); // expositor | sesion | punto
  const [saving, setSaving] = useState(false);
  const mapRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    Promise.all([
      networkingApi.expositoresAdmin(evento.id).catch(() => ({ expositores: [] })),
      agendaApi.sessions(evento.id).catch(() => ({ sessions: [] })),
    ]).then(([ex, ag]) => {
      setExpositores(ex.expositores || []);
      setSesiones(ag.sessions || []);
    });
  }, [evento.id]);

  const expoPorId = useMemo(() => new Map((expositores || []).map(e => [e.id, e])), [expositores]);
  const sesPorId  = useMemo(() => new Map(sesiones.map(s => [s.id, s])), [sesiones]);

  const colocExpo = useMemo(() => new Set(marcadores.filter(m => m.tipo === 'expositor').map(m => m.expositor_id)), [marcadores]);
  const colocSes  = useMemo(() => new Set(marcadores.filter(m => m.tipo === 'sesion').map(m => m.sesion_id)), [marcadores]);
  const sinExpo = (expositores || []).filter(e => !colocExpo.has(e.id));
  const sinSes  = sesiones.filter(s => !colocSes.has(s.id));

  const agregar = (m) => setMarcadores(l => [...l, { ...m, x: 50, y: 50, _k: uid() }]);
  const quitar = (k) => setMarcadores(l => l.filter(m => m._k !== k));

  /* Drag: posición en % relativa al contenedor del mapa. */
  const onPointerDown = (k) => (e) => { e.preventDefault(); dragRef.current = k; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onPointerMove = (e) => {
    const k = dragRef.current;
    if (!k || !mapRef.current) return;
    const r = mapRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    setMarcadores(l => l.map(m => m._k === k ? { ...m, x, y } : m));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const guardar = async () => {
    setSaving(true);
    try {
      /* Se descarta `_k` (solo de UI). */
      const limpios = marcadores.map(({ _k, ...m }) => m);
      const mapa = { imagen_url: imagen || '', marcadores: limpios };
      await eventosApi.update(evento.id, { page_json: { ...(evento.page_json || {}), mapa } });
      success('Mapa guardado. Agrégalo a la landing con el bloque “Mapa del evento”.');
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  if (expositores === null) return <GLoader message="Cargando mapa…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Mapa del evento</h2>
          <p className="text-sm text-text-2 mt-1">Sube el plano y ubica expositores, sub-eventos y puntos de interés.</p>
        </div>
        <button onClick={guardar} disabled={saving} className="btn-primary">{saving ? 'Guardando…' : 'Guardar mapa'}</button>
      </div>

      <div className="card">
        <div className="card-body">
          <label className="label">Plano del recinto</label>
          <ImagePicker value={imagen} onChange={setImagen} ownerId={evento.id} placeholder="Sube una imagen del plano/mapa" />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-5 items-start">
        {/* Lienzo del mapa */}
        <div>
          {!imagen ? (
            <div className="rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-20 text-center">
              <p className="text-sm text-text-3">Sube el plano arriba para empezar a ubicar cosas.</p>
            </div>
          ) : (
            <div ref={mapRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
              className="relative rounded-2xl overflow-hidden border border-border bg-surface-2 select-none"
              style={{ touchAction: 'none' }}>
              <img src={imagen} alt="Plano" className="w-full block pointer-events-none" draggable={false} />
              {marcadores.map(m => (
                <div key={m._k} onPointerDown={onPointerDown(m._k)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing group"
                  style={{ left: `${m.x}%`, top: `${m.y}%` }}>
                  <MarcadorVisual m={m} expo={expoPorId.get(m.expositor_id)} ses={sesPorId.get(m.sesion_id)} />
                  <button onClick={() => quitar(m._k)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">×</button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-text-3 mt-2">Arrastra cada marcador a su posición. Pasa el mouse por encima para quitarlo.</p>
        </div>

        {/* Paleta */}
        <div className="rounded-2xl border border-border bg-surface/40 p-3">
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-1 mb-3">
            {[['expositor', 'Expositores'], ['sesion', 'Sub-eventos'], ['punto', 'Puntos']].map(([k, l]) => (
              <button key={k} onClick={() => setPestana(k)}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${pestana === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>{l}</button>
            ))}
          </div>

          <div className="max-h-[55vh] overflow-y-auto space-y-1.5">
            {pestana === 'expositor' && (
              (expositores || []).length === 0
                ? <p className="text-xs text-text-3 px-1">No hay expositores todavía.</p>
                : sinExpo.length === 0
                  ? <p className="text-xs text-text-3 px-1">Todos están en el mapa.</p>
                  : sinExpo.map(e => (
                    <PaletaItem key={e.id} onClick={() => agregar({ tipo: 'expositor', expositor_id: e.id })}
                      logo={e.logo_url} nombre={e.nombre} />
                  ))
            )}

            {pestana === 'sesion' && (
              sesiones.length === 0
                ? <p className="text-xs text-text-3 px-1">Crea sub-eventos en el Espacio del evento.</p>
                : sinSes.length === 0
                  ? <p className="text-xs text-text-3 px-1">Todos están en el mapa.</p>
                  : sinSes.map(s => (
                    <PaletaItem key={s.id} onClick={() => agregar({ tipo: 'sesion', sesion_id: s.id })}
                      icono={tipoEspacio(s.tipo).icon} color={tipoEspacio(s.tipo).color} nombre={s.titulo} />
                  ))
            )}

            {pestana === 'punto' && (
              <div className="grid grid-cols-2 gap-1.5">
                {PUNTOS_INTERES.map(p => (
                  <button key={p.label} onClick={() => agregar({ tipo: 'punto', icono: p.icono, label: p.label })}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-surface-2 transition-colors text-left">
                    <span>{p.icono}</span><span className="text-xs text-text-1 truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-text-3 mt-3">Clic para poner en el centro; luego arrástralo.</p>
        </div>
      </div>
    </div>
  );
}

/* Cómo se ve cada marcador según su tipo. */
function MarcadorVisual({ m, expo, ses }) {
  if (m.tipo === 'expositor') {
    return (
      <span className="block w-11 h-11 rounded-full border-2 border-white shadow-lg bg-white overflow-hidden flex items-center justify-center ring-2 ring-primary/40">
        {expo?.logo_url
          ? <img src={expo.logo_url} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
          : <span className="text-xs font-bold text-slate-700">{(expo?.nombre || '?')[0]}</span>}
      </span>
    );
  }
  if (m.tipo === 'sesion') {
    const t = tipoEspacio(ses?.tipo);
    return (
      <span className="flex items-center gap-1 px-2 py-1 rounded-full border-2 border-white shadow-lg text-white text-[11px] font-medium whitespace-nowrap" style={{ background: t.color }}>
        <span>{t.icon}</span>{(ses?.titulo || 'Sub-evento').slice(0, 18)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border-2 border-white shadow-lg text-white text-[11px] font-medium whitespace-nowrap">
      <span>{m.icono}</span>{m.label}
    </span>
  );
}

function PaletaItem({ onClick, logo, icono, color, nombre }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-surface-2 transition-colors text-left">
      {logo
        ? <img src={logo} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
        : <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={color ? { background: `${color}22` } : undefined}>{icono || (nombre || '?')[0]}</span>}
      <span className="text-sm text-text-1 truncate flex-1">{nombre}</span>
      <span className="text-[10px] text-text-3">＋</span>
    </button>
  );
}
