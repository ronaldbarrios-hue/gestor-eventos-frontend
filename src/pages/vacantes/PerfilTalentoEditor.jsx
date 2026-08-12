import { useEffect, useState, useCallback, useRef } from 'react';
import { vacantesApi } from '../../api/vacantes.js';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { supabase } from '../../lib/supabase.js';
import { validarArchivo, sanitizarNombre, TIPOS_CV, MAX_CV, ACCEPT_CV } from '../../lib/archivos.js';
import Spinner from '../../components/ui/Spinner.jsx';
import GLoader from '../../components/ui/GLoader.jsx';

/* Perfil de talento — el CV reutilizable del candidato.

   Vive en Mi Espacio. Antes estaba duplicado: la misma pantalla aparecía
   como "Mi perfil" dentro de Vacantes y como "Perfil de talento" en Mi
   Espacio, dos caminos al mismo formulario.

   El formulario se reparte en dos columnas en pantallas anchas. Antes iba
   encajonado en max-w-2xl contra el borde izquierdo, dejando media pantalla
   vacía mientras los campos se apretaban. */

/* Envoltorio de un trazo suelto: recibe el <path> ya escrito y le pone el
   <svg> con las medidas del sistema. Se llama Trazo y no Icono para no chocar
   con components/ui/Icono.jsx, que es el registro con nombres
   (<Trazo name="trofeo" />). Este de aquí no tiene registro: dibuja lo que le
   pasen. */
const Trazo = ({ d, className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{d}</svg>
);

export default function PerfilTalentoEditor() {
  const { t } = useI18n();
  const { usuario } = useAuth();
  const { success, error: toastErr } = useToast();
  const [perfil, setPerfil] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subiendoCv, setSubiendoCv] = useState(false);
  const inputCv = useRef(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const d = await vacantesApi.miPerfil();
      setPerfil(d.perfil);
      /* Foto, ciudad y teléfono son de la PERSONA, no de esta faceta. Se
         heredan de la cuenta y no se editan aquí: se editaban en dos sitios
         contra dos almacenes distintos —los metadatos de Auth y la tabla
         perfil_talento— que no se hablaban, así que la misma persona podía
         acabar con dos fotos y dos teléfonos según por dónde se la mirara.

         Se siguen ENVIANDO al guardar para que perfil_talento quede al día: el
         snapshot que se congela al postularse lo lee de ahí, y tiene que
         encontrar algo. */
      setForm({
        titular: d.perfil?.titular || '', bio: d.perfil?.bio || '',
        habilidades: (d.perfil?.habilidades || []).join(', '),
        portfolio_url: d.perfil?.portfolio_url || '',
        cv_url: d.perfil?.cv_url || '', cv_nombre: d.perfil?.cv_nombre || '',
      });
    } catch (e) { toastErr(e.message); }
    finally { setLoading(false); }
  }, [toastErr]);
  useEffect(() => { cargar(); }, [cargar]);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const guardar = async () => {
    if (!form.titular.trim()) { toastErr(t('Ponle un titular a tu perfil (ej. "Logística y montaje").')); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        habilidades: form.habilidades.split(',').map(s => s.trim()).filter(Boolean),
        /* Lo heredado viaja con el resto: la cuenta es la fuente, perfil_talento
           la copia que consulta el snapshot de una postulación. */
        foto_url: usuario?.foto || '',
        ciudad  : usuario?.ciudad || '',
        telefono: usuario?.telefono || '',
      };
      const d = await vacantesApi.guardarPerfil(body);
      setPerfil(d.perfil);
      success(t('Perfil de talento guardado.'));
    } catch (e) { toastErr(e.message); }
    finally { setSaving(false); }
  };

  const togglePublicar = async () => {
    try {
      const d = await vacantesApi.publicarPerfil(!perfil?.publicado);
      setPerfil(d.perfil);
      success(d.perfil.publicado ? t('Tu perfil ahora aparece como disponible.') : t('Tu perfil ya no es visible.'));
    } catch (e) { toastErr(e.message); }
  };

  const verificar = async () => {
    try {
      const d = await vacantesApi.verificar();
      setPerfil(d.perfil);
      if (d.url) window.open(d.url, '_blank', 'noopener');
      success(d.mensaje || t('Verificación iniciada.'));
    } catch (e) { toastErr(e.message); }
  };

  /* Subir la hoja de vida. Solo PDF y DOCX: lo abre un desconocido que está
     contratando, así que se descartan ejecutables y los formatos de Office
     que admiten macros. Las reglas viven en lib/archivos.js. */
  const subirCv = async (file) => {
    const problema = validarArchivo(file, { tipos: TIPOS_CV, maxBytes: MAX_CV, queEs: t('la hoja de vida') });
    if (problema) { toastErr(problema); return; }
    setSubiendoCv(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) throw new Error(t('Inicia sesión para subir tu hoja de vida.'));
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
      /* La carpeta raíz debe ser el uid (política de Storage). */
      const ruta = `${uid}/cv-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('form-uploads')
        .upload(ruta, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('form-uploads').getPublicUrl(ruta);
      set({ cv_url: data.publicUrl, cv_nombre: sanitizarNombre(file.name) });
      success(t('Hoja de vida cargada. Recuerda guardar el perfil.'));
    } catch (e) { toastErr(e.message); }
    finally {
      setSubiendoCv(false);
      if (inputCv.current) inputCv.current.value = '';
    }
  };

  if (loading || !form) return <GLoader message={t('Cargando tu perfil…')} />;

  const estadoVerif = perfil?.verificacion_estado || 'ninguna';

  return (
    <div className="space-y-4">
      {/* ── Dos interruptores de estado, uno al lado del otro ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-border bg-surface/40 p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-1">{t('Disponible para vacantes')}</p>
            <p className="text-xs text-text-3 mt-0.5">{t('Si lo activas, los organizadores pueden encontrarte al buscar talento.')}</p>
          </div>
          <button onClick={togglePublicar} disabled={!perfil} aria-pressed={!!perfil?.publicado}
            aria-label={t('Disponible para vacantes')}
            className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${perfil?.publicado ? 'bg-accent' : 'bg-surface-3'}`}>
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${perfil?.publicado ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-surface/40 p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-1">{t('Verificación de identidad')}</p>
            <p className="text-xs text-text-3 mt-0.5">
              {estadoVerif === 'verificado' ? t('Tu identidad está verificada.')
                : estadoVerif === 'pendiente' ? t('Verificación en proceso…')
                : t('Verifica tu identidad y rostro para dar más confianza.')}
            </p>
          </div>
          {estadoVerif !== 'verificado' && (
            <button onClick={verificar} disabled={!perfil || estadoVerif === 'pendiente'} className="btn-secondary btn-sm flex-shrink-0">
              {estadoVerif === 'pendiente' ? t('En proceso') : t('Verificar identidad')}
            </button>
          )}
        </div>
      </div>

      {/* ── El formulario, repartido ── */}
      <div className="rounded-3xl border border-border bg-surface/40 p-5 sm:p-6">
        <div className="grid lg:grid-cols-[220px_1fr] gap-6">

          {/* Columna izquierda: quién eres de un vistazo */}
          <div className="space-y-5">
            {/* Heredado de la cuenta. Antes se subía aquí una segunda foto que
                no tenía nada que ver con la del perfil. */}
            <div>
              <label className="label text-xs">{t('Foto')}</label>
              <div className="flex items-center gap-3">
                {usuario?.foto
                  ? <img src={usuario.foto} alt="" className="w-16 h-16 rounded-2xl object-cover border border-border" />
                  : <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-lg font-bold text-text-3">
                      {(usuario?.nombre || '?').charAt(0).toUpperCase()}
                    </div>}
                <Link to="/ajustes?a=perfil" className="text-[11px] text-primary-light hover:underline leading-snug">
                  {t('Viene de tu perfil')}<br />{t('Cambiar')}
                </Link>
              </div>
            </div>

            {/* Hoja de vida */}
            <div>
              <label className="label text-xs">{t('Hoja de vida')}</label>
              <input ref={inputCv} type="file" accept={ACCEPT_CV} className="hidden"
                     onChange={e => subirCv(e.target.files?.[0])} />

              {form.cv_url ? (
                <div className="rounded-2xl border border-border bg-surface-2/60 p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 h-8 w-8 flex-shrink-0 rounded-lg bg-primary/12 border border-primary/25
                                     text-primary flex items-center justify-center">
                      <Trazo d={<><path d="M14 2v6h6" /><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></>} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text-1 truncate">{form.cv_nombre || t('Hoja de vida')}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <a href={form.cv_url} target="_blank" rel="noreferrer noopener"
                           className="text-[11px] text-primary hover:underline">{t('Ver')}</a>
                        <button onClick={() => set({ cv_url: '', cv_nombre: '' })}
                                className="text-[11px] text-text-3 hover:text-danger transition-colors">{t('Quitar')}</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => inputCv.current?.click()}
                  disabled={subiendoCv}
                  className="w-full rounded-2xl border border-dashed border-border-2 hover:border-primary/50
                             bg-surface-2/40 hover:bg-surface-2/70 transition-colors px-3 py-5 text-center disabled:opacity-60"
                >
                  {subiendoCv ? (
                    <span className="inline-flex items-center gap-2 text-xs text-text-2"><Spinner size="sm" /> {t('Subiendo…')}</span>
                  ) : (
                    <>
                      <Trazo d={<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>}
                             className="h-5 w-5 mx-auto text-text-3 mb-1.5" />
                      <span className="block text-xs font-medium text-text-2">{t('Subir hoja de vida')}</span>
                    </>
                  )}
                </button>
              )}
              <p className="text-[11px] text-text-3 mt-1.5 leading-snug">
                {t('PDF o Word (.docx), hasta 8 MB. Preferimos PDF: se ve igual en cualquier equipo.')}
              </p>
            </div>
          </div>

          {/* Columna derecha: el contenido */}
          <div className="space-y-4">
            <div className="field">
              <label className="label text-xs">{t('Titular')} *</label>
              <input value={form.titular} onChange={e => set({ titular: e.target.value })}
                     className="input rounded-xl py-2.5 text-sm" placeholder={t('Ej. Logística y montaje de eventos')} />
            </div>

            <div className="field">
              <label className="label text-xs">{t('Sobre ti')}</label>
              <textarea value={form.bio} onChange={e => set({ bio: e.target.value })} rows={4}
                        className="input rounded-xl py-2.5 text-sm resize-none"
                        placeholder={t('Tu experiencia en pocas líneas.')} />
            </div>

            <div className="field">
              <label className="label text-xs">{t('Habilidades (separadas por coma)')}</label>
              <input value={form.habilidades} onChange={e => set({ habilidades: e.target.value })}
                     className="input rounded-xl py-2.5 text-sm" placeholder={t('servicio al cliente, montaje, sonido')} />
            </div>

            <div className="field">
              <label className="label text-xs">{t('Portafolio (URL)')}</label>
              <input value={form.portfolio_url} onChange={e => set({ portfolio_url: e.target.value })}
                     className="input rounded-xl py-2.5 text-sm" placeholder="https://" />
            </div>

            {/* Datos de contacto: se muestran, no se editan aquí. Son de la
                cuenta, y tenerlos en dos formularios garantiza que un día
                discrepen. */}
            <div className="rounded-2xl border border-border bg-surface-2/40 px-4 py-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex gap-6 flex-wrap">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{t('Ciudad')}</p>
                    <p className="text-sm text-text-1">{usuario?.ciudad || <span className="text-text-3">{t('Sin definir')}</span>}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{t('Teléfono')}</p>
                    <p className="text-sm text-text-1">{usuario?.telefono || <span className="text-text-3">{t('Sin definir')}</span>}</p>
                  </div>
                </div>
                <Link to="/ajustes?a=perfil" className="text-xs text-primary-light hover:underline flex-shrink-0">
                  {t('Editar en mi perfil')} →
                </Link>
              </div>
              <p className="text-[11px] text-text-3 mt-2 leading-snug">
                {t('Estos datos son de tu cuenta y se usan en todas tus facetas. Al cambiarlos ahí, cambian aquí.')}
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button onClick={guardar} disabled={saving} className="btn-primary btn-sm">
                {saving ? <><Spinner size="sm" /> {t('Guardando…')}</> : t('Guardar perfil')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
