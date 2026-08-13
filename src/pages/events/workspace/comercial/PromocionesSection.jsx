import { useState, useEffect } from 'react';
import { promocionesApi } from '../../../../api/promociones.js';
import { ticketsApi } from '../../../../api/tickets.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../../components/ui/Confirm.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';

/* Comercial · Promociones — cupones y descuentos REALES creados por el
   organizador: % o monto fijo, por boleta o generales, con mínimo de
   cantidad ("compra 3+"), límite de usos y vigencia (preventas). */
export default function PromocionesSection({ evento }) {
  const { success, error } = useToast();
  const [promos, setPromos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [f, setF] = useState(inicial());

  function inicial() {
    return { codigo: '', descripcion: '', tipo: 'porcentaje', valor: 10, ticket_id: '', min_cantidad: 1, limite_usos: '', vigente_desde: '', vigente_hasta: '' };
  }

  const cargar = () => {
    promocionesApi.list(evento.id)
      .then(d => setPromos(d.promociones || []))
      .catch(e => error(e.response?.data?.error || 'No se pudieron cargar las promociones (¿backend actualizado?).'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    cargar();
    ticketsApi.list(evento.id).then(d => setTipos(d.tickets || d.tipos || [])).catch(() => {});
    /* eslint-disable-next-line */
  }, [evento.id]);

  const crear = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      await promocionesApi.crear(evento.id, {
        ...f,
        valor: Number(f.valor),
        ticket_id: f.ticket_id || null,
        min_cantidad: Number(f.min_cantidad) || 1,
        limite_usos: f.limite_usos ? Number(f.limite_usos) : null,
        vigente_desde: f.vigente_desde || null,
        vigente_hasta: f.vigente_hasta || null,
      });
      success('Promoción creada. Ya se puede usar en el checkout.');
      setF(inicial());
      cargar();
    } catch (x) { error(x.response?.data?.error || x.message); }
    finally { setCreando(false); }
  };

  const toggleActivo = async (p) => {
    try { await promocionesApi.editar(evento.id, p.id, { activo: !p.activo }); cargar(); }
    catch (x) { error(x.response?.data?.error || x.message); }
  };
  const borrar = async (p) => {
    if (!(await confirmDialog({ title: 'Eliminar promoción', message: `¿Eliminar el código ${p.codigo}?`, confirmLabel: 'Eliminar', danger: true }))) return;
    try { await promocionesApi.borrar(evento.id, p.id); success('Promoción eliminada.'); cargar(); }
    catch (x) { error(x.response?.data?.error || x.message); }
  };

  const nombreTipo = (id) => tipos.find(t => String(t.id) === String(id))?.nombre || 'Todas las boletas';

  return (
    /* La columna del formulario era de 380px fijos, y dentro hay pares de
       campos: cada uno se quedaba en ~170px, donde no cabe "% de descuento"
       ni "Todas las boletas" — se leían cortados. Ahora es elástica entre 400
       y 520, y en pantalla estrecha el formulario pasa a ocupar todo el ancho
       en vez de competir con la lista. */
    <div className="grid xl:grid-cols-[minmax(400px,520px)_1fr] gap-5 items-start">
      {/* Crear */}
      <form onSubmit={crear} className="card">
        <div className="card-header"><h3 className="text-base font-semibold text-text-1">Nueva promoción</h3></div>
        <div className="card-body space-y-3.5">
          <div>
            <label className="label">Código</label>
            <input className="input font-mono uppercase" value={f.codigo} onChange={e => setF(x => ({ ...x, codigo: e.target.value.toUpperCase() }))} placeholder="PREVENTA25" required />
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <input className="input" value={f.descripcion} onChange={e => setF(x => ({ ...x, descripcion: e.target.value }))} placeholder="Preventa hasta agotar cupos" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="label">Tipo</label>
              <select className="input" value={f.tipo} onChange={e => setF(x => ({ ...x, tipo: e.target.value }))}>
                <option value="porcentaje">% de descuento</option>
                <option value="fijo">Monto fijo (COP)</option>
              </select>
            </div>
            <div>
              <label className="label">{f.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto'}</label>
              <input type="number" min={1} max={f.tipo === 'porcentaje' ? 100 : undefined} className="input" value={f.valor} onChange={e => setF(x => ({ ...x, valor: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="label">Aplica a</label>
              <select className="input" value={f.ticket_id} onChange={e => setF(x => ({ ...x, ticket_id: e.target.value }))}>
                <option value="">Todas las boletas</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Compra mínima</label>
              <input type="number" min={1} className="input" value={f.min_cantidad} onChange={e => setF(x => ({ ...x, min_cantidad: e.target.value }))} title="Ej. 3 = aplica comprando 3 o más" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Desde (opcional)</label>
              <input type="datetime-local" className="input" value={f.vigente_desde} onChange={e => setF(x => ({ ...x, vigente_desde: e.target.value }))} />
            </div>
            <div>
              <label className="label">Hasta (opcional)</label>
              <input type="datetime-local" className="input" value={f.vigente_hasta} onChange={e => setF(x => ({ ...x, vigente_hasta: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Límite de usos (opcional)</label>
            <input type="number" min={1} className="input" value={f.limite_usos} onChange={e => setF(x => ({ ...x, limite_usos: e.target.value }))} placeholder="Ilimitado" />
          </div>
          <button disabled={creando} className="btn-primary w-full justify-center">
            {creando ? <><Spinner size="sm" /> Creando…</> : 'Crear promoción'}
          </button>
        </div>
      </form>

      {/* Lista */}
      <div className="space-y-3">
        {loading ? <p className="text-sm text-text-3 py-6">Cargando…</p>
          : promos.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm text-text-2">Sin promociones aún. Crea la primera: preventa, cupón de influencer, descuento por cantidad…</p>
            </div>
          ) : promos.map(p => (
            <div key={p.id} className={`rounded-2xl border p-4 flex items-center gap-4 flex-wrap ${p.activo ? 'border-border bg-surface/60' : 'border-border bg-surface/30 opacity-60'}`}>
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-text-1">{p.codigo}</span>
                  <span className="badge badge-purple text-[10px]">{p.tipo === 'porcentaje' ? `-${p.valor}%` : `-$${Number(p.valor).toLocaleString('es-CO')}`}</span>
                  {!p.activo && <span className="badge badge-gray text-[10px]">Pausada</span>}
                </div>
                <p className="text-xs text-text-3 mt-1">
                  {nombreTipo(p.ticket_id)}
                  {p.min_cantidad > 1 ? ` · mín. ${p.min_cantidad}` : ''}
                  {p.limite_usos ? ` · ${p.usos}/${p.limite_usos} usos` : ` · ${p.usos} usos`}
                  {p.vigente_hasta ? ` · hasta ${new Date(p.vigente_hasta).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}` : ''}
                </p>
                {p.descripcion && <p className="text-xs text-text-2 mt-0.5">{p.descripcion}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActivo(p)} className="btn-secondary btn-sm">{p.activo ? 'Pausar' : 'Activar'}</button>
                <button onClick={() => borrar(p)} className="btn-ghost btn-sm text-danger/80 hover:text-danger">Eliminar</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
