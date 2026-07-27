import { useEffect, useState, useCallback } from 'react';
import { vacantesApi } from '../../api/vacantes.js';
import { useToast } from '../../context/ToastContext.jsx';
import ImagePicker from '../../components/ui/ImagePicker.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import GLoader from '../../components/ui/GLoader.jsx';

/* Editor del perfil de talento (CV reutilizable del candidato).
   Compartido entre /vacantes y Mi Espacio → Talento. */
export default function PerfilTalentoEditor() {
  const { success, error: toastErr } = useToast();
  const [perfil, setPerfil] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const d = await vacantesApi.miPerfil();
      setPerfil(d.perfil);
      setForm({
        titular: d.perfil?.titular || '', bio: d.perfil?.bio || '',
        habilidades: (d.perfil?.habilidades || []).join(', '),
        ciudad: d.perfil?.ciudad || '', telefono: d.perfil?.telefono || '',
        foto_url: d.perfil?.foto_url || '', portfolio_url: d.perfil?.portfolio_url || '',
      });
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, [toastErr]);
  useEffect(() => { cargar(); }, [cargar]);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const guardar = async () => {
    if (!form.titular.trim()) { toastErr('Ponle un titular a tu perfil (ej. "Logística y montaje").'); return; }
    setSaving(true);
    try {
      const body = { ...form, habilidades: form.habilidades.split(',').map(s => s.trim()).filter(Boolean) };
      const d = await vacantesApi.guardarPerfil(body);
      setPerfil(d.perfil);
      success('Perfil de talento guardado.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const togglePublicar = async () => {
    try {
      const d = await vacantesApi.publicarPerfil(!perfil?.publicado);
      setPerfil(d.perfil);
      success(d.perfil.publicado ? 'Tu perfil ahora aparece como disponible.' : 'Tu perfil ya no es visible.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const verificar = async () => {
    try { const d = await vacantesApi.verificar(); setPerfil(d.perfil); success(d.mensaje || 'Verificación iniciada.'); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  if (loading || !form) return <GLoader message="Cargando tu perfil…" />;

  const estadoVerif = perfil?.verificacion_estado || 'ninguna';

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-3xl border border-border bg-surface/40 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-1">Disponible para vacantes</p>
          <p className="text-xs text-text-3">Si lo activas, los organizadores pueden encontrarte al buscar talento.</p>
        </div>
        <button onClick={togglePublicar} disabled={!perfil}
          className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${perfil?.publicado ? 'bg-accent' : 'bg-surface-3'}`}>
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${perfil?.publicado ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-surface/40 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-1">Verificación de identidad</p>
          <p className="text-xs text-text-3">
            {estadoVerif === 'verificado' ? 'Tu identidad está verificada ✓'
              : estadoVerif === 'pendiente' ? 'Verificación en proceso…'
              : 'Verifica tu identidad y rostro para dar más confianza.'}
          </p>
        </div>
        {estadoVerif !== 'verificado' && (
          <button onClick={verificar} disabled={!perfil || estadoVerif === 'pendiente'} className="btn-secondary btn-sm flex-shrink-0">
            {estadoVerif === 'pendiente' ? 'En proceso' : 'Verificar identidad'}
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-surface/40 p-5 space-y-4">
        <div className="grid sm:grid-cols-[100px_1fr] gap-4 items-start">
          <div>
            <label className="label text-xs">Foto</label>
            <ImagePicker value={form.foto_url} onChange={url => set({ foto_url: url })} ownerId={perfil?.user_id} placeholder="URL o subir" />
          </div>
          <div className="space-y-3">
            <div className="field">
              <label className="label text-xs">Titular *</label>
              <input value={form.titular} onChange={e => set({ titular: e.target.value })} className="input rounded-xl py-2.5 text-sm" placeholder="Ej. Logística y montaje de eventos" />
            </div>
            <div className="field">
              <label className="label text-xs">Sobre ti</label>
              <textarea value={form.bio} onChange={e => set({ bio: e.target.value })} rows={3} className="input rounded-xl py-2.5 text-sm resize-none" placeholder="Tu experiencia en pocas líneas." />
            </div>
          </div>
        </div>
        <div className="field">
          <label className="label text-xs">Habilidades (separadas por coma)</label>
          <input value={form.habilidades} onChange={e => set({ habilidades: e.target.value })} className="input rounded-xl py-2.5 text-sm" placeholder="servicio al cliente, montaje, sonido" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="field"><label className="label text-xs">Ciudad</label><input value={form.ciudad} onChange={e => set({ ciudad: e.target.value })} className="input rounded-xl py-2.5 text-sm" /></div>
          <div className="field"><label className="label text-xs">Teléfono</label><input value={form.telefono} onChange={e => set({ telefono: e.target.value })} className="input rounded-xl py-2.5 text-sm" /></div>
          <div className="field"><label className="label text-xs">Portafolio (URL)</label><input value={form.portfolio_url} onChange={e => set({ portfolio_url: e.target.value })} className="input rounded-xl py-2.5 text-sm" placeholder="https://" /></div>
        </div>
        <div className="flex justify-end">
          <button onClick={guardar} disabled={saving} className="btn-primary btn-sm">{saving ? <><Spinner size="sm" /> Guardando…</> : 'Guardar perfil'}</button>
        </div>
      </div>
    </div>
  );
}
