import { useState, useEffect } from 'react';
import { integracionesApi } from '../../../api/integraciones.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';

/* Configuración · Integraciones — conexiones externas de la cuenta.
   Google Calendar (OAuth) aquí; Mercado Pago y Wompi viven en Comercial → Pagos. */
export default function IntegracionesSection() {
  const { success, error } = useToast();
  const [google, setGoogle] = useState(null);
  const [working, setWorking] = useState(false);

  const cargar = async () => {
    try { setGoogle(await integracionesApi.googleEstado()); }
    catch (e) { error(e.response?.data?.error || e.message); }
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  const conectar = async () => {
    setWorking(true);
    try {
      const d = await integracionesApi.googleConectar();
      if (d.url) window.location.href = d.url;
    } catch (e) { error(e.response?.data?.error || e.message); setWorking(false); }
  };

  const desconectar = async () => {
    if (!(await confirmDialog({ title: 'Desconectar Google Calendar', message: '¿Desconectar tu Google Calendar? Las entrevistas dejarán de agendarse en tu calendario.', confirmLabel: 'Desconectar', danger: true }))) return;
    try { await integracionesApi.googleDesconectar(); success('Google Calendar desconectado.'); cargar(); }
    catch (e) { error(e.response?.data?.error || e.message); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Integraciones</h2>
        <p className="text-sm text-text-2 mt-1">Conecta servicios externos a tu cuenta. Mercado Pago y Wompi se conectan en <b>Comercial → Pagos</b>.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="text-base font-semibold text-text-1">Google Calendar</h3>
            <p className="text-xs text-text-3 mt-0.5">Agenda las entrevistas de vacantes en tu calendario, con invitación al candidato.</p>
          </div>
          {google?.conectado
            ? <span className="badge badge-green">Conectado</span>
            : <span className="badge badge-gray">Sin conectar</span>}
        </div>
        <div className="card-body space-y-3">
          {!google ? (
            <div className="flex justify-center py-3"><Spinner size="md" /></div>
          ) : !google.disponible ? (
            <p className="text-sm text-text-3 bg-surface-2 rounded-2xl p-4 border border-border">Google Calendar aún no está habilitado en la plataforma. Se activa cuando se configuren las credenciales de Google (requiere verificación de la app por Google).</p>
          ) : google.conectado ? (
            <div className="bg-surface-2 rounded-2xl p-4 border border-border space-y-2">
              <div className="flex items-center justify-between gap-4"><span className="text-xs text-text-3">Cuenta</span><span className="text-sm text-text-1">{google.email || '—'}</span></div>
              <div className="flex items-center justify-between gap-4"><span className="text-xs text-text-3">Conectado el</span><span className="text-sm text-text-1">{google.connected_at ? new Date(google.connected_at).toLocaleString('es-CO') : '—'}</span></div>
              <div className="pt-2"><button onClick={desconectar} className="btn-ghost btn-sm text-danger/80 hover:text-danger">Desconectar</button></div>
            </div>
          ) : (
            <button onClick={conectar} disabled={working} className="btn-gradient">
              {working ? <><Spinner size="sm" /> Redirigiendo…</> : 'Conectar Google Calendar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
