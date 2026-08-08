/* Detalle de una vacante, en modal.

   Vive fuera de la página de vacantes porque ahora se abre desde dos
   sitios: la vitrina pública de Explorar y el panel interno. */

import { useEffect, useState } from 'react';
import { vacantesApi, formatoPago, ETAPAS_VACANTE } from '../../api/vacantes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

export default function DetalleVacante({ id, onClose, onPostulado }) {
  const { t } = useI18n();
  const { success, error: toastErr } = useToast();
  const [data, setData] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    vacantesApi.detalle(id).then(setData).catch(e => { toastErr(e.response?.data?.error || e.message); onClose(); });
  }, [id, onClose, toastErr]);

  const v = data?.vacante;
  const yaPostule = data?.mi_postulacion;
  const preguntas = Array.isArray(v?.preguntas) ? v.preguntas : [];

  const postular = async () => {
    for (const p of preguntas) if (p.requerido && !respuestas[p.id]?.trim()) { toastErr(`Responde: ${p.label}`); return; }
    setEnviando(true);
    try {
      await vacantesApi.postular(id, { respuestas, mensaje: mensaje.trim() || null });
      success('¡Postulación enviada!');
      onPostulado?.();
      onClose();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setEnviando(false); }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl border border-border bg-bg shadow-2xl p-6">
        {!v ? <GLoader message="Cargando…" /> : (<>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-bold font-display text-text-1">{v.titulo}</h2>
              <p className="text-xs text-text-3">{v.evento?.titulo}</p>
            </div>
            <button onClick={onClose} className="text-text-3 hover:text-text-1">✕</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {v.rol?.nombre && <span className="text-[11px] bg-surface-2 text-text-2 px-2 py-0.5 rounded-full">{v.rol.nombre}</span>}
            {v.ciudad && <span className="text-[11px] bg-surface-2 text-text-2 px-2 py-0.5 rounded-full">{v.ciudad}</span>}
            <span className="text-[11px] bg-surface-2 text-text-2 px-2 py-0.5 rounded-full capitalize">{v.modalidad}</span>
          </div>
          <p className="text-sm font-semibold text-success mb-3">{formatoPago(v.pago_monto, v.pago_moneda, v.pago_periodo)}</p>
          {v.descripcion && <p className="text-sm text-text-2 whitespace-pre-line mb-4">{v.descripcion}</p>}

          {yaPostule ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-text-1">
              {t('Ya te postulaste — estado:')} <b>{t(ETAPAS_VACANTE.find(e => e.id === yaPostule.etapa)?.label || yaPostule.etapa)}</b>.
            </div>
          ) : (<>
            {preguntas.length > 0 && (
              <div className="space-y-3 mb-4">
                <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{t('Preguntas de la vacante')}</p>
                {preguntas.map(p => (
                  <div key={p.id} className="field">
                    <label className="label text-xs">{p.label}{p.requerido && <span className="text-danger"> *</span>}</label>
                    <input value={respuestas[p.id] || ''} onChange={e => setRespuestas(r => ({ ...r, [p.id]: e.target.value }))}
                      className="input rounded-xl py-2.5 text-sm" />
                  </div>
                ))}
              </div>
            )}
            <div className="field mb-4">
              <label className="label text-xs">{t('Mensaje (opcional)')}</label>
              <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={2}
                className="input rounded-xl py-2.5 text-sm resize-none" placeholder={t('Cuéntale al organizador por qué eres buen fit.')} />
            </div>
            <button onClick={postular} disabled={enviando} className="btn-primary w-full justify-center">
              {enviando ? <><Spinner size="sm" /> {t('Enviando…')}</> : t('Postularme')}
            </button>
            <p className="text-[11px] text-text-3 mt-2 text-center">{t('Necesitas un perfil de talento. Si no lo tienes, créalo en «Mi perfil».')}</p>
            <p className="text-[11px] text-text-3 mt-1.5 text-center leading-relaxed">
              {t('Al postularte compartes tu perfil con el organizador y aceptas los')}{' '}
              <a href="/terminos" target="_blank" rel="noreferrer" className="underline hover:text-text-2">{t('términos')}</a> {t('y la')}{' '}
              <a href="/privacidad" target="_blank" rel="noreferrer" className="underline hover:text-text-2">{t('política de privacidad')}</a>.
            </p>
          </>)}
        </>)}
      </div>
    </div>
  );
}
