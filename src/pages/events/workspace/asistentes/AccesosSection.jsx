import { useState, useEffect, useMemo } from 'react';
import { eventosApi } from '../../../../api/eventos.js';
import { ticketsApi } from '../../../../api/tickets.js';
import { clientesApi } from '../../../../api/clientes.js';
import { equipoApi } from '../../../../api/equipo.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import GLoader from '../../../../components/ui/GLoader.jsx';

/* Asistentes · Accesos — control de ingresos por puerta.
   El organizador define cuántas entradas hay, qué tipos de boleta admite cada
   una (VIP, general, o todas) y quién registra. En el check-in el staff elige
   su puerta; se valida el tipo y se registra por dónde entró cada persona.
   Config en page_json.accesos; el conteo sale de tickets.acceso. */

function uid() { return 'acc_' + Math.random().toString(36).slice(2, 9); }

export default function AccesosSection({ evento }) {
  const { success, error } = useToast();
  const [accesos, setAccesos] = useState(() => (evento.page_json?.accesos || []).map(a => ({ ...a, _k: a.id })));
  const [tipos, setTipos] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      ticketsApi.list(evento.id).catch(() => ({ tickets: [] })),
      equipoApi.list(evento.id).catch(() => ({ miembros: [], owner: null })),
      clientesApi.list(evento.id, { limit: 1000 }).catch(() => ({ clientes: [] })),
    ]).then(([tt, eq, cl]) => {
      setTipos(tt.tickets || tt.ticket_types || []);
      const staff = [...(eq.owner ? [{ id: eq.owner.id, nombre: eq.owner.nombre || 'Organizador' }] : []),
        ...(eq.miembros || []).map(m => ({ id: m.profile?.id || m.id, nombre: m.profile?.nombre || m.nombre_invitado || m.email }))]
        .filter(s => s.id && s.nombre);
      setMiembros(staff);
      setClientes(cl.clientes || cl.tickets || []);
    }).finally(() => setLoading(false));
  }, [evento.id]);

  /* Conteo de ingresos por puerta (tickets ya usados con su acceso). */
  const conteo = useMemo(() => {
    const m = {};
    for (const c of clientes) if (c.estado === 'usado' && c.acceso) m[c.acceso] = (m[c.acceso] || 0) + 1;
    return m;
  }, [clientes]);
  const sinPuerta = useMemo(() => clientes.filter(c => c.estado === 'usado' && !c.acceso).length, [clientes]);

  const set = (k, patch) => setAccesos(l => l.map(a => a._k === k ? { ...a, ...patch } : a));
  const agregar = () => setAccesos(l => [...l, { _k: uid(), id: uid(), nombre: '', tipos: [], staff: [] }]);
  const quitar = (k) => setAccesos(l => l.filter(a => a._k !== k));
  const toggleTipo = (k, tid) => set(k, { tipos: (accesos.find(a => a._k === k)?.tipos || []).includes(tid)
    ? accesos.find(a => a._k === k).tipos.filter(x => x !== tid)
    : [...(accesos.find(a => a._k === k)?.tipos || []), tid] });
  const toggleStaff = (k, sid) => set(k, { staff: (accesos.find(a => a._k === k)?.staff || []).includes(sid)
    ? accesos.find(a => a._k === k).staff.filter(x => x !== sid)
    : [...(accesos.find(a => a._k === k)?.staff || []), sid] });

  const guardar = async () => {
    for (const a of accesos) if (!a.nombre.trim()) { error('Cada puerta necesita un nombre.'); return; }
    setSaving(true);
    try {
      const limpio = accesos.map(({ id, nombre, tipos, staff }) => ({ id, nombre: nombre.trim(), tipos: tipos || [], staff: staff || [] }));
      await eventosApi.update(evento.id, { page_json: { ...(evento.page_json || {}), accesos: limpio } });
      success('Accesos guardados. En el check-in cada puerta ya se puede elegir.');
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <GLoader message="Cargando accesos…" />;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Accesos e ingresos</h2>
          <p className="text-sm text-text-2 mt-1">Define las entradas del evento, qué boletas admite cada una y quién registra.</p>
        </div>
        <button onClick={guardar} disabled={saving} className="btn-primary">{saving ? 'Guardando…' : 'Guardar accesos'}</button>
      </div>

      {/* Tablero de ingresos por puerta */}
      {Object.keys(conteo).length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/40 p-4">
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-3">Ingresos registrados</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(conteo).map(([nombre, n]) => (
              <div key={nombre} className="px-3 py-2 rounded-xl bg-surface-2 border border-border">
                <p className="text-lg font-bold font-display tabular-nums text-text-1">{n}</p>
                <p className="text-[11px] text-text-3">{nombre}</p>
              </div>
            ))}
            {sinPuerta > 0 && (
              <div className="px-3 py-2 rounded-xl bg-surface-2 border border-dashed border-border">
                <p className="text-lg font-bold font-display tabular-nums text-text-2">{sinPuerta}</p>
                <p className="text-[11px] text-text-3">Sin puerta</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {accesos.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
            <p className="text-sm text-text-3 mb-4">Si tu evento tiene una sola entrada no necesitas configurar nada. Agrega puertas si tienes varias o quieres separar VIP de general.</p>
          </div>
        )}
        {accesos.map((a, i) => (
          <div key={a._k} className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-3 w-5">{i + 1}.</span>
              <input value={a.nombre} onChange={e => set(a._k, { nombre: e.target.value })}
                placeholder="Ej. Entrada principal, Entrada VIP, Puerta Norte" className="input flex-1" />
              <button onClick={() => quitar(a._k)} className="w-8 h-8 rounded-lg text-danger-light hover:bg-danger/10 flex items-center justify-center">✕</button>
            </div>

            {tipos.length > 0 && (
              <div>
                <label className="label text-xs">Boletas que admite <span className="lowercase tracking-normal font-normal text-text-3">(vacío = todas)</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {tipos.map(t => (
                    <button key={t.id} onClick={() => toggleTipo(a._k, t.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                        ${(a.tipos || []).includes(t.id) ? 'border-accent bg-accent/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
                      {t.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {miembros.length > 0 && (
              <div>
                <label className="label text-xs">Quién registra aquí <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {miembros.map(s => (
                    <button key={s.id} onClick={() => toggleStaff(a._k, s.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                        ${(a.staff || []).includes(s.id) ? 'border-primary bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
                      {s.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={agregar} className="btn-ghost btn-sm">+ Añadir puerta</button>
    </div>
  );
}
