import { useEffect, useState, useCallback } from 'react';
import { meApi } from '../../api/me.js';
import { vacantesApi } from '../../api/vacantes.js';
import { useToast } from '../../context/ToastContext.jsx';
import ImagePicker from '../../components/ui/ImagePicker.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import GLoader from '../../components/ui/GLoader.jsx';

/* Perfil PÚBLICO del organizador (cuenta administradora): la identidad con la
   que la gente lo ve, más su reputación (reseñas que le dejaron los
   trabajadores tras contratarlos). Vive en Mi Espacio → Organizador. */
export default function PerfilOrganizador() {
  const { success, error: toastErr } = useToast();
  const [form, setForm] = useState(null);
  const [rep, setRep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [dp, dr] = await Promise.all([
        meApi.perfil(),
        vacantesApi.miReputacionOrganizador().catch(() => ({ resenas: [], promedio: null, total_resenas: 0, eventos: 0 })),
      ]);
      const p = dp.profile || {};
      setForm({ id: p.id, nombre: p.nombre || '', empresa: p.empresa || '', ocupacion: p.ocupacion || '', ciudad: p.ciudad || '', bio: p.bio || '', avatar_url: p.avatar_url || '' });
      setRep(dr);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, [toastErr]);
  useEffect(() => { cargar(); }, [cargar]);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const guardar = async () => {
    if (!form.nombre.trim()) { toastErr('Tu nombre público es obligatorio.'); return; }
    setSaving(true);
    try {
      await meApi.actualizar({ nombre: form.nombre, empresa: form.empresa, ocupacion: form.ocupacion, ciudad: form.ciudad, bio: form.bio, avatar_url: form.avatar_url });
      success('Perfil de organizador guardado.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  if (loading || !form) return <GLoader message="Cargando tu perfil de organizador…" />;

  const prom = rep?.promedio;

  return (
    <div className="max-w-2xl space-y-4">
      {/* Reputación */}
      <div className="rounded-3xl border border-border bg-surface/40 p-5 flex flex-wrap items-center gap-5">
        <div className="text-center">
          <p className="text-3xl font-bold font-display text-text-1 tabular-nums leading-none">{prom != null ? prom.toFixed(1) : '—'}</p>
          <div className="flex gap-0.5 mt-1 justify-center">
            {[1, 2, 3, 4, 5].map(n => <span key={n} className={`text-sm ${prom != null && n <= Math.round(prom) ? 'text-warning' : 'text-text-3'}`}>★</span>)}
          </div>
        </div>
        <div className="text-sm text-text-2">
          <p><b className="text-text-1">{rep?.total_resenas || 0}</b> reseña{(rep?.total_resenas || 0) !== 1 ? 's' : ''} de trabajadores</p>
          <p><b className="text-text-1">{rep?.eventos || 0}</b> evento{(rep?.eventos || 0) !== 1 ? 's' : ''} organizado{(rep?.eventos || 0) !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Editor de identidad pública */}
      <div className="rounded-3xl border border-border bg-surface/40 p-5 space-y-4">
        <p className="text-sm font-semibold text-text-1">Tu identidad pública como organizador</p>
        <div className="grid sm:grid-cols-[100px_1fr] gap-4 items-start">
          <div>
            <label className="label text-xs">Foto / logo</label>
            <ImagePicker value={form.avatar_url} onChange={url => set({ avatar_url: url })} ownerId={form.id} placeholder="URL o subir" />
          </div>
          <div className="space-y-3">
            <div className="field">
              <label className="label text-xs">Nombre público *</label>
              <input value={form.nombre} onChange={e => set({ nombre: e.target.value })} className="input rounded-xl py-2.5 text-sm" />
            </div>
            <div className="field">
              <label className="label text-xs">Descripción</label>
              <textarea value={form.bio} onChange={e => set({ bio: e.target.value })} rows={3} className="input rounded-xl py-2.5 text-sm resize-none" placeholder="Quién eres como organizador, qué eventos haces." />
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="field"><label className="label text-xs">Empresa</label><input value={form.empresa} onChange={e => set({ empresa: e.target.value })} className="input rounded-xl py-2.5 text-sm" /></div>
          <div className="field"><label className="label text-xs">Ocupación</label><input value={form.ocupacion} onChange={e => set({ ocupacion: e.target.value })} className="input rounded-xl py-2.5 text-sm" /></div>
          <div className="field"><label className="label text-xs">Ciudad</label><input value={form.ciudad} onChange={e => set({ ciudad: e.target.value })} className="input rounded-xl py-2.5 text-sm" /></div>
        </div>
        <div className="flex justify-end">
          <button onClick={guardar} disabled={saving} className="btn-primary btn-sm">{saving ? <><Spinner size="sm" /> Guardando…</> : 'Guardar'}</button>
        </div>
      </div>

      {/* Reseñas recibidas */}
      {(rep?.resenas?.length > 0) && (
        <div className="rounded-3xl border border-border bg-surface/40 p-5 space-y-3">
          <p className="text-sm font-semibold text-text-1">Lo que dicen los trabajadores</p>
          {rep.resenas.map((r, i) => (
            <div key={i} className="border-t border-border pt-3 first:border-0 first:pt-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-warning">{'★'.repeat(r.estrellas)}<span className="text-text-3">{'★'.repeat(5 - r.estrellas)}</span></span>
                <span className="text-xs text-text-3">{r.de?.nombre || 'Trabajador'}{r.evento?.titulo ? ` · ${r.evento.titulo}` : ''}</span>
              </div>
              {r.comentario && <p className="text-sm text-text-2">{r.comentario}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
