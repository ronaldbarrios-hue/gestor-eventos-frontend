import { useState, useEffect } from 'react';
import { confirmDialog } from './Confirm.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from './Spinner.jsx';
import { supabase } from '../../lib/supabase.js';
import { pagosApi } from '../../api/pagos.js';

/* Conexión de la cuenta de Mercado Pago del organizador.
   Reutilizable: se usa en Ajustes → Pagos y en cada evento → Comercial → Pagos.
   La cuenta MP es a nivel de organización (vive en profiles del owner), así que
   conectarla aquí habilita el checkout online en TODOS los eventos del organizador.
   El access token nunca se expone: se guarda del lado servidor. */
export default function MercadoPagoConnect({ compact = false }) {
  const { usuario } = useAuth();
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [estado,  setEstado]  = useState({ conectado: false, mp_user_id: null, mp_public_key: '', mp_connected_at: null });
  const [accessToken, setAccessToken] = useState('');
  const [publicKey,   setPublicKey]   = useState('');
  const [working, setWorking] = useState(false);
  const [testInfo, setTestInfo] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('profiles')
        .select('mp_user_id, mp_public_key, mp_connected_at')
        .eq('id', usuario.id).single();
      if (e) throw e;
      setEstado({
        conectado: !!data?.mp_user_id,
        mp_user_id: data?.mp_user_id,
        mp_public_key: data?.mp_public_key || '',
        mp_connected_at: data?.mp_connected_at,
      });
      setPublicKey(data?.mp_public_key || '');
    } catch (e) { error(e.message); }
    finally    { setLoading(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  const onConectar = async () => {
    if (!accessToken.trim()) { error('Pega tu access token.'); return; }
    setWorking(true);
    try {
      const r = await pagosApi.conectar(accessToken.trim(), publicKey.trim() || null);
      success(`Conectado a Mercado Pago como ${r.mp_user?.nickname || r.profile?.mp_user_id}.`);
      setAccessToken('');
      await cargar();
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally    { setWorking(false); }
  };

  const onTest = async () => {
    setWorking(true);
    setTestInfo(null);
    try {
      const r = await pagosApi.test();
      setTestInfo(r.mp_user);
      success('Conexión OK con Mercado Pago.');
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally    { setWorking(false); }
  };

  const onDesconectar = async () => {
    if (!(await confirmDialog({ title: 'Desconectar Mercado Pago', message: '¿Desconectar tu cuenta de Mercado Pago? Los pagos online quedarán deshabilitados en todos tus eventos.', confirmLabel: 'Desconectar', danger: true }))) return;
    setWorking(true);
    try {
      await pagosApi.desconectar();
      success('Cuenta desconectada.');
      setTestInfo(null);
      await cargar();
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally    { setWorking(false); }
  };

  if (loading) return <div className="card p-6 flex justify-center"><Spinner size="md" /></div>;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="text-base font-semibold text-text-1">Mercado Pago</h3>
          <p className="text-xs text-text-3 mt-0.5">Cobro online con tu propia cuenta — GESTEK no toca el dinero.</p>
        </div>
        {estado.conectado
          ? <span className="badge badge-green">Conectado</span>
          : <span className="badge badge-gray">Sin conectar</span>}
      </div>

      <div className="card-body space-y-4">
        {estado.conectado ? (
          <div className="bg-surface-2 rounded-2xl p-4 border border-border space-y-2">
            <Row label="MP User ID"   value={estado.mp_user_id} />
            <Row label="Public Key"   value={estado.mp_public_key || '—'} mono />
            <Row label="Conectado el" value={estado.mp_connected_at ? new Date(estado.mp_connected_at).toLocaleString('es-CO') : '—'} />
            {testInfo && (
              <>
                <div className="border-t border-border my-2" />
                <Row label="Nickname" value={testInfo.nickname} />
                <Row label="Email"    value={testInfo.email} />
                <Row label="País"     value={testInfo.country_id} />
              </>
            )}
            <div className="flex gap-2 pt-3">
              <button onClick={onTest} disabled={working} className="btn-secondary btn-sm">
                {working ? <Spinner size="sm" /> : null} Probar conexión
              </button>
              <button onClick={onDesconectar} disabled={working} className="btn-ghost btn-sm text-danger/80 hover:text-danger">
                Desconectar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-text-2 leading-relaxed bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <p className="font-medium text-text-1 mb-1">¿Dónde obtengo mis credenciales?</p>
              <p>Entra a <a className="text-primary underline" href="https://www.mercadopago.com.co/developers/panel/app" target="_blank" rel="noreferrer">developers.mercadopago.com</a> → tu aplicación → <em>Credenciales de producción</em>. Copia el <code className="font-mono text-xs">Access Token</code> y la <code className="font-mono text-xs">Public Key</code>.</p>
            </div>

            <div className="field">
              <label className="label">Access Token</label>
              <input type="password" value={accessToken} onChange={e => setAccessToken(e.target.value)}
                placeholder="APP_USR-..." className="input font-mono" />
              <p className="text-xs text-text-3 mt-1">Se guarda del lado servidor. Nunca se expone al frontend.</p>
            </div>

            <div className="field">
              <label className="label">Public Key <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
              <input type="text" value={publicKey} onChange={e => setPublicKey(e.target.value)}
                placeholder="APP_USR-xxxxxxxx-..." className="input font-mono" />
            </div>

            <div className="flex justify-end">
              <button onClick={onConectar} disabled={working || !accessToken.trim()} className="btn-gradient">
                {working ? <><Spinner size="sm" /> Conectando…</> : 'Conectar cuenta'}
              </button>
            </div>
          </div>
        )}

        {!compact && (
          <ul className="text-xs text-text-3 space-y-1.5 leading-relaxed list-disc pl-5 pt-1">
            <li>Cada comprador paga directo a tu cuenta MP; al confirmarse, la boleta se marca <strong className="text-text-2">pagada</strong> sola (webhook).</li>
            <li>El comprador queda con su QR en <code className="font-mono">/mi-ticket/&lt;código&gt;</code>, listo para el check-in.</li>
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-text-3">{label}</span>
      <span className={`text-sm text-text-1 text-right truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
