import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  const [zonas, setZonas] = useState(() => (evento.page_json?.zonas || []).map(z => ({ ...z, _k: z.id })));
  const [aforo, setAforo] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [nuevaAlerta, setNuevaAlerta] = useState('');
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

  /* Aquí sólo se DEFINEN las zonas. Operarlas —entradas, salidas, limpiar,
     reporte— es otra pantalla (Aforo por zonas), y la ocupación se pide sólo
     para que quien configura vea de una si la zona ya tiene gente dentro. */
  useEffect(() => {
    let vivo = true;
    const tick = () => {
      clientesApi.alertas(evento.id).then(d => { if (vivo) setAlertas(d.alertas || []); }).catch(() => {});
    };
    clientesApi.aforoZonas(evento.id).then(d => { if (vivo) setAforo(d.zonas || []); }).catch(() => {});
    tick();
    const iv = setInterval(tick, 8000);
    return () => { vivo = false; clearInterval(iv); };
  }, [evento.id]);

  const reportar = async () => {
    if (!nuevaAlerta.trim()) return;
    try {
      await clientesApi.reportarAlerta(evento.id, { mensaje: nuevaAlerta.trim(), tipo: 'incidente', nivel: 'warning' });
      setNuevaAlerta('');
      const d = await clientesApi.alertas(evento.id); setAlertas(d.alertas || []);
    } catch (e) { error(e.response?.data?.error || e.message); }
  };
  const resolver = async (id) => {
    try { await clientesApi.resolverAlerta(evento.id, id); setAlertas(a => a.map(x => x.id === id ? { ...x, resuelta: true } : x)); }
    catch (e) { error(e.response?.data?.error || e.message); }
  };

  const setZona = (k, patch) => setZonas(l => l.map(z => z._k === k ? { ...z, ...patch } : z));
  const agregarZona = () => setZonas(l => [...l, { _k: uid(), id: uid(), nombre: '', aforo_max: '' }]);
  const quitarZona = (k) => setZonas(l => l.filter(z => z._k !== k));

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
    for (const z of zonas) if (!z.nombre.trim()) { error('Cada zona necesita un nombre.'); return; }
    setSaving(true);
    try {
      const limpio = accesos.map(({ id, nombre, tipos, staff }) => ({ id, nombre: nombre.trim(), tipos: tipos || [], staff: staff || [] }));
      const zonasLimpio = zonas.map(({ id, nombre, aforo_max }) => ({ id, nombre: nombre.trim(), aforo_max: Number(aforo_max) || null }));
      await eventosApi.update(evento.id, { page_json: { accesos: limpio, zonas: zonasLimpio } });
      success('Accesos guardados. En el check-in cada puerta y zona ya se pueden elegir.');
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

      {/* ── Alertas en vivo ── */}
      <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Alertas en vivo</p>
          {alertas.filter(a => !a.resuelta).length > 0 && (
            <span className="text-[11px] font-mono bg-danger/15 text-danger px-2 py-0.5 rounded-full">{alertas.filter(a => !a.resuelta).length} activas</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input value={nuevaAlerta} onChange={e => setNuevaAlerta(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') reportar(); }}
            placeholder="Reportar algo: cola en la puerta, incidente…" className="input flex-1 text-sm" />
          <button onClick={reportar} disabled={!nuevaAlerta.trim()} className="btn-secondary btn-sm flex-shrink-0">Reportar</button>
        </div>
        {alertas.length === 0 ? (
          <p className="text-xs text-text-3">Sin alertas. Las de aforo lleno aparecen solas; el staff puede reportar aquí.</p>
        ) : (
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {alertas.map(a => {
              const c = a.nivel === 'critico' ? 'border-danger/40 bg-danger/5' : a.nivel === 'warning' ? 'border-warning/40 bg-warning/5' : 'border-border bg-surface-2/40';
              return (
                <li key={a.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2 ${a.resuelta ? 'opacity-50' : ''} ${c}`}>
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${a.nivel === 'critico' ? 'bg-danger/15 text-danger' : a.nivel === 'warning' ? 'bg-warning/15 text-warning' : 'bg-surface-2 text-text-3'}`}>{a.tipo}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-1">{a.mensaje}</p>
                    <p className="text-[11px] text-text-3">{a.autor?.nombre ? `${a.autor.nombre} · ` : ''}{new Date(a.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {!a.resuelta && <button onClick={() => resolver(a.id)} className="btn-ghost btn-sm text-xs flex-shrink-0">Resolver</button>}
                </li>
              );
            })}
          </ul>
        )}
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

      {/* ── Aforo por zonas ── */}
      <div className="border-t border-border pt-5 space-y-3">
        <div>
          <h3 className="text-base font-semibold text-text-1">Aforo por zonas</h3>
          <p className="text-sm text-text-2">Define zonas del recinto (tarima, zona VIP, patio de comidas…) con su aforo máximo. Operarlas —entradas, salidas, poner el contador a cero y el reporte— se hace en <b>Asistentes → Aforo por zonas</b>; en el plano (<b>Espacio del evento → Mapa</b>) se colocan encima del recinto.</p>
          <p className="text-xs text-text-3 mt-1">El aforo máximo avisa, no bloquea: si una zona se pasa, la gente sigue entrando y queda registrado el excedente.</p>
        </div>

        {aforo.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface/40 p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Ocupación ahora</p>
              <Link to={`/eventos/${evento.id}?s=asistentes&t=aforo`} className="text-[11px] text-primary-light hover:underline">Abrir el tablero →</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {aforo.map(z => {
                const pct = z.aforo_max ? Math.min(100, Math.round((z.dentro / z.aforo_max) * 100)) : null;
                const lleno = pct != null && pct >= 90;
                return (
                  <div key={z.id} className="rounded-xl bg-surface-2 border border-border p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-text-1 truncate">{z.nombre}</p>
                      <p className="text-sm font-bold font-display tabular-nums text-text-1">{z.dentro}{z.aforo_max ? <span className="text-text-3 text-xs"> / {z.aforo_max}</span> : ''}</p>
                    </div>
                    {pct != null && (
                      <div className="h-2 rounded-full bg-surface-3 overflow-hidden mt-2">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: lleno ? 'var(--danger, #EF4444)' : 'var(--brand-primary, #3B82F6)' }} />
                      </div>
                    )}
                    {lleno && <p className="text-[11px] text-danger mt-1">Casi al tope</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {zonas.map((z, i) => (
            <div key={z._k} className="flex items-center gap-2">
              <span className="text-xs text-text-3 w-5">{i + 1}.</span>
              <input value={z.nombre} onChange={e => setZona(z._k, { nombre: e.target.value })}
                placeholder="Nombre de la zona" className="input flex-1" />
              <input type="number" min="0" value={z.aforo_max} onChange={e => setZona(z._k, { aforo_max: e.target.value })}
                placeholder="Aforo máx" className="input w-28" />
              <button onClick={() => quitarZona(z._k)} className="w-8 h-8 rounded-lg text-danger-light hover:bg-danger/10 flex items-center justify-center flex-shrink-0">✕</button>
            </div>
          ))}
          <button onClick={agregarZona} className="btn-ghost btn-sm">+ Añadir zona</button>
        </div>
      </div>
    </div>
  );
}
