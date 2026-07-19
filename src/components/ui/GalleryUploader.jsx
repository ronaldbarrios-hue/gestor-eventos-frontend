import { useRef, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { uploadEventImage } from './CoverUploader.jsx';

/* Galería múltiple del evento.
   value: array de URLs ordenadas
   onChange(urls): recibe el nuevo arreglo
   Permite agregar, quitar, reordenar y elegir cover/principal (con corona). */

const MAX_ITEMS = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function GalleryUploader({ value = [], onChange, ownerId, label = 'Galería de imágenes' }) {
  const urls = Array.isArray(value) ? value : [];
  const fileInput = useRef(null);
  const { error: toastError } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragIdx,   setDragIdx]   = useState(null);

  const handleFiles = async (filesList) => {
    if (!filesList?.length) return;
    const remaining = MAX_ITEMS - urls.length;
    if (remaining <= 0) {
      toastError(`Máximo ${MAX_ITEMS} imágenes en la galería.`);
      return;
    }
    const files = Array.from(filesList).slice(0, remaining);
    setUploading(true);

    const subidos = [];
    for (const file of files) {
      if (!ACCEPTED.includes(file.type)) { toastError(`${file.name}: formato no soportado.`); continue; }
      if (file.size > MAX_BYTES)         { toastError(`${file.name}: pesa más de 5 MB.`); continue; }
      try {
        const url = await uploadEventImage(file, ownerId, 'gallery');
        subidos.push(url);
      } catch (e) {
        toastError(`Error subiendo ${file.name}: ${e.message}`);
      }
    }
    if (subidos.length) onChange([...urls, ...subidos]);
    setUploading(false);
  };

  const removeAt = (i) => onChange(urls.filter((_, idx) => idx !== i));

  const setAsCover = (i) => {
    if (i === 0) return;
    const next = [...urls];
    const [item] = next.splice(i, 1);
    next.unshift(item);
    onChange(next);
  };

  /* Reordenar con drag entre miniaturas */
  const onDragStart = (i) => setDragIdx(i);
  const onDragOverItem = (e) => e.preventDefault();
  const onDropOnItem = (i) => {
    if (dragIdx == null || dragIdx === i) return;
    const next = [...urls];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    onChange(next);
    setDragIdx(null);
  };

  return (
    <div className="field">
      <div className="flex items-center justify-between mb-2">
        <label className="label !mb-0">{label}</label>
        <span className="text-[11px] text-text-3">{urls.length}/{MAX_ITEMS}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {urls.map((url, i) => (
          <div
            key={url + i}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={onDragOverItem}
            onDrop={() => onDropOnItem(i)}
            className={`relative aspect-square rounded-xl overflow-hidden border transition-all cursor-grab active:cursor-grabbing
              ${dragIdx === i ? 'border-primary scale-95 opacity-50' : 'border-border hover:border-border-2'}
              animate-[scaleIn_0.25s_ease_both]`}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <img src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />

            {/* Corona — indicador de portada */}
            {i === 0 && (
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-bg/85 backdrop-blur-sm border border-border-2 flex items-center gap-1 text-[10px] font-semibold text-text-1">
                <StarIcon className="w-3 h-3 text-warning" />
                Principal
              </div>
            )}

            {/* Acciones overlay */}
            <div className="absolute inset-0 bg-bg/70 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => setAsCover(i)}
                  title="Marcar como principal"
                  className="w-8 h-8 rounded-lg bg-surface border border-border-2 text-text-1 hover:bg-surface-2 flex items-center justify-center"
                >
                  <StarIcon className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                title="Quitar"
                className="w-8 h-8 rounded-lg bg-danger/20 border border-danger/30 text-danger hover:bg-danger/30 flex items-center justify-center"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {urls.length < MAX_ITEMS && (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-border bg-surface/40 hover:bg-surface/60 hover:border-border-2 transition-all flex flex-col items-center justify-center gap-1.5 text-text-2 hover:text-text-1 disabled:opacity-50 group"
          >
            {uploading
              ? <div className="w-5 h-5 rounded-full border-2 border-border border-t-primary animate-spin" />
              : (
                <>
                  <PlusIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span className="text-[11px] font-medium">Agregar</span>
                </>
              )
            }
          </button>
        )}
      </div>

      {urls.length === 0 && (
        <p className="text-xs text-text-3 mt-2 leading-relaxed">
          Sube hasta {MAX_ITEMS} imágenes. La primera será la portada principal. Arrastra para reordenar.
        </p>
      )}

      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={e => handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
}

function PlusIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
}
function TrashIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}
function StarIcon({ className }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
}
