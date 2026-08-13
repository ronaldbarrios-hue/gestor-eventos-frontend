import { useEffect, useState } from 'react';
import { conexionesApi } from '../../api/conexiones.js';
import { integracionesApi } from '../../api/integraciones.js';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/* Conectar Claude — dos caminos, y conviene entender que son distintos.

   1. TU LLAVE. El asistente del panel corría con la cuenta de la plataforma:
      cada organizador que lo usara costaba dinero a GESTEK, que no escala.
      Aquí cada quien pega la suya y paga su consumo, igual que conecta su
      cuenta de Mercado Pago.

   2. GESTEK DENTRO DE CLAUDE. Un token y una URL, y Claude puede operar la
      cuenta desde fuera del panel: «móntame el evento de septiembre». Son las
      mismas 70 herramientas del asistente, expuestas por MCP.

   El primero hace falta para que el asistente de aquí dentro funcione; el
   segundo para hablarle a Claude desde fuera. No se sustituyen. */

const URL_API = import.meta.env.VITE_API_URL || '';

export default function ConectarClaude() {
  const { success, error: toastErr } = useToast();

  const [estado, setEstado] = useState(null);   // null = cargando
  const [llave, setLlave] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);

  const [tokens, setTokens] = useState([]);
  const [tokenNuevo, setTokenNuevo] = useState(null);  // sólo se ve una vez
  const [creando, setCreando] = useState(false);

  const cargar = () => {
    conexionesApi.verIA().then(setEstado).catch(e => { toastErr(e.message); setEstado({ disponible: false }); });
    integracionesApi.listTokens().then(d => setTokens(d.tokens || d || [])).catch(() => setTokens([]));
  };
  useEffect(cargar, []); // eslint-disable-line

  const guardar = async () => {
    if (!llave.trim()) { toastErr('Pega tu llave de Anthropic.'); return; }
    setGuardando(true);
    try {
      const r = await conexionesApi.guardarIA({ llave: llave.trim() });
      setLlave('');
      if (r.conexion?.ok) success(r.aviso || 'Conectada.');
      else toastErr(r.conexion?.error || 'Se guardó, pero la comprobación falló.');
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setGuardando(false); }
  };

  const probar = async () => {
    setProbando(true);
    try {
      const r = await conexionesApi.probarIA();
      r.ok ? success(r.mensaje || 'La llave funciona.') : toastErr(r.error);
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setProbando(false); }
  };

  const desconectar = async () => {
    try {
      const r = await conexionesApi.borrarIA();
      success(r.aviso || 'Desconectada.');
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const crearToken = async () => {
    setCreando(true);
    try {
      const r = await integracionesApi.crearToken('Claude (MCP)');
      /* El token entero se ve UNA vez: después sólo queda su hash. */
      setTokenNuevo(r.token || r.raw || null);
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setCreando(false); }
  };

  if (!estado) return <div className="card p-5"><Spinner size="sm" /></div>;

  const c = estado.conexion;
  const conectada = Boolean(c && c.activo);

  return (
    <div className="space-y-4">

      {/* ── 1 · Tu llave ── */}
      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-1">Tu cuenta de Claude</h3>
          <p className="text-xs text-text-3 mt-1 leading-relaxed">
            El asistente del panel usa <strong>tu</strong> llave de Anthropic, así que el consumo se
            factura a tu cuenta y no a la plataforma. Se genera en{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer noopener"
               className="text-primary-light hover:underline">console.anthropic.com → API Keys</a>.
          </p>
        </div>

        {estado.cifrado_listo === false && (
          <p className="text-xs text-danger-light bg-danger/10 rounded-xl px-3 py-2">
            El servidor no tiene configurado el cifrado de secretos, así que no se puede guardar una
            llave de forma segura. Hay que poner <code>SMTP_CRYPTO_KEY</code> antes.
          </p>
        )}
        {estado.disponible === false && (
          <p className="text-xs text-warning-light bg-warning/10 rounded-xl px-3 py-2">
            Falta aplicar la migración 0072 en la base de datos.
          </p>
        )}

        {conectada ? (
          <div className="rounded-2xl border border-border bg-surface-2/40 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-text-1">{c.pista}</span>
              {c.verificado_ok === true && <span className="text-xs text-success">✓ comprobada</span>}
              {c.verificado_ok === false && <span className="text-xs text-danger-light">✗ falla</span>}
            </div>
            {c.verificado_at && (
              <p className="text-[11px] text-text-3">
                Última comprobación: {new Date(c.verificado_at).toLocaleString('es-CO')}
              </p>
            )}
            {c.verificado_error && (
              <p className="text-xs text-danger-light">{c.verificado_error}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={probar} disabled={probando} className="btn-secondary btn-sm">
                {probando ? <Spinner size="sm" /> : 'Probar de nuevo'}
              </button>
              <button onClick={desconectar} className="btn-secondary btn-sm text-danger-light">Desconectar</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="field">
              <label className="label text-xs">Llave de API</label>
              <input type="password" value={llave} onChange={e => setLlave(e.target.value)}
                placeholder="sk-ant-..." autoComplete="off"
                className="input rounded-xl py-2.5 text-sm font-mono" />
            </div>
            <button onClick={guardar} disabled={guardando || !llave.trim()} className="btn-primary btn-sm">
              {guardando ? <><Spinner size="sm" /> Comprobando…</> : 'Conectar'}
            </button>
            <p className="text-[11px] text-text-3">
              Se comprueba contra Anthropic antes de guardarla, y se guarda cifrada. No se vuelve a
              mostrar: si la pierdes, genera otra allá.
            </p>
          </div>
        )}
      </div>

      {/* ── 2 · GESTEK dentro de Claude ── */}
      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-1">GESTEK dentro de Claude</h3>
          <p className="text-xs text-text-3 mt-1 leading-relaxed">
            Conecta GESTEK como un conector en Claude y podrás pedirle las cosas desde ahí, sin entrar
            al panel: <em>«móntame el evento de septiembre, con una boleta general a 50 mil y una VIP
            a 120»</em>. Son las mismas herramientas del asistente — crear y publicar eventos, boletas,
            asistentes, agenda y equipo.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-2/40 px-4 py-3 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1">1 · La dirección</p>
            <code className="text-xs text-text-1 break-all">{URL_API}/mcp</code>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1">2 · Tu token</p>
            {tokenNuevo ? (
              <div className="space-y-1.5">
                <code className="block text-xs text-text-1 break-all bg-bg/60 rounded-lg px-3 py-2">{tokenNuevo}</code>
                <p className="text-[11px] text-warning-light">
                  Cópialo ahora: no se vuelve a mostrar. Sólo guardamos su huella.
                </p>
              </div>
            ) : (
              <button onClick={crearToken} disabled={creando} className="btn-secondary btn-sm">
                {creando ? <Spinner size="sm" /> : 'Generar un token'}
              </button>
            )}
            {tokens.length > 0 && (
              <p className="text-[11px] text-text-3 mt-1.5">
                Tienes {tokens.length} token{tokens.length === 1 ? '' : 's'} activo{tokens.length === 1 ? '' : 's'}.
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1">3 · En Claude</p>
            <p className="text-xs text-text-2 leading-relaxed">
              Añade un conector con esa dirección y pon el token en la cabecera{' '}
              <code className="text-[11px]">Authorization: Bearer …</code>.
            </p>
          </div>
        </div>

        <p className="text-[11px] text-text-3 leading-relaxed">
          El token vale por tu cuenta entera, así que Claude sólo verá y tocará tus eventos. Trátalo
          como una contraseña: quien lo tenga puede crear y publicar en tu nombre. Si se te escapa,
          revócalo en Integraciones y genera otro.
        </p>
      </div>
    </div>
  );
}
