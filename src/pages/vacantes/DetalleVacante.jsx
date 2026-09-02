/* Detalle de una vacante, en modal.

   Vive fuera de la página de vacantes porque ahora se abre desde dos
   sitios: la vitrina pública de Explorar y el panel interno. */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { vacantesApi, formatoPago, ETAPAS_VACANTE } from '../../api/vacantes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import GLoader from '../../components/ui/GLoader.jsx';

export default function DetalleVacante({ id, onClose, onPostulado }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { success, error: toastErr } = useToast();
  const [data, setData] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [perfil, setPerfil] = useState(undefined);   // undefined = cargando

  useEffect(() => {
    vacantesApi.detalle(id).then(setData).catch(e => { toastErr(e.response?.data?.error || e.message); onClose(); });
  }, [id, onClose, toastErr]);

  /* El perfil propio, sólo para poder decir QUÉ se va a enviar.
     Antes esto era un aviso genérico al pie —«necesitas un perfil de talento»—
     que no decía si lo tenías ni si tu hoja de vida iba dentro. Y la hoja de
     vida sí viaja: el servidor guarda un `perfil_snapshot` con `cv_url` en el
     momento de postularse. Que la persona no pudiera comprobarlo antes de
     enviar era pedirle fe. */
  useEffect(() => {
    let vivo = true;
    vacantesApi.miPerfil()
      .then(d => { if (vivo) setPerfil(d?.perfil || null); })
      .catch(() => { if (vivo) setPerfil(null); });
    return () => { vivo = false; };
  }, []);

  const v = data?.vacante;
  const yaPostule = data?.mi_postulacion;
  const preguntas = Array.isArray(v?.preguntas) ? v.preguntas : [];
  const requisitos = (Array.isArray(v?.requisitos) ? v.requisitos : [])
    .map(r => String(r || '').trim()).filter(Boolean);

  const postular = async () => {
    for (const p of preguntas) if (p.requerido && !respuestas[p.id]?.trim()) { toastErr(`Responde: ${p.label}`); return; }
    setEnviando(true);
    try {
      await vacantesApi.postular(id, { respuestas, mensaje: mensaje.trim() || null });
      success('¡Postulación enviada!');
      onPostulado?.();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      /* El perfil de talento se crea al postularse por primera vez, así que
         la pestaña puede no estar todavía en Mi Espacio: se lleva al usuario
         directo a ella en vez de dejarle un mensaje sin camino. */
      if (e.response?.status === 400 && /perfil de talento/i.test(msg)) {
        toastErr(t('Crea tu perfil de talento para poder postularte.'));
        onClose();
        navigate('/mi-espacio?tab=talento');
        return;
      }
      toastErr(msg);
    }
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

          {/* Los requisitos. El campo existía en la base y en la respuesta
              pública desde el principio, y no se pintaba en ninguna parte: se
              pedían dentro del párrafo de la descripción, donde se leen en
              diagonal. Aquí son una lista, que es lo que alguien compara
              consigo mismo antes de decidir si se postula. */}
          {requisitos.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1.5">
                {t('Requisitos')}
              </p>
              <ul className="space-y-1">
                {requisitos.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-text-3/60 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {yaPostule ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-text-1">
              {t('Ya te postulaste. Estado:')} <b>{t(ETAPAS_VACANTE.find(e => e.id === yaPostule.etapa)?.label || yaPostule.etapa)}</b>.
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
            {/* Qué se va a enviar, dicho antes de enviarlo.
                Aquí había un aviso genérico —«necesitas un perfil de talento,
                si no lo tienes créalo»— que no decía si lo tenías ni si tu
                hoja de vida iba dentro. Y va dentro: el servidor guarda un
                `perfil_snapshot` con `cv_url` al postularse. Enseñar el nombre
                del archivo convierte una promesa en una comprobación. */}
            <div className="rounded-2xl border border-border bg-surface-2/40 px-3.5 py-3 mb-3">
              <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1.5">
                {t('Lo que envías')}
              </p>
              {perfil === undefined ? (
                <p className="text-xs text-text-3">{t('Cargando tu perfil…')}</p>
              ) : !perfil ? (
                <p className="text-xs text-text-2">
                  {t('Todavía no tienes perfil de talento.')}{' '}
                  <Link to="/mi-espacio?tab=talento" onClick={onClose} className="text-accent underline">
                    {t('Créalo antes de postularte')}
                  </Link>
                </p>
              ) : (
                <ul className="space-y-1 text-xs text-text-2">
                  <li>· {t('Tu perfil')}{perfil.titular ? <span className="text-text-3"> — {perfil.titular}</span> : null}</li>
                  <li className="flex items-start gap-1.5">
                    <span>·</span>
                    {perfil.cv_url ? (
                      <span>
                        {t('Tu hoja de vida')}{' '}
                        <a href={perfil.cv_url} target="_blank" rel="noreferrer noopener" className="underline hover:text-text-1">
                          {perfil.cv_nombre || t('ver archivo')}
                        </a>
                      </span>
                    ) : (
                      <span className="text-warning">
                        {t('Sin hoja de vida.')}{' '}
                        <Link to="/mi-espacio?tab=talento" onClick={onClose} className="underline">
                          {t('Subirla')}
                        </Link>
                      </span>
                    )}
                  </li>
                </ul>
              )}
            </div>

            <button onClick={postular} disabled={enviando} className="btn-primary w-full justify-center">
              {enviando ? <><Spinner size="sm" /> {t('Enviando…')}</> : t('Postularme')}
            </button>
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
