import { useRef, useState } from 'react';
import { uploadEventImage } from './CoverUploader.jsx';
import { useToast } from '../../context/ToastContext.jsx';

/* Input compacto de URL de imagen + botón "Subir" que abre el file picker.
   Sube a Supabase Storage (bucket event-media) con uploadEventImage. */

export default function ImagePicker({ value, onChange, ownerId, placeholder = 'URL imagen o subir', size = 'sm' }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { error: toastErr } = useToast();

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadEventImage(file, ownerId, 'block');
      onChange(url);
    } catch (e) {
      toastErr(`Error al subir: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const padY = size === 'lg' ? 'py-3' : 'py-2';
  const btnH = size === 'lg' ? 'h-12' : 'h-9';

  return (
    <div className="flex items-center gap-2">
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input rounded-xl text-sm flex-1 ${padY}`}
      />
      {value && <img src={value} alt="" className={`${btnH} ${btnH === 'h-9' ? 'w-9' : 'w-12'} rounded-lg object-cover border border-border flex-shrink-0`} />}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || !ownerId}
        title={!ownerId ? 'Sin contexto de evento' : 'Subir imagen'}
        className={`${btnH} px-3 rounded-xl border border-border bg-surface hover:bg-surface-2 hover:border-border-2 text-xs font-medium text-text-2 hover:text-text-1 transition-all disabled:opacity-50 flex items-center gap-1.5`}
      >
        {uploading ? (
          <div className="w-3 h-3 rounded-full border-2 border-border border-t-primary animate-spin" />
        ) : (
          <UploadIcon />
        )}
        {uploading ? '' : 'Subir'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

function UploadIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
}
