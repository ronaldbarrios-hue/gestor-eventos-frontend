import { useEffect, useState } from 'react';
import { conexionesApi } from '../../api/conexiones.js';
import { integracionesApi } from '../../api/integraciones.js';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/* Conectar Claude — dos cosas distintas, y conviene no confundirlas.

   1. TU LLAVE. El asistente del panel corría con la cuenta de la plataforma:
      cada organizador que lo usara costaba dinero a GESTEK, que no escala.
      Aquí cada quien pega la suya y paga su consumo, igual que conecta su
      cuenta de Mercado Pago.

   2. GESTEK DENTRO DE CLAUDE. Un conector, y Claude puede operar la cuenta
      desde fuera del panel: «móntame el evento de septiembre».

   El camino normal del segundo es pegar UNA URL: el OAuth se encarga del
   resto y no hay token que copiar ni que se pueda filtrar. El token queda como
   plan B para Claude Code y Claude Desktop, que sí dejan poner una cabecera a
   mano y donde el conector de la web no aplica. Va replegado a propósito: si se
   ofrecen los dos caminos al mismo nivel, la mitad de la gente elige el que
   deja una credencial pegada en un archivo. */

const URL_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function ConectarClaude() {
  const { success, error: toastErr } = useToast();

  const [estado, setEstado] = useState(null);
  const [llave, setLlave] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);

  const [conexiones, setConexiones] = useState([]);
  const [verAvanzado, setVerAvanzado] = useState(false);
  const [tokenNuevo, setTokenNuevo] = useState(null);
  const [creando, setCreando] = useState(false);
  const [copiado, setCopiado] = useState('');

  const cargar = () => {
    conexionesApi.verIA().then(setEstado)
      .catch(e => { toastErr(e.message); setEstado({ disponible: false }); });
    conexionesApi.verMCP().then(d => setConexiones(d.conexiones || [])).catch(() => setConexiones([]));
  };
  useEffect(cargar, []); // eslint-disable-line

  const copiar = async (texto, cual) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      setTimeout(() => setCopiado(''), 1800);
    } catch { toastErr('No se pudo copiar. Selecciónalo a mano.'); }
  };

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

  const desconectarIA = async () => {
    try { const r = await conexionesApi.borrarIA(); success(r.aviso || 'Desconectada.'); cargar(); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const cortar = async (id) => {
    try { const r = await conexionesApi.cortarMCP(id); success(r.aviso || 'Conexión cortada.'); cargar(); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const crearToken = async () => {
    setCreando(true);
    try {
      const r = await integracionesApi.crearToken('Claude (MCP)');
      setTokenNuevo(r.token || r.raw || null);
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

        {/* El servidor dice POR QUÉ no está lista, no sólo que no lo está.
            Decir «falta SMTP_CRYPTO_KEY» cuando la variable sí está puesta pero
            mal —pegada dos veces, con un espacio— manda a buscar al sitio
            equivocado. */}
        {estado.cifrado_listo === false && (
          <Aviso tono="danger">
            No se puede guardar una llave de forma segura: el servidor no tiene el cifrado de
            secretos en condiciones.
            {estado.cifrado?.mensaje && (
              <span className="block mt-1.5 text-text-2">{estado.cifrado.mensaje}</span>
            )}
            {estado.cifrado?.arreglo && (
              <span className="block mt-1 text-[11px] text-text-3">{estado.cifrado.arreglo}</span>
            )}
            {!estado.cifrado && <> Falta <code>SMTP_CRYPTO_KEY</code>.</>}
          </Aviso>
        )}
        {estado.disponible === false && (
          <Aviso tono="warning">Falta aplicar la migración 0072 en la base de datos.</Aviso>
        )}

        {conectada ? (
          <div className="rounded-2xl border border-border bg-surface-2/40 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-text-1">{c.pista}</span>
              {c.verificado_ok === true && <Pastilla tono="success">comprobada</Pastilla>}
              {c.verificado_ok === false && <Pastilla tono="danger">falla</Pastilla>}
            </div>
            {c.verificado_at && (
              <p className="text-[11px] text-text-3">
                Última comprobación: {new Date(c.verificado_at).toLocaleString('es-CO')}
              </p>
            )}
            {c.verificado_error && <p className="text-xs text-danger-light">{c.verificado_error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={probar} disabled={probando} className="btn-secondary btn-sm">
                {probando ? <Spinner size="sm" /> : 'Probar de nuevo'}
              </button>
              <button onClick={desconectarIA} className="btn-secondary btn-sm text-danger-light">Desconectar</button>
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
            Añádelo como conector en Claude y podrás pedirle las cosas desde ahí, sin entrar al
            panel: <em>«móntame el evento de septiembre, con una boleta general a 50 mil y una VIP
            a 120»</em>. Son las mismas herramientas del asistente.
          </p>
        </div>

        {/* El camino normal: una URL y aprobar. */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-4 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] uppercase tracking-widest text-primary-light font-semibold">
              Pega esta dirección en Claude
            </span>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <code className="flex-1 min-w-0 text-xs text-text-1 break-all bg-bg/60 rounded-lg px-3 py-2">
              {URL_API}/mcp
            </code>
            <button onClick={() => copiar(`${URL_API}/mcp`, 'url')} className="btn-secondary btn-sm shrink-0">
              {copiado === 'url' ? '✓ Copiada' : 'Copiar'}
            </button>
          </div>

          <ol className="space-y-1.5 text-xs text-text-2">
            <li><strong className="text-text-1">1.</strong> En Claude, añade un conector personalizado con esa dirección.</li>
            <li><strong className="text-text-1">2.</strong> Claude te traerá aquí para pedirte permiso.</li>
            <li><strong className="text-text-1">3.</strong> Apruebas, y ya está.</li>
          </ol>

          <p className="text-[11px] text-text-3 leading-relaxed">
            No hay token que copiar ni contraseña que compartir: Claude recibe un permiso que puedes
            cortar desde aquí cuando quieras.
          </p>
        </div>

        {/* Conexiones vivas, con su botón de cortar. */}
        {conexiones.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">
              Conectado ahora
            </p>
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {conexiones.map(cx => (
                <div key={cx.id} className="px-3 py-2.5 flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-text-1 flex-1 min-w-0 truncate">
                    {cx.oauth_clients?.nombre || cx.client_id}
                  </span>
                  <span className="text-[11px] text-text-3">
                    {cx.ultimo_uso_at
                      ? `usado ${new Date(cx.ultimo_uso_at).toLocaleDateString('es-CO')}`
                      : 'sin usar todavía'}
                  </span>
                  <button onClick={() => cortar(cx.id)}
                    className="text-[11px] text-danger-light hover:underline shrink-0">Cortar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan B, replegado. */}
        <div>
          <button onClick={() => setVerAvanzado(v => !v)}
            className="text-[11px] text-text-3 hover:text-text-2 underline">
            {verAvanzado ? 'Ocultar' : 'Conectar desde Claude Code o Claude Desktop'}
          </button>

          {verAvanzado && (
            <div className="mt-3 rounded-2xl border border-border bg-surface-2/40 px-4 py-3 space-y-3">
              <p className="text-xs text-text-2 leading-relaxed">
                Esos dos no usan el conector de la web: se les pone la cabecera a mano, y para eso
                hace falta un token.
              </p>

              {tokenNuevo ? (
                <div className="space-y-1.5">
                  <div className="flex gap-2 items-center flex-wrap">
                    <code className="flex-1 min-w-0 text-xs text-text-1 break-all bg-bg/60 rounded-lg px-3 py-2">
                      {tokenNuevo}
                    </code>
                    <button onClick={() => copiar(tokenNuevo, 'tok')} className="btn-secondary btn-sm shrink-0">
                      {copiado === 'tok' ? '✓' : 'Copiar'}
                    </button>
                  </div>
                  <p className="text-[11px] text-warning-light">
                    Cópialo ahora: no se vuelve a mostrar. Sólo guardamos su huella.
                  </p>
                  <p className="text-[11px] text-text-3">Después, en tu terminal:</p>
                  <code className="block text-[11px] text-text-2 break-all bg-bg/60 rounded-lg px-3 py-2">
                    claude mcp add --transport http gestek {URL_API}/mcp --header &quot;Authorization: Bearer TU_TOKEN&quot;
                  </code>
                </div>
              ) : (
                <button onClick={crearToken} disabled={creando} className="btn-secondary btn-sm">
                  {creando ? <Spinner size="sm" /> : 'Generar un token'}
                </button>
              )}

              <p className="text-[11px] text-text-3 leading-relaxed">
                Un token vale por tu cuenta entera y no caduca: quien lo tenga puede crear y publicar
                en tu nombre. Trátalo como una contraseña, y si se te escapa revócalo abajo en
                Integraciones.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Aviso({ tono, children }) {
  const cls = tono === 'danger'
    ? 'text-danger-light bg-danger/10'
    : 'text-warning-light bg-warning/10';
  return <p className={`text-xs rounded-xl px-3 py-2 ${cls}`}>{children}</p>;
}

function Pastilla({ tono, children }) {
  const cls = tono === 'success' ? 'text-success' : 'text-danger-light';
  return <span className={`text-xs ${cls}`}>{tono === 'success' ? '✓' : '✗'} {children}</span>;
}
