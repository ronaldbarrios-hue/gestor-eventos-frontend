import { useEffect, useState, useRef, useCallback } from 'react';
import Icono from '../../../components/ui/Iconos.jsx';
import QrScanner from '../../../components/ui/QrScanner.jsx';
import { clientesApi } from '../../../api/clientes.js';
import { agendaApi } from '../../../api/agenda.js';
import { useToast } from '../../../context/ToastContext.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import { useAsistenciaEnVivo } from '../../../hooks/useAsistenciaEnVivo.js';
import AsistenciaContador from '../../../components/ui/AsistenciaContador.jsx';
import { encolar, leerCola, quitar, cantidadCola } from '../../../lib/checkinOffline.js';
import { leerQr } from '../../../lib/qrEscaneado.js';

/* Tab Check-in — escanea boletas con cámara o ingresa código manual.

   Tres modos, y la diferencia entre ellos es la que sostiene todo el reporte:

   · Check-in   → la persona ENTRA AL EVENTO. Suma al ingreso del recinto y a
                  nada más. Invalida la boleta para una segunda entrada.
   · Reingreso  → sale y vuelve a entrar, o cruza una zona. Mueve el aforo, no
                  la asistencia.
   · Sub-evento → la persona entra a UN taller, charla o competencia concreta.
                  Es lo único que suma a las métricas de ese sub-evento, y pide
                  que esté inscrita en él: haber entrado al evento no significa
                  haber asistido a la charla, y contarlo así convertiría
                  "asistentes al taller" en "gente que estaba en el edificio".

   Quien no esté inscrito no se marca a la fuerza: se registra primero y se
   vuelve a escanear. */

export default function CheckinTab({ evento }) {
  const [mode, setMode]       = useState('manual'); // manual | camara
  const [accion, setAccion]   = useState('checkin'); // checkin | reingreso | subevento
  const [working, setWorking] = useState(false);
  const [last, setLast]       = useState(null); // { ok, ticket, error, sound }
  const [historial, setHistorial] = useState([]); // últimos check-ins de esta sesión
  const { error: toastErr } = useToast();

  /* Puertas configuradas (page_json.accesos). El escáner recuerda la suya en
     localStorage; se envía en cada check-in para validar y registrar. */
  const accesos = Array.isArray(evento.page_json?.accesos) ? evento.page_json.accesos : [];
  const [puertaId, setPuertaId] = useState(() => {
    try { return localStorage.getItem(`gestek-puerta:${evento.id}`) || ''; } catch { return ''; }
  });
  const puertaRef = useRef(puertaId);
  const elegirPuerta = (id) => {
    setPuertaId(id); puertaRef.current = id;
    try { localStorage.setItem(`gestek-puerta:${evento.id}`, id); } catch { /* noop */ }
  };

  /* Zonas (page_json.zonas) — solo aplican en modo Reingreso, para el aforo por zona. */
  const zonas = Array.isArray(evento.page_json?.zonas) ? evento.page_json.zonas : [];
  const [zonaId, setZonaId] = useState('');
  const zonaRef = useRef('');
  const elegirZona = (id) => { setZonaId(id); zonaRef.current = id; };

  /* Sub-eventos: se piden sólo cuando hace falta (el escáner de la puerta
     principal no los necesita) y se recuerda cuál opera este dispositivo, que
     en un taller es siempre el mismo durante horas. */
  const [sesiones, setSesiones] = useState(null);
  const [sesionId, setSesionId] = useState(() => {
    try { return localStorage.getItem(`gestek-subevento:${evento.id}`) || ''; } catch { return ''; }
  });
  const sesionRef = useRef(sesionId);
  const elegirSesion = (id) => {
    setSesionId(id); sesionRef.current = id; setLast(null);
    try { localStorage.setItem(`gestek-subevento:${evento.id}`, id); } catch { /* noop */ }
  };
  useEffect(() => {
    if (accion !== 'subevento' || sesiones !== null) return;
    agendaApi.sessions(evento.id)
      .then(d => {
        const lista = (d.sessions || d.sesiones || []).filter(x => x.requiere_inscripcion);
        setSesiones(lista);
        /* Si la guardada ya no existe (la borraron), no dejar el escáner
           apuntando a un sub-evento fantasma. */
        if (sesionRef.current && !lista.some(x => x.id === sesionRef.current)) elegirSesion('');
        else if (!sesionRef.current && lista.length === 1) elegirSesion(lista[0].id);
      })
      .catch(() => setSesiones([]));
    /* eslint-disable-next-line */
  }, [accion, evento.id, sesiones]);

  const { ingresados, total: totalAsistentes, bumpOptimista } = useAsistenciaEnVivo(evento.id);

  /* Estado de conexión + cola offline. */
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [cola, setCola] = useState(() => cantidadCola(evento.id));
  const [sincronizando, setSincronizando] = useState(false);

  const handleCheckin = useCallback(async (payload) => {
    if (working) return;
    /* Sin conexión → guardar en la cola offline (optimista). */
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const n = encolar(evento.id, { ...payload, acceso_id: puertaRef.current || undefined });
      setCola(n);
      setLast({ ok: true, offlineGuardado: true });
      return;
    }
    setWorking(true);
    setLast(null);
    try {
      const r = await clientesApi.checkin(evento.id, { ...payload, acceso_id: puertaRef.current || undefined });
      setLast({ ok: true, ...r });
      setHistorial(h => [{ ...r.ticket, at: new Date(), ok: true }, ...h].slice(0, 10));
      bumpOptimista();
    } catch (e) {
      /* Error de RED (sin respuesta del servidor) → encolar, no perder el escaneo. */
      if (!e.response) {
        const n = encolar(evento.id, { ...payload, acceso_id: puertaRef.current || undefined });
        setCola(n);
        setLast({ ok: true, offlineGuardado: true });
      } else {
        const detail = e.response?.data || {};
        setLast({ ok: false, error: e.message, ...detail });
        if (detail.ticket) {
          setHistorial(h => [{ ...detail.ticket, at: new Date(), ok: false, error: e.message }, ...h].slice(0, 10));
        }
      }
    } finally {
      setTimeout(() => setWorking(false), 600);
    }
  }, [evento.id, working, bumpOptimista]);

  /* Sincroniza la cola offline contra el servidor. */
  const sincronizar = useCallback(async () => {
    if (sincronizando) return;
    const pend = leerCola(evento.id);
    if (!pend.length) return;
    setSincronizando(true);
    let ok = 0, fallidas = 0;
    for (const item of pend) {
      try {
        const { offline_id, ...payload } = item;
        await clientesApi.checkin(evento.id, payload);  // payload incluye `at` (hora real) y acceso_id
        quitar(evento.id, offline_id);
        ok++;
      } catch (e) {
        if (e.response) { quitar(evento.id, item.offline_id); fallidas++; }  // el server la rechazó (ya usada/ inválida): se descarta
        /* sin respuesta = sigue sin red: se deja en la cola para el próximo intento */
      }
    }
    setCola(cantidadCola(evento.id));
    setSincronizando(false);
    if (ok || fallidas) {
      setLast({ ok: true, syncResumen: { ok, fallidas } });
      bumpOptimista();
    }
  }, [evento.id, sincronizando, bumpOptimista]);

  /* Detecta cambios de conexión; al volver, sincroniza solo. */
  useEffect(() => {
    const irOnline = () => { setOnline(true); sincronizar(); };
    const irOffline = () => setOnline(false);
    window.addEventListener('online', irOnline);
    window.addEventListener('offline', irOffline);
    return () => { window.removeEventListener('online', irOnline); window.removeEventListener('offline', irOffline); };
  }, [sincronizar]);

  const handleReingreso = useCallback(async (payload) => {
    if (working) return;
    setWorking(true);
    setLast(null);
    try {
      const r = await clientesApi.reingreso(evento.id, { ...payload, acceso_id: puertaRef.current || undefined, zona_id: zonaRef.current || undefined });
      /* `aforo` viene con la zona ya recalculada: quien está en la puerta ve el
         número después de ESTE escaneo sin cambiar de pantalla. */
      setLast({ reingresoMode: true, ok: true, dentro: r.dentro, ticket: r.ticket, aforo: r.aforo });
      setHistorial(h => [{ guest_nombre: r.ticket?.nombre, codigo: r.ticket?.codigo, at: new Date(), ok: true, reingreso: r.dentro ? 'entró' : 'salió' }, ...h].slice(0, 10));
    } catch (e) {
      setLast({ reingresoMode: true, ok: false, error: e.response?.data?.error || e.message });
    } finally {
      setTimeout(() => setWorking(false), 600);
    }
  }, [evento.id, working]);

  const handleSubevento = useCallback(async (payload) => {
    if (working) return;
    const sid = sesionRef.current;
    if (!sid) { setLast({ subeventoMode: true, ok: false, error: 'Elige primero a qué sub-evento estás marcando.' }); return; }
    setWorking(true);
    setLast(null);
    try {
      const r = await agendaApi.marcarAsistencia(evento.id, sid, payload);
      const nombre = r.inscripcion?.nombre || null;
      setLast({ subeventoMode: true, ok: true, yaMarcada: r.ya_marcada, nombre, conteo: r.conteo });
      setHistorial(h => [{
        guest_nombre: nombre, codigo: r.ticket?.codigo, at: new Date(), ok: true,
        subevento: r.ya_marcada ? 'ya estaba' : 'asistió',
      }, ...h].slice(0, 10));
    } catch (e) {
      const d = e.response?.data || {};
      setLast({
        subeventoMode: true, ok: false,
        error: d.error || e.message,
        noInscrito: Boolean(d.no_inscrito),
        ticket: d.ticket || null,
      });
    } finally {
      setTimeout(() => setWorking(false), 600);
    }
  }, [evento.id, working]);

  /* onScan estable (misma identidad siempre): QrScanner la guarda en un ref
     internamente, así que no importa si esta función cambia — no reinicia la cámara. */
  const onScanQr = useCallback((qr) => {
    const leido = leerQr(qr);
    if (accion === 'subevento') return handleSubevento(leido);
    if (accion === 'reingreso') return handleReingreso(leido);
    return handleCheckin(leido);
  }, [accion, handleCheckin, handleReingreso, handleSubevento]);
  const onSubmitCodigo = (codigo) =>
    (accion === 'subevento' ? handleSubevento({ codigo })
      : accion === 'reingreso' ? handleReingreso({ codigo })
      : handleCheckin({ codigo }));

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Check-in</h2>
          <p className="text-sm text-text-2 mt-1">Escanea el QR de cada asistente o ingresa el código manualmente.</p>
          {accesos.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-text-3">Tu puerta:</span>
              <select value={puertaId} onChange={e => elegirPuerta(e.target.value)}
                className="input !h-8 !py-1 text-sm w-auto">
                <option value="">Sin especificar</option>
                {accesos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AsistenciaContador ingresados={ingresados} total={totalAsistentes} compact />
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1">
            {[['checkin', 'Check-in'], ['reingreso', 'Reingreso'], ['subevento', 'Sub-evento']].map(([k, l]) => (
              <button key={k} onClick={() => { setAccion(k); setLast(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${accion === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
                {l}
              </button>
            ))}
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
      </div>

      {(!online || cola > 0) && (
        <div className={`rounded-2xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 ${online ? 'border-warning/40 bg-warning/10' : 'border-danger/40 bg-danger/10'}`}>
          <p className="text-xs text-text-2">
            {!online
              ? <><b className="text-text-1">Sin conexión.</b> Los check-ins se guardan y se sincronizan solos al reconectar.</>
              : <><b className="text-text-1">{cola}</b> escaneo{cola !== 1 ? 's' : ''} sin sincronizar.</>}
          </p>
          {cola > 0 && online && (
            <button onClick={sincronizar} disabled={sincronizando} className="btn-secondary btn-sm flex-shrink-0">
              {sincronizando ? 'Sincronizando…' : `Sincronizar ${cola}`}
            </button>
          )}
        </div>
      )}

      {accion === 'reingreso' && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-text-2">Modo <b className="text-text-1">reingreso</b>: al escanear se alterna entre <b>salida</b> y <b>entrada</b> sin invalidar la boleta.{zonas.length > 0 ? ' Elige una zona para el aforo por zona.' : ''}</p>
          {zonas.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-3">Zona:</span>
              <select value={zonaId} onChange={e => elegirZona(e.target.value)} className="input !h-8 !py-1 text-sm w-auto">
                <option value="">Recinto (general)</option>
                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {accion === 'subevento' && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 px-4 py-2.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-text-2">
              Modo <b className="text-text-1">sub-evento</b>: esto suma a las métricas del taller o charla que elijas, no al ingreso del evento.
            </p>
            {sesiones && sesiones.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-3">Sub-evento:</span>
                <select value={sesionId} onChange={e => elegirSesion(e.target.value)} className="input !h-8 !py-1 text-sm w-auto max-w-[260px]">
                  <option value="">Elige uno…</option>
                  {sesiones.map(x => (
                    <option key={x.id} value={x.id}>
                      {x.titulo}{x.inicio ? ` · ${new Date(x.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {sesiones === null
            ? <p className="text-[11px] text-text-3">Cargando sub-eventos…</p>
            : sesiones.length === 0
              ? <p className="text-[11px] text-warning">
                  Ningún sub-evento pide inscripción todavía. Actívala en <b>Espacio del evento → Calendario</b>: sin inscripción no hay a quién marcarle asistencia.
                </p>
              : <p className="text-[11px] text-text-3">
                  La persona tiene que estar inscrita en este sub-evento. Si no lo está, se registra primero y se vuelve a escanear.
                </p>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Scanner / input */}
        <div className="space-y-4">
          {mode === 'camara'
            ? <QrScanner onScan={onScanQr} overlay={last ? <TarjetaResultado result={last} compact /> : null} />
            : <ManualInput onSubmit={onSubmitCodigo} disabled={working} />
          }

          {/* Resultado del último scan (solo se muestra aquí fuera de pantalla completa,
              ya que en modo cámara el resultado aparece flotando sobre el video) */}
          {mode !== 'camara' && last && <TarjetaResultado result={last} />}
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

/* ─────────── Resultado del último scan ─────────── */

function ResultadoCard({ result, compact }) {
  if (result.offlineGuardado) return (
    <div className={`rounded-3xl border-2 border-primary/40 ${compact ? 'backdrop-blur-xl bg-surface/90 p-5' : 'bg-primary/10 p-6'} animate-[fadeUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">⤓</div>
        <div><h3 className="text-xl font-bold font-display text-text-1">Guardado sin conexión</h3><p className="text-sm text-text-2">Se registrará al volver el internet.</p></div>
      </div>
    </div>
  );
  if (result.syncResumen) return (
    <div className={`rounded-3xl border-2 border-success/40 ${compact ? 'backdrop-blur-xl bg-surface/90 p-5' : 'bg-success/10 p-6'} animate-[fadeUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-success text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">✓</div>
        <div><h3 className="text-xl font-bold font-display text-text-1">Sincronizado</h3><p className="text-sm text-text-2">{result.syncResumen.ok} registrados{result.syncResumen.fallidas ? ` · ${result.syncResumen.fallidas} rechazados (ya usados o inválidos)` : ''}.</p></div>
      </div>
    </div>
  );
  const ok = result.ok && !result.ya_usada;
  const yaUsada = result.ya_usada;
  const cls = ok
    ? 'border-success/40 bg-success/10'
    : yaUsada
      ? 'border-warning/40 bg-warning/10'
      : 'border-danger/40 bg-danger/10';
  const icon = ok ? '✓' : yaUsada ? '!' : '✕';
  const iconCls = ok ? 'bg-success text-white' : yaUsada ? 'bg-warning text-white' : 'bg-danger text-white';
  const title = ok
    ? '¡Bienvenido!'
    : yaUsada
      ? 'Boleta ya usada'
      : 'Boleta no válida';

  const ticket = result.ticket;

  return (
    <div className={`rounded-3xl border-2 ${cls} ${compact ? 'backdrop-blur-xl bg-surface/90 p-5' : 'p-6'} animate-[fadeUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]`}>
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

/* Una sola puerta para pintar el resultado: antes cada sitio decidía por su
   cuenta qué tarjeta tocaba, y añadir un tercer modo significaba acordarse de
   los dos. */
function TarjetaResultado({ result, compact }) {
  if (result.subeventoMode) return <SubeventoCard result={result} compact={compact} />;
  if (result.reingresoMode) return <ReingresoCard result={result} compact={compact} />;
  return <ResultadoCard result={result} compact={compact} />;
}

/* ─────────── Resultado de asistencia a un sub-evento ─────────── */

function SubeventoCard({ result, compact }) {
  const { ok, yaMarcada, nombre, conteo, noInscrito, ticket, error } = result;
  const cls = !ok ? (noInscrito ? 'border-warning/40 bg-warning/10' : 'border-danger/40 bg-danger/10')
    : yaMarcada ? 'border-warning/40 bg-warning/10' : 'border-success/40 bg-success/10';
  const icon = !ok ? (noInscrito ? '!' : '✕') : yaMarcada ? '=' : '✓';
  const iconCls = !ok ? (noInscrito ? 'bg-warning text-white' : 'bg-danger text-white')
    : yaMarcada ? 'bg-warning text-white' : 'bg-success text-white';
  const titulo = !ok ? (noInscrito ? 'No está inscrito' : 'No se pudo marcar')
    : yaMarcada ? 'Ya estaba marcada' : 'Asistencia marcada';

  return (
    <div className={`rounded-3xl border-2 ${cls} ${compact ? 'backdrop-blur-xl bg-surface/90 p-5' : 'p-6'} animate-[fadeUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${iconCls}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold font-display text-text-1 mb-1">{titulo}</h3>
          {nombre && <p className="text-base font-medium text-text-1">{nombre}</p>}
          {ticket && (
            <p className="text-sm text-text-1">
              {ticket.nombre || 'Asistente'}
              {ticket.codigo && <span className="text-xs text-text-3"> · <span className="font-mono">{ticket.codigo}</span></span>}
            </p>
          )}
          {error && <p className="text-sm text-text-2 mt-1">{error}</p>}
          {noInscrito && (
            <p className="text-xs text-text-3 mt-2">
              Entrar al evento no cuenta como asistir a este sub-evento. Regístrala en él y vuelve a escanear.
            </p>
          )}
          {conteo && (
            <p className="text-sm font-semibold text-success mt-2 tabular-nums">
              {conteo.asistieron} de {conteo.inscritos} inscritos ya entraron
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Resultado de reingreso ─────────── */

function ReingresoCard({ result, compact }) {
  const ok = result.ok;
  const dentro = result.dentro;
  const cls = !ok ? 'border-danger/40 bg-danger/10' : dentro ? 'border-success/40 bg-success/10' : 'border-warning/40 bg-warning/10';
  const icon = !ok ? '✕' : dentro ? '↳' : '↰';
  const iconCls = !ok ? 'bg-danger text-white' : dentro ? 'bg-success text-white' : 'bg-warning text-white';
  const title = !ok ? 'No se pudo registrar' : dentro ? 'Reingreso registrado' : 'Salida registrada';
  const ticket = result.ticket;
  return (
    <div className={`rounded-3xl border-2 ${cls} ${compact ? 'backdrop-blur-xl bg-surface/90 p-5' : 'p-6'} animate-[fadeUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${iconCls}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold font-display text-text-1 mb-1">{title}</h3>
          {result.error && <p className="text-sm text-text-2">{result.error}</p>}
          {ticket && (
            <div className="mt-2">
              <p className="text-base font-medium text-text-1">{ticket.nombre || 'Asistente'}</p>
              <p className="text-xs text-text-3">{ticket.tipo} · <span className="font-mono">{ticket.codigo}</span></p>
              {ok && <p className={`text-sm font-semibold mt-2 ${dentro ? 'text-success' : 'text-warning'}`}>{dentro ? 'Ahora está DENTRO' : 'Ahora está FUERA'}</p>}
              {ok && result.aforo && (
                <p className="text-xs text-text-2 mt-1">
                  {result.aforo.nombre}: <b className="tabular-nums text-text-1">{result.aforo.dentro}</b>
                  {result.aforo.aforo_max ? ` / ${result.aforo.aforo_max}` : ''}
                  {result.aforo.excedido > 0 && <span className="text-danger"> · {result.aforo.excedido} por encima del aforo</span>}
                </p>
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
        <p className="text-[11px] text-text-3 truncate font-mono">{item.codigo}{item.reingreso ? ` · ${item.reingreso}` : ''}{item.subevento ? ` · ${item.subevento}` : ''}{item.error ? ` · ${item.error}` : ''}</p>
      </div>
      <span className="text-[11px] text-text-3 tabular-nums flex-shrink-0">{hora}</span>
    </div>
  );
}

