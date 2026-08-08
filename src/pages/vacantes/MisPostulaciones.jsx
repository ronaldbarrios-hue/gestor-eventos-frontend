/* Mis postulaciones — a qué vacantes me presenté y en qué van.

   Vive en Mi Espacio, junto al perfil de talento: son las dos caras de lo
   mismo (quién soy como trabajador y a qué apliqué), y antes estaban en
   pantallas distintas. */

import { useEffect, useState, useCallback } from 'react';
import { vacantesApi, formatoPago, ETAPAS_VACANTE } from '../../api/vacantes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { confirmDialog } from '../../components/ui/Confirm.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import GLoader from '../../components/ui/GLoader.jsx';

export default function MisPostulaciones() {
  const { t, lang } = useI18n();
  const { success, error: toastErr } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resenando, setResenando] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { const d = await vacantesApi.misPostulaciones(); setItems(d.postulaciones || []); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, [toastErr]);
  useEffect(() => { cargar(); }, [cargar]);

  const retirar = async (it) => {
    if (!(await confirmDialog({ message: `¿Retirar tu postulación a "${it.vacante?.titulo}"?`, danger: true }))) return;
    try { await vacantesApi.retirar(it.id); success(t('Postulación retirada.')); cargar(); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  if (loading) return <GLoader message={t('Cargando tus postulaciones…')} />;
  if (!items.length) return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
      <p className="text-sm text-text-2">{t('Aún no te has postulado a ninguna vacante.')}</p>
    </div>
  );

  const etapaColor = (e) => e === 'aceptado' ? 'bg-success/15 text-success' : e === 'rechazado' ? 'bg-danger/15 text-danger' : 'bg-accent/10 text-accent-light';

  return (
    <div className="space-y-3">
      {items.map(it => (
        <div key={it.id} className="rounded-2xl border border-border bg-surface/40 p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-1 truncate">{it.vacante?.titulo}</p>
            <p className="text-xs text-text-3 truncate">{it.vacante?.evento?.titulo} · {formatoPago(it.vacante?.pago_monto, it.vacante?.pago_moneda)}</p>
            {it.entrevista?.inicio && <p className="text-xs text-accent-light mt-0.5">{t('Entrevista:')} {new Date(it.entrevista.inicio).toLocaleString(lang === 'en' ? 'en-US' : 'es-CO')}{it.entrevista.enlace && <> · <a href={it.entrevista.enlace} target="_blank" rel="noreferrer" className="underline">{t('enlace')}</a></>}</p>}
          </div>
          <span className={`text-[11px] font-mono px-2 py-1 rounded ${etapaColor(it.etapa)}`}>{t(ETAPAS_VACANTE.find(e => e.id === it.etapa)?.label || it.etapa)}</span>
          {it.etapa === 'aceptado'
            ? <button onClick={() => setResenando(it)} className="btn-secondary btn-sm">{t('Reseñar')}</button>
            : it.etapa !== 'rechazado' && <button onClick={() => retirar(it)} className="btn-ghost btn-sm text-text-3">{t('Retirar')}</button>}
        </div>
      ))}
      {resenando && <ResenaModal postulacion={resenando} onClose={() => setResenando(null)} onListo={cargar} />}
    </div>
  );
}

function ResenaModal({ postulacion, onClose, onListo }) {
  const { t } = useI18n();
  const { success, error: toastErr } = useToast();
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);

  const enviar = async () => {
    setSaving(true);
    try {
      await vacantesApi.resenarOrganizador(postulacion.id, { estrellas, comentario: comentario.trim() || null });
      success(t('¡Gracias por tu reseña!'));
      onListo?.(); onClose();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-bg shadow-2xl p-6">
        <h3 className="text-base font-bold text-text-1 mb-1">{t('Reseña al organizador')}</h3>
        <p className="text-xs text-text-3 mb-4">{postulacion.vacante?.evento?.titulo}</p>
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setEstrellas(n)} className={`text-2xl ${n <= estrellas ? 'text-warning' : 'text-text-3'}`}>★</button>
          ))}
        </div>
        <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3} className="input rounded-xl py-2.5 text-sm resize-none w-full mb-4" placeholder={t('¿Cómo fue trabajar en este evento?')} />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost btn-sm">{t('Cancelar')}</button>
          <button onClick={enviar} disabled={saving} className="btn-primary btn-sm">{saving ? <Spinner size="sm" /> : t('Enviar reseña')}</button>
        </div>
      </div>
    </div>
  );
}
