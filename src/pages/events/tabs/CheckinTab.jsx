import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { clientesApi } from '../../../api/clientes.js';
import { useToast } from '../../../context/ToastContext.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';

/* Tab Check-in — escanea boletas con cámara o ingresa código manual. */

export default function CheckinTab({ evento }) {
  const [mode, setMode]       = useState('manual'); // manual | camara
  const [working, setWorking] = useState(false);
  const [last, setLast]       = useState(null); // { ok, ticket, error, sound }
  const [historial, setHistorial] = useState([]); // últimos check-ins de esta sesión
  const { error: toastErr } = useToast();

  const handleCheckin = useCallback(async (payload) => {
    if (working) return;
    setWorking(true);
    setLast(null);
    try {
      const r = await clientesApi.checkin(evento.id, payload);
      setLast({ ok: true, ...r });
      setHistorial(h => [{ ...r.ticket, at: new Date(), ok: true }, ...h].slice(0, 10));
    } catch (e) {
      const detail = e.response?.data || {};
      setLast({ ok: false, error: e.message, ...detail });
      if (detail.ticket) {
        setHistorial(h => [{ ...detail.ticket, at: new Date(), ok: false, error: e.message }, ...h].slice(0, 10));
      }
    } finally {
      /* Pequeño cooldown para que el operador alcance a leer el resultado */
      setTimeout(() => setWorking(false), 600);
    }
  }, [evento.id, working]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Check-in</h2>
          <p className="text-sm text-text-2 mt-1">Escanea el QR de cada asistente o ingresa el código manualmente.</p>
        </div>
        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1">
          {[['manual', 'Código'], ['camara', 'Cámara']].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Scanner / input */}
        <div className="space-y-4">
          {mode === 'camara'
            ? <CameraScanner onScan={(qr) => handleCheckin({ qr_token: qr })} disabled={working} />
            : <ManualInput onSubmit={(codigo) => handleCheckin({ codigo })} disabled={working} />
          }

          {/* Resultado del último scan */}
          {last && <ResultadoCard result={last} />}
        </div>

        {/* Historial */}
        <aside className="rounded-3xl border border-border bg-surface/40 overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Recientes</p>
            <h3 className="text-base font-semibold text-text-1 mt-0.5">Esta sesión · {historial.length}</h3>
          </div>
          {historial.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-xs text-text-3">Aún no hay check-ins. Empieza escaneando una boleta.</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {historial.map((t, i) => (
                <HistorialRow key={i} item={t} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ─────────── Manual ─────────── */

function ManualInput({ onSubmit, disabled }) {
  const [codigo, setCodigo] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    onSubmit(codigo.trim().toUpperCase());
    setCodigo('');
  };
  return (
    <form onSubmit={submit} className="rounded-3xl border border-border bg-surface/40 p-6">
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-3">Ingresa el código de la boleta</p>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={codigo}
          onChange={e => setCodigo(e.target.value.toUpperCase())}
          placeholder="ABCD1234"
          className="input rounded-2xl py-4 text-2xl font-mono tracking-widest tabular-nums text-center flex-1"
          maxLength={12}
        />
        <button type="submit" disabled={disabled || codigo.length < 4}
          className="px-6 py-4 rounded-2xl bg-text-1 text-bg hover:bg-white text-sm font-semibold disabled:opacity-50 transition-all">
          Validar
        </button>
      </div>
    </form>
  );
}

/* ─────────── Cámara ─────────── */

function CameraScanner({ onScan, disabled }) {
  const containerId = 'qr-reader';
  const scannerRef = useRef(null);
  const [active, setActive] = useState(false);
  const [err, setErr] = useState('');
  const lastScanRef = useRef({ value: '', at: 0 });

  useEffect(() => {
    if (!active) return;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decoded) => {
        /* Dedupe: ignorar el mismo código dentro de 3 segundos */
        const now = Date.now();
        if (lastScanRef.current.value === decoded && now - lastScanRef.current.at < 3000) return;
        lastScanRef.current = { value: decoded, at: now };
        onScan(decoded);
      },
      () => { /* errores de scan silenciosos */ }
    ).catch(e => setErr(e.message || 'No se pudo iniciar la cámara.'));

    return () => {
      try { scanner.stop().then(() => scanner.clear()).catch(() => {}); } catch {}
    };
  }, [active, onScan]);

  if (err) return (
    <div className="rounded-3xl border border-danger/30 bg-danger/5 p-6 text-center">
      <p className="text-sm text-danger mb-3">{err}</p>
      <button onClick={() => { setErr(''); setActive(false); }} className="btn-secondary btn-sm">Reintentar</button>
    </div>
  );

  if (!active) return (
    <div className="rounded-3xl border border-border bg-surface/40 p-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-2 border border-border mb-4">
        <CameraIcon />
      </div>
      <h3 className="text-lg font-bold font-display text-text-1 mb-2">Activar cámara</h3>
      <p className="text-sm text-text-2 max-w-sm mx-auto mb-5">Apunta la cámara al QR del asistente. Tu navegador pedirá permisos la primera vez.</p>
      <button onClick={() => setActive(true)} className="btn-gradient">
        Activar cámara
      </button>
    </div>
  );

  return (
    <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
      <div id={containerId} className="w-full bg-black" />
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-text-2">Escaneando... apunta al QR</span>
        <button onClick={() => setActive(false)} className="btn-ghost btn-sm">Detener</button>
      </div>
    </div>
  );
}

/* ─────────── Resultado del último scan ─────────── */

function ResultadoCard({ result }) {
  const ok = result.ok && !result.ya_usada;
  const yaUsada = result.ya_usada;
  const cls = ok
    ? 'border-success/40 bg-success/10'
    : yaUsada
      ? 'border-warning/40 bg-warning/10'
      : 'border-danger/40 bg-danger/10';
  const icon = ok ? '✓' : yaUsada ? '⚠' : '✕';
  const iconCls = ok ? 'bg-success text-white' : yaUsada ? 'bg-warning text-white' : 'bg-danger text-white';
  const title = ok
    ? '¡Bienvenido!'
    : yaUsada
      ? 'Boleta ya usada'
      : 'Boleta no válida';

  const ticket = result.ticket;

  return (
    <div className={`rounded-3xl border-2 ${cls} p-6 animate-[fadeUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${iconCls}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold font-display text-text-1 mb-1">{title}</h3>
          {result.error && <p className="text-sm text-text-2">{result.error}</p>}
          {result.advertencia && <p className="text-sm text-warning mt-1">{result.advertencia}</p>}

          {ticket && (
            <div className="mt-3 space-y-1">
              <p className="text-base font-medium text-text-1">{ticket.guest_nombre || ticket.guest_email || 'Asistente'}</p>
              <p className="text-xs text-text-3">{ticket.tipo?.nombre || ticket.rol} · <span className="font-mono">{ticket.codigo}</span></p>
              {yaUsada && result.checked_in_at && (
                <p className="text-xs text-text-3 mt-2">Entrada registrada el {new Date(result.checked_in_at).toLocaleString('es-CO')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Historial ─────────── */

function HistorialRow({ item }) {
  const hora = item.at ? new Date(item.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
  return (
    <div className={`flex items-center gap-3 px-5 py-3 ${!item.ok ? 'opacity-70' : ''}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${item.ok ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
        {item.ok ? '✓' : '✕'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-1 truncate">{item.guest_nombre || item.guest_email || 'Sin nombre'}</p>
        <p className="text-[11px] text-text-3 truncate font-mono">{item.codigo}{item.error ? ` · ${item.error}` : ''}</p>
      </div>
      <span className="text-[11px] text-text-3 tabular-nums flex-shrink-0">{hora}</span>
    </div>
  );
}

function CameraIcon() {
  return <svg className="w-7 h-7 text-text-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>;
}
