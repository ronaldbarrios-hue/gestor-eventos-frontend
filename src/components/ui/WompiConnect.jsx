import { useState, useEffect } from 'react';
import { confirmDialog } from './Confirm.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from './Spinner.jsx';
import { pagosApi } from '../../api/pagos.js';

/* Conexión de la cuenta de Wompi del organizador (pasarela colombiana:
   Nequi, Bre-B/PSE, Bancolombia, tarjetas). A nivel de organización: conectar
   aquí habilita el cobro Wompi en todos los eventos del organizador. Los
   secretos se guardan del lado servidor y nunca se exponen al frontend. */
export default function WompiConnect() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState({ conectado: false, public_key: '', connected_at: null });
  const [f, setF] = useState({ public_key: '', private_key: '', integrity_secret: '', events_secret: '' });
  const [working, setWorking] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try { const d = await pagosApi.wompiEstado(); setEstado(d); }
    catch (e) { error(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  const set = (patch) => setF(x => ({ ...x, ...patch }));

  const onConectar = async () => {
    if (!f.public_key.trim()) { error('Pega tu llave pública de Wompi.'); return; }
    setWorking(true);
    try {
      await pagosApi.wompiConectar({
        public_key: f.public_key.trim(), private_key: f.private_key.trim() || null,
        integrity_secret: f.integrity_secret.trim(), events_secret: f.events_secret.trim(),
      });
      success('Wompi conectado.');
      setF({ public_key: '', private_key: '', integrity_secret: '', events_secret: '' });
      await cargar();
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setWorking(false); }
  };

  const onDesconectar = async () => {
    if (!(await confirmDialog({ title: 'Desconectar Wompi', message: '¿Desconectar tu cuenta de Wompi? Se deshabilita el cobro con Wompi en todos tus eventos.', confirmLabel: 'Desconectar', danger: true }))) return;
    setWorking(true);
    try { await pagosApi.wompiDesconectar(); success('Wompi desconectado.'); await cargar(); }
    catch (e) { error(e.response?.data?.error || e.message); }
    finally { setWorking(false); }
  };

  if (loading) return <div className="card p-6 flex justify-center"><Spinner size="md" /></div>;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="text-base font-semibold text-text-1">Wompi <span className="text-xs font-normal text-text-3">· Nequi, Bre-B, tarjetas</span></h3>
          <p className="text-xs text-text-3 mt-0.5">Cobro online colombiano con tu propia cuenta — GESTEK no toca el dinero.</p>
        </div>
        {estado.conectado ? <span className="badge badge-green">Conectado</span> : <span className="badge badge-gray">Sin conectar</span>}
      </div>

      <div className="card-body space-y-4">
        {estado.conectado ? (
          <div className="bg-surface-2 rounded-2xl p-4 border border-border space-y-2">
            <div className="flex items-center justify-between gap-4"><span className="text-xs text-text-3">Llave pública</span><span className="text-sm text-text-1 font-mono text-xs truncate">{estado.public_key || '—'}</span></div>
            <div className="flex items-center justify-between gap-4"><span className="text-xs text-text-3">Conectado el</span><span className="text-sm text-text-1">{estado.connected_at ? new Date(estado.connected_at).toLocaleString('es-CO') : '—'}</span></div>
            <div className="pt-2"><button onClick={onDesconectar} disabled={working} className="btn-ghost btn-sm text-danger/80 hover:text-danger">Desconectar</button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-text-2 leading-relaxed bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <p className="font-medium text-text-1 mb-1">¿Dónde obtengo mis credenciales?</p>
              <p>En tu panel de <a className="text-primary underline" href="https://comercios.wompi.co/" target="_blank" rel="noreferrer">comercios.wompi.co</a> → <em>Desarrolladores</em>. Copia la <code className="font-mono text-xs">llave pública</code> (pub_test_… para pruebas), el <code className="font-mono text-xs">secreto de integridad</code> y el <code className="font-mono text-xs">secreto de eventos</code>. Configura la URL de eventos apuntando a nuestro webhook.</p>
            </div>
            <div className="field">
              <label className="label">Llave pública</label>
              <input value={f.public_key} onChange={e => set({ public_key: e.target.value })} placeholder="pub_test_… o pub_prod_…" className="input font-mono" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="field">
                <label className="label">Secreto de integridad</label>
                <input type="password" value={f.integrity_secret} onChange={e => set({ integrity_secret: e.target.value })} placeholder="test_integrity_…" className="input font-mono" />
              </div>
              <div className="field">
                <label className="label">Secreto de eventos</label>
                <input type="password" value={f.events_secret} onChange={e => set({ events_secret: e.target.value })} placeholder="test_events_…" className="input font-mono" />
              </div>
            </div>
            <div className="field">
              <label className="label">Llave privada <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
              <input type="password" value={f.private_key} onChange={e => set({ private_key: e.target.value })} placeholder="prv_test_…" className="input font-mono" />
              <p className="text-xs text-text-3 mt-1">Los secretos se guardan del lado servidor. Nunca se exponen al frontend.</p>
            </div>
            <div className="flex justify-end">
              <button onClick={onConectar} disabled={working || !f.public_key.trim()} className="btn-gradient">
                {working ? <><Spinner size="sm" /> Conectando…</> : 'Conectar Wompi'}
              </button>
            </div>
          </div>
        )}
        <ul className="text-xs text-text-3 space-y-1.5 leading-relaxed list-disc pl-5 pt-1">
          <li>URL de eventos (webhook) a configurar en Wompi: <code className="font-mono">…/webhooks/wompi</code></li>
          <li>Al aprobarse el pago, la boleta se marca <strong className="text-text-2">pagada</strong> sola y llega el QR por correo.</li>
        </ul>
      </div>
    </div>
  );
}
