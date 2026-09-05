/* Tab Sugerencias — el organizador ve y gestiona lo que envía el equipo. */

import { useEffect, useState } from 'react';
import { solicitudesApi } from '../../../api/solicitudes.js';
import { useToast } from '../../../context/ToastContext.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';

const ESTADOS = [
  { v: 'abierta',     l: 'Abierta',      c: 'border-warning/40 text-warning' },
  { v: 'en_revision', l: 'En revisión',  c: 'border-primary/40 text-primary-light' },
  { v: 'resuelta',    l: 'Resuelta',     c: 'border-success/40 text-success' },
  { v: 'descartada',  l: 'Descartada',   c: 'border-border-2 text-text-3' },
];
const TIPO_LABEL = { sugerencia: 'Sugerencia', solicitud: 'Solicitud', mensaje: 'Mensaje', reporte: 'Reporte', cambio: 'Cambio de ficha' };

/* `puedeAtender` llega del panel y no se adivina aquí: quien manda es el
   servidor, que pide `gestionar_solicitudes` para tocar nada. Enseñar botones
   que van a devolver 403 es peor que no enseñarlos — se pulsa, no pasa nada, y
   uno se queda sin saber si el fallo es suyo o de la aplicación. */
export default function SolicitudesTab({ evento, puedeAtender = false }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todas');
  const { success, error: toastErr } = useToast();

  const reload = async () => {
    setLoading(true);
    try { setItems((await solicitudesApi.list(evento.id)).solicitudes || []); }
    catch (e) { toastErr(e.message); }
    finally   { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [evento.id]);

  const cambiar = async (it, patch) => {
    try {
      await solicitudesApi.actualizar(evento.id, it.id, patch);
      success('Actualizada.');
      reload();
    } catch (e) { toastErr(e.message); }
  };

  if (loading) return <GLoader message="Cargando sugerencias..." />;

  const vis = filtro === 'todas' ? items : items.filter(i => i.estado === filtro);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Sugerencias del equipo</h2>
          <p className="text-sm text-text-2 mt-1">Lo que tu equipo te envía: ideas, solicitudes, reportes y mensajes.</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {['todas', ...ESTADOS.map(e => e.v)].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                ${filtro === f ? 'bg-surface-2 border-primary/40 text-text-1'
                  : 'border-border text-text-3 hover:text-text-1'}`}>
              {f === 'todas' ? 'Todas' : ESTADOS.find(e => e.v === f)?.l}
            </button>
          ))}
        </div>
      </div>

      {vis.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-14 text-center">
          <p className="text-text-2">Nada por aquí todavía. Cuando tu equipo envíe sugerencias o solicitudes, aparecerán acá.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vis.map(it => {
            const est = ESTADOS.find(e => e.v === it.estado) || ESTADOS[0];
            return (
              <div key={it.id} className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-text-3
                                       bg-surface-2 border border-border rounded px-2 py-0.5">
                        {TIPO_LABEL[it.tipo] || it.tipo}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${est.c}`}>{est.l}</span>
                    </div>
                    {it.titulo && <p className="font-semibold text-text-1 mt-2">{it.titulo}</p>}
                    <p className="text-sm text-text-2 mt-1 whitespace-pre-wrap">{it.contenido}</p>

                    {/* Una solicitud de cambio lleva el cambio DENTRO: qué
                        campo, qué dice hoy y qué debería decir. Se pinta como
                        lo que es —un antes y un después— para poder decidir sin
                        leer prosa, y se aplica de un clic. Antes había que
                        entender el texto, abrir Equipo, buscar a la persona y
                        transcribirlo: dos pantallas y un sitio donde
                        equivocarse. */}
                    {it.tipo === 'cambio' && it.cambio?.campo && (
                      <div className="mt-2 rounded-xl border border-border bg-surface-2/40 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-text-3">
                          {it.cambio.etiqueta || it.cambio.campo}
                        </p>
                        <p className="text-sm mt-0.5">
                          <span className="text-text-3 line-through">{it.cambio.valor_actual || '(vacío)'}</span>
                          <span className="text-text-3 mx-2">→</span>
                          <span className="text-text-1 font-medium">{it.cambio.valor_propuesto}</span>
                        </p>
                        {it.cambio.aplicado_at ? (
                          <p className="text-[11px] text-success mt-1.5">
                            Aplicado el {new Date(it.cambio.aplicado_at).toLocaleDateString('es-CO')}
                          </p>
                        ) : puedeAtender ? (
                          <button onClick={() => cambiar(it, { aplicar: true })}
                            className="btn-primary btn-sm mt-2">
                            Aplicar el cambio
                          </button>
                        ) : (
                          <p className="text-[11px] text-text-3 mt-2">
                            Pendiente de que alguien con permiso lo apruebe.
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-[11px] text-text-3 mt-2">
                      {it.autor?.nombre || 'Miembro'} · {new Date(it.created_at).toLocaleString('es')}
                    </p>
                  </div>
                  {puedeAtender ? (
                    <select
                      value={it.estado}
                      onChange={e => cambiar(it, { estado: e.target.value })}
                      className="input bg-surface-2 rounded-lg py-1.5 text-xs w-auto"
                    >
                      {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.l}</option>)}
                    </select>
                  ) : (
                    /* Sin permiso se ve el estado igual: saber en qué va lo que
                       mandaste es la mitad de para qué existe esta pantalla. */
                    <span className={`px-2 py-1 rounded-lg border text-xs whitespace-nowrap
                      ${ESTADOS.find(e => e.v === it.estado)?.c || 'border-border text-text-3'}`}>
                      {ESTADOS.find(e => e.v === it.estado)?.l || it.estado}
                    </span>
                  )}
                </div>

                <details className="text-sm">
                  <summary className="cursor-pointer text-text-3 hover:text-text-1 text-xs">
                    {it.respuesta ? 'Editar respuesta' : 'Responder al autor'}
                  </summary>
                  <RespForm initial={it.respuesta || ''} onSave={(r) => cambiar(it, { respuesta: r })} />
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RespForm({ initial, onSave }) {
  const [v, setV] = useState(initial);
  return (
    <div className="mt-2 flex gap-2">
      <textarea rows={2} value={v} onChange={e => setV(e.target.value)}
        placeholder="Tu respuesta para el autor…"
        className="input rounded-xl py-2 text-sm flex-1" />
      <button onClick={() => onSave(v)} className="btn-primary btn-sm self-start">Guardar</button>
    </div>
  );
}
