import { useState } from 'react';
import ImagePicker from '../../../../components/ui/ImagePicker.jsx';
import { EditIcon, TrashIcon } from './agendaComun.jsx';

/* Los ponentes del evento: su lista, su ficha y su formulario. Se enlazan
   desde un sub-evento pero son del evento, no de la sesión. */

export default function SpeakersList({ speakers, ownerId, editing, onEdit, onSave, onDelete }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {speakers.map(s => editing === s.id
        ? <div key={s.id} className="sm:col-span-2"><SpeakerForm ownerId={ownerId} initial={s} onCancel={() => onEdit(null)} onSave={(p) => onSave(s.id, p)} /></div>
        : <SpeakerCard key={s.id} speaker={s} onEdit={() => onEdit(s.id)} onDelete={() => onDelete(s)} />
      )}
    </div>
  );
}

function SpeakerCard({ speaker, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4 flex items-start gap-4 group hover:border-border-2 transition-all">
      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
        {speaker.foto_url
          ? <img src={speaker.foto_url} alt={speaker.nombre} className="w-full h-full object-cover" />
          : <span className="text-white font-bold text-base">{speaker.nombre.charAt(0).toUpperCase()}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-text-1 truncate">{speaker.nombre}</p>
        {speaker.empresa && <p className="text-xs text-text-3 truncate mt-0.5">{speaker.empresa}</p>}
        {speaker.bio && <p className="text-sm text-text-2 mt-1.5 leading-relaxed line-clamp-3">{speaker.bio}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} aria-label="Editar"
          className="w-7 h-7 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center">
          <EditIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} aria-label="Borrar"
          className="w-7 h-7 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center">
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function SpeakerForm({ initial, ownerId, onSave, onCancel }) {
  const [form, setForm] = useState({
    nombre  : initial?.nombre  || '',
    empresa : initial?.empresa || '',
    bio     : initial?.bio     || '',
    foto_url: initial?.foto_url || '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-primary/25 bg-surface/40 p-5 space-y-3 animate-[fadeUp_0.3s_ease_both]">
      <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">{initial ? 'Editar speaker' : 'Nuevo speaker'}</p>
      <div className="field">
        <label className="label">Foto</label>
        <ImagePicker value={form.foto_url} onChange={url => setForm(f => ({...f, foto_url: url}))} ownerId={ownerId} placeholder="URL o subir foto" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
          placeholder="Nombre completo" required autoFocus
          className="input-form font-medium" />
        <input value={form.empresa} onChange={e => setForm(f => ({...f, empresa: e.target.value}))}
          placeholder="Cargo / empresa (opcional)" className="input-form" />
      </div>
      <textarea value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))}
        placeholder="Bio breve" rows={3} className="input-form resize-none" />
      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">Cancelar</button>
        <button type="submit" disabled={saving || !form.nombre.trim()} className="btn-primary btn-sm">
          {saving ? 'Guardando...' : (initial ? 'Guardar' : 'Crear speaker')}
        </button>
      </div>
    </form>
  );
}

