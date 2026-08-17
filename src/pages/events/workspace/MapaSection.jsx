import { useState, useEffect, useRef, useMemo } from 'react';
import { eventosApi } from '../../../api/eventos.js';
import { networkingApi } from '../../../api/networking.js';
import { agendaApi } from '../../../api/agenda.js';
import { useToast } from '../../../context/ToastContext.jsx';
import ImagePicker from '../../../components/ui/ImagePicker.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';

/* Mapa del evento — plano del recinto con las UBICACIONES de todo.
   Marcadores en círculo (SIN emojis, look de mapa profesional):
   · Expositor  → círculo con su logo. Clic → card del expositor.
   · Sub-evento → círculo con la inicial del título (color de su tipo).
   · Punto      → círculo con un código corto que define el organizador
                  (ej. "S1", "S2" para plazoletas de comida) + un nombre
                  debajo. El organizador crea sus propias categorías.
   Config en page_json.mapa; posiciones en % (0-100). El plano se muestra
   con la MISMA proporción (alto acotado) en el editor y en el landing. */

const COLORES_PUNTO = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#0EA5E9', '#64748B'];

function uid() { return 'm_' + Math.random().toString(36).slice(2, 9); }

/* Migra marcadores viejos (emoji/sin tipo) al modelo nuevo. */
function normMarcadores(arr) {
  return (arr || []).filter(Boolean).map(m => {
    const tipo = m.tipo || (m.expositor_id ? 'expositor' : m.sesion_id ? 'sesion' : 'punto');
    const base = { ...m, tipo, _k: m._k || uid() };
    if (tipo === 'punto') {
      base.codigo = m.codigo || (m.icono ? '' : '') || (m.label ? m.label.slice(0, 3).toUpperCase() : 'P');
      base.nombre = m.nombre || m.label || '';
      base.color = m.color || COLORES_PUNTO[0];
      delete base.icono; delete base.label;
    }
    return base;
  });
}

export default function MapaSection({ evento }) {
  const { success, error } = useToast();
  const [expositores, setExpositores] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [imagen, setImagen] = useState(evento.page_json?.mapa?.imagen_url || '');
  const [marcadores, setMarcadores] = useState(() => normMarcadores(evento.page_json?.mapa?.marcadores));
  const [pestana, setPestana] = useState('expositor'); // expositor | sesion | punto
  const [selK, setSelK] = useState(null);              // marcador seleccionado (para editar)
  const [saving, setSaving] = useState(false);
  const mapRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    Promise.all([
      networkingApi.expositoresAdmin(evento.id).catch(() => ({ expositores: [] })),
      agendaApi.sessions(evento.id).catch(() => ({ sessions: [] })),
    ]).then(([ex, ag]) => { setExpositores(ex.expositores || []); setSesiones(ag.sessions || []); });
  }, [evento.id]);

  const expoPorId = useMemo(() => new Map((expositores || []).map(e => [e.id, e])), [expositores]);
  const sesPorId  = useMemo(() => new Map(sesiones.map(s => [s.id, s])), [sesiones]);
  const colocExpo = useMemo(() => new Set(marcadores.filter(m => m.tipo === 'expositor').map(m => m.expositor_id)), [marcadores]);
  const colocSes  = useMemo(() => new Set(marcadores.filter(m => m.tipo === 'sesion').map(m => m.sesion_id)), [marcadores]);
  const sinExpo = (expositores || []).filter(e => !colocExpo.has(e.id));
  const sinSes  = sesiones.filter(s => !colocSes.has(s.id));
  const sel = marcadores.find(m => m._k === selK) || null;

  const agregar = (m) => { const _k = uid(); setMarcadores(l => [...l, { ...m, x: 50, y: 50, _k }]); setSelK(_k); };
  const setMarc = (k, patch) => setMarcadores(l => l.map(m => m._k === k ? { ...m, ...patch } : m));
  const quitar = (k) => { setMarcadores(l => l.filter(m => m._k !== k)); if (selK === k) setSelK(null); };

  /* Drag con distinción de clic: si casi no se mueve, se trata como selección. */
  const onPointerDown = (k) => (e) => {
    e.preventDefault();
    drag.current = { k, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || !mapRef.current) return;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true;
    if (!d.moved) return;
    const r = mapRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    setMarc(d.k, { x, y });
  };
  const onPointerUp = () => {
    const d = drag.current;
    if (d && !d.moved) setSelK(d.k); // fue un clic → seleccionar para editar
    drag.current = null;
  };

  const guardar = async () => {
    setSaving(true);
    try {
      const limpios = marcadores.map(({ _k, ...m }) => m);
      await eventosApi.update(evento.id, { page_json: { mapa: { imagen_url: imagen || '', marcadores: limpios } } });
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

      <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-start">
        {/* Lienzo del mapa (alto acotado a 65vh; el contenedor = la imagen) */}
        <div>
          {!imagen ? (
            <div className="rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-20 text-center">
              <p className="text-sm text-text-3">Sube el plano arriba para empezar a ubicar cosas.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface-2 overflow-auto flex justify-center">
              <div ref={mapRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
                className="relative select-none" style={{ touchAction: 'none' }}>
                <img src={imagen} alt="Plano" className="block max-h-[65vh] w-auto max-w-full pointer-events-none" draggable={false} />
                {marcadores.map(m => (
                  <Marcador key={m._k} m={m} expo={expoPorId.get(m.expositor_id)} ses={sesPorId.get(m.sesion_id)}
                    seleccionado={selK === m._k}
                    onPointerDown={onPointerDown(m._k)} onQuitar={() => quitar(m._k)} />
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] text-text-3 mt-2">Arrastra para mover · un clic selecciona para editar o quitar.</p>
        </div>

        {/* Panel derecho: editor del seleccionado, o la paleta */}
        <div className="rounded-2xl border border-border bg-surface/40 p-3">
          {sel ? (
            <EditorMarcador sel={sel} expo={expoPorId.get(sel.expositor_id)} ses={sesPorId.get(sel.sesion_id)}
              onChange={(p) => setMarc(sel._k, p)} onQuitar={() => quitar(sel._k)} onCerrar={() => setSelK(null)} />
          ) : (
            <Paleta pestana={pestana} setPestana={setPestana}
              expositores={expositores} sinExpo={sinExpo} sinSes={sinSes}
              onAgregar={agregar} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Un marcador en el lienzo ── */
function Marcador({ m, expo, ses, seleccionado, onPointerDown, onQuitar }) {
  const ring = seleccionado ? 'ring-4 ring-accent' : 'ring-2 ring-white/70';
  return (
    <div onPointerDown={onPointerDown}
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing group flex flex-col items-center"
      style={{ left: `${m.x}%`, top: `${m.y}%` }}>
      <CirculoMarcador m={m} expo={expo} ses={ses} ring={ring} />
      {(m.tipo === 'punto' ? m.nombre : (m.tipo === 'sesion' ? ses?.titulo : expo?.nombre)) && (
        <span className="mt-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] whitespace-nowrap max-w-[120px] truncate">
          {m.tipo === 'punto' ? m.nombre : (m.tipo === 'sesion' ? ses?.titulo : expo?.nombre)}
        </span>
      )}
      <button onPointerDown={e => e.stopPropagation()} onClick={onQuitar}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">×</button>
    </div>
  );
}

/* El círculo en sí, compartido con el look del landing. */
export function CirculoMarcador({ m, expo, ses, ring = 'ring-2 ring-white/70', size = 44 }) {
  const st = { width: size, height: size };
  if (m.tipo === 'expositor') {
    return (
      <span className={`block rounded-full border-2 border-white shadow-lg bg-white overflow-hidden flex items-center justify-center ${ring}`} style={st}>
        {expo?.logo_url
          ? <img src={expo.logo_url} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
          : <span className="text-xs font-bold text-slate-700">{(expo?.nombre || '?')[0]}</span>}
      </span>
    );
  }
  if (m.tipo === 'sesion') {
    return (
      <span className={`rounded-full border-2 border-white shadow-lg text-white font-bold flex items-center justify-center ${ring}`}
        style={{ ...st, background: '#6366F1' }}>
        {(ses?.titulo || '?')[0].toUpperCase()}
      </span>
    );
  }
  return (
    <span className={`rounded-full border-2 border-white shadow-lg text-white font-bold text-sm flex items-center justify-center ${ring}`}
      style={{ ...st, background: m.color || '#64748B' }}>
      {m.codigo || 'P'}
    </span>
  );
}

/* ── Editor del marcador seleccionado ── */
function EditorMarcador({ sel, expo, ses, onChange, onQuitar, onCerrar }) {
  const titulo = sel.tipo === 'expositor' ? (expo?.nombre || 'Expositor')
    : sel.tipo === 'sesion' ? (ses?.titulo || 'Sub-evento') : 'Punto de interés';
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Editar</p>
        <button onClick={onCerrar} className="text-text-3 hover:text-text-1 text-sm">✕</button>
      </div>

      {sel.tipo === 'punto' ? (
        <div className="space-y-3">
          <div>
            <label className="label text-xs">Código (va dentro del círculo)</label>
            <input value={sel.codigo || ''} maxLength={4} onChange={e => onChange({ codigo: e.target.value.toUpperCase() })}
              placeholder="Ej. S1" className="input" />
          </div>
          <div>
            <label className="label text-xs">Nombre (aparece debajo y en la card)</label>
            <input value={sel.nombre || ''} onChange={e => onChange({ nombre: e.target.value })}
              placeholder="Ej. Plazoleta de comida" className="input" />
          </div>
          <div>
            <label className="label text-xs">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {COLORES_PUNTO.map(c => (
                <button key={c} onClick={() => onChange({ color: c })}
                  className={`w-6 h-6 rounded-full border-2 ${sel.color === c ? 'border-text-1' : 'border-transparent'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="label text-xs">Descripción (opcional)</label>
            <textarea value={sel.descripcion || ''} onChange={e => onChange({ descripcion: e.target.value })}
              rows={3} placeholder="Lo que verá quien haga clic en este punto en la página pública"
              className="input resize-none" />
          </div>
        </div>
      ) : (
        <div className="text-sm text-text-2">
          <p className="font-medium text-text-1">{titulo}</p>
          <p className="text-xs text-text-3 mt-1">
            {sel.tipo === 'expositor' ? 'La info y los premios los edita la propia empresa desde su ficha.' : 'La info sale del sub-evento en el Espacio del evento.'}
          </p>
        </div>
      )}

      <button onClick={onQuitar} className="w-full mt-4 py-2 rounded-lg text-sm text-danger border border-danger/30 hover:bg-danger/10 transition-colors">
        Quitar del mapa
      </button>
    </div>
  );
}

/* ── Paleta para agregar marcadores ── */
function Paleta({ pestana, setPestana, expositores, sinExpo, sinSes, onAgregar }) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState(COLORES_PUNTO[0]);

  const crearPunto = () => {
    onAgregar({ tipo: 'punto', codigo: (codigo || 'P').toUpperCase().slice(0, 4), nombre: nombre.trim(), color });
    setCodigo(''); setNombre('');
  };

  return (
    <>
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
                <PaletaItem key={e.id} onClick={() => onAgregar({ tipo: 'expositor', expositor_id: e.id })} logo={e.logo_url} nombre={e.nombre} />
              ))
        )}

        {pestana === 'sesion' && (
          sinSes.length === 0
            ? <p className="text-xs text-text-3 px-1">No hay sub-eventos por ubicar.</p>
            : sinSes.map(s => (
              <PaletaItem key={s.id} onClick={() => onAgregar({ tipo: 'sesion', sesion_id: s.id })} inicial={(s.titulo || '?')[0]} nombre={s.titulo} />
            ))
        )}

        {pestana === 'punto' && (
          <div className="space-y-3">
            <p className="text-[11px] text-text-3">Crea tus propias categorías: un código corto (S1, S2, C1…) + su nombre.</p>
            <div className="flex gap-2">
              <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} maxLength={4} placeholder="S1" className="input w-16 text-center font-bold" />
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Plazoleta de comida" className="input flex-1" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COLORES_PUNTO.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-text-1' : 'border-transparent'}`} style={{ background: c }} />
              ))}
            </div>
            <button onClick={crearPunto} className="btn-primary btn-sm w-full">+ Agregar punto al mapa</button>
          </div>
        )}
      </div>
      <p className="text-[11px] text-text-3 mt-3">Clic en un ítem para ponerlo en el centro; luego arrástralo.</p>
    </>
  );
}

function PaletaItem({ onClick, logo, inicial, nombre }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-surface-2 transition-colors text-left">
      {logo
        ? <img src={logo} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
        : <span className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-xs font-bold text-text-3 flex-shrink-0">{inicial || (nombre || '?')[0]}</span>}
      <span className="text-sm text-text-1 truncate flex-1">{nombre}</span>
      <span className="text-[10px] text-text-3">＋</span>
    </button>
  );
}
