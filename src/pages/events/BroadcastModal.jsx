import { useState } from 'react';
import { pushApi } from '../../api/push.js';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/* Modal para enviar push broadcast al equipo del evento. Requiere plan Pro. */

export default function BroadcastModal({ evento, onClose }) {
  const { success, error } = useToast();
  const [titulo, setTitulo]   = useState('');
  const [mensaje, setMensaje] = useState('');
  const [url, setUrl]         = useState('');
  const [working, setWorking] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !mensaje.trim()) return;
    setWorking(true);
    try {
      const r = await pushApi.broadcast(evento.id, { titulo, mensaje, url });
      if (r.sin_subs) {
        error('Nadie del equipo tiene notificaciones activadas en su navegador.');
      } else {
        success(`Push enviado a ${r.enviadas} dispositivo${r.enviadas === 1 ? '' : 's'} (${r.destinatarios} miembro${r.destinatarios === 1 ? '' : 's'}).`);
        onClose();
      }
    } catch (e) {
      if (e.response?.status === 402) {
        error(e.response?.data?.error || 'Plan Pro requerido.');
      } else {
        error(e.response?.data?.error || e.message);
      }
    } finally { setWorking(false); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[88vh] overflow-y-auto animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-surface px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">Notificación push</p>
            <h2 className="text-xl font-bold font-display tracking-tight text-text-1">Avisar al equipo del evento</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-text-2 leading-relaxed">
            Llega a vos y a los miembros activos del equipo que hayan activado notificaciones desde su Configuración. <strong className="text-text-1">Requiere plan Pro.</strong>
          </div>

          <div className="field">
            <label className="label">Título *</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder={`Aviso para ${evento.titulo}`} required maxLength={80}
              className="input rounded-2xl py-3 text-base font-medium" />
          </div>

          <div className="field">
            <label className="label">Mensaje *</label>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)}
              placeholder="¿Qué querés contarles?" rows={3} required maxLength={300}
              className="input rounded-2xl py-3 text-base resize-none" />
            <p className="text-xs text-text-3 mt-1 tabular-nums">{mensaje.length} / 300</p>
          </div>

          <div className="field">
            <label className="label">Link al hacer click <span className="text-text-3 font-normal lowercase">(opcional)</span></label>
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder={`/eventos/${evento.id}`}
              className="input rounded-2xl py-3 text-base font-mono" />
            <p className="text-xs text-text-3 mt-1">Por defecto abre la página del evento.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost btn-sm">Cancelar</button>
            <button type="submit" disabled={working || !titulo.trim() || !mensaje.trim()} className="btn-gradient btn-sm">
              {working ? <><Spinner size="sm" /> Enviando...</> : 'Enviar notificación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
