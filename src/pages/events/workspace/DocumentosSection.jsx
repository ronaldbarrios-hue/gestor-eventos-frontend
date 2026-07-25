import { useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';

/* Asistentes/Organización · Documentos del evento — sube y guarda archivos
   (PDF, imágenes, ofimática) asociados al evento, dentro de la plataforma.
   Metadatos en page_json.documentos; archivo en Supabase Storage.

   SEGURIDAD (control de subida):
   - Whitelist de tipos + bloqueo explícito de extensiones ejecutables/peligrosas.
   - Límite de tamaño. Nombre saneado.
   - NOTA: la validación de tipo/tamaño es del lado cliente; el escaneo real
     de malware debe hacerse en el servidor (ClamAV / API de scanning) — queda
     como paso de backend/infra. Los archivos van a un bucket; para documentos
     sensibles conviene un bucket privado con URLs firmadas (infra pendiente). */

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const TIPOS_OK = {
  'application/pdf': 'PDF',
  'image/jpeg': 'Imagen', 'image/png': 'Imagen', 'image/webp': 'Imagen', 'image/gif': 'Imagen',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPT',
  'text/plain': 'Texto', 'text/csv': 'CSV',
};
/* Extensiones que NUNCA se aceptan aunque el MIME diga otra cosa (anti-malware básico). */
const EXT_BLOQUEADAS = ['exe','bat','cmd','com','msi','msix','sh','bash','js','mjs','cjs','jar','vbs','vbe','ps1','psm1','html','htm','xhtml','svg','php','phtml','apk','scr','dll','lnk','reg','wsf','hta','jse','pif'];
const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

function sanitizeName(name) {
  return (name || 'archivo').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
}

export default function DocumentosSection({ evento }) {
  const { success, error } = useToast();
  const [docs, setDocs] = useState(() => Array.isArray(evento.page_json?.documentos) ? evento.page_json.documentos : []);
  const [subiendo, setSubiendo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const persistir = async (lista) => {
    setDocs(lista);
    try { await eventosApi.update(evento.id, { page_json: { ...(evento.page_json || {}), documentos: lista } }); }
    catch (e) { error('No se pudo guardar la lista: ' + (e.response?.data?.error || e.message)); }
  };

  const validar = (file) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (EXT_BLOQUEADAS.includes(ext)) return `Por seguridad no se permiten archivos .${ext} (ejecutables/scripts).`;
    if (!TIPOS_OK[file.type]) return 'Tipo de archivo no permitido. Usa PDF, imágenes, Word, Excel, PPT, TXT o CSV.';
    if (file.size > MAX_BYTES) return `El archivo pesa más de ${MAX_BYTES / 1024 / 1024} MB.`;
    return null;
  };

  const subir = async (file) => {
    if (!file) return;
    const err = validar(file);
    if (err) { error(err); return; }
    setSubiendo(true);
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      /* La carpeta raíz debe ser el uid del usuario (política de Storage). */
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) throw new Error('Inicia sesión para subir documentos.');
      const path = `${uid}/docs/${evento.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('event-media').upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from('event-media').getPublicUrl(path);
      const doc = { nombre: sanitizeName(file.name), url: data.publicUrl, path, tipo: TIPOS_OK[file.type], size: file.size, subido_at: new Date().toISOString() };
      await persistir([doc, ...docs]);
      success('Documento subido.');
    } catch (e) { error('Error al subir: ' + e.message); }
    finally { setSubiendo(false); }
  };

  const eliminar = async (doc) => {
    if (!(await confirmDialog({ title: 'Eliminar documento', message: `¿Eliminar "${doc.nombre}"?`, confirmLabel: 'Eliminar', danger: true }))) return;
    if (doc.path) { try { await supabase.storage.from('event-media').remove([doc.path]); } catch { /* noop */ } }
    persistir(docs.filter(d => d !== doc));
  };

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); subir(e.dataTransfer.files?.[0]); };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Zona de subida */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        role="button" tabIndex={0}
        className={`rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition-all
          ${dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-border-2 bg-surface/40'}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border-2 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-text-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        </div>
        <p className="text-sm font-medium text-text-1">{subiendo ? 'Subiendo…' : 'Sube o arrastra un documento'}</p>
        <p className="text-xs text-text-3 mt-1">PDF · imágenes · Word · Excel · PPT · TXT/CSV · máx 25 MB</p>
        <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={e => subir(e.target.files?.[0])} />
      </div>

      {/* Nota de seguridad */}
      <div className="rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-xs text-text-2 leading-relaxed">
        <strong className="text-warning-light">Seguridad:</strong> se bloquean ejecutables y scripts (.exe, .js, .html, .svg…) y se limita el tamaño. El escaneo antivirus del contenido se hará del lado servidor (pendiente de backend); evita subir archivos de origen desconocido.
      </div>

      {/* Lista */}
      {docs.length === 0 ? (
        <div className="card p-10 text-center"><p className="text-sm text-text-2">Aún no hay documentos. Sube contratos, riders, planos, listas… todo lo del evento en un solo lugar.</p></div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {docs.map((d, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/40">
              <span className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-[10px] font-bold text-text-2 flex-shrink-0">{d.tipo}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-1 truncate">{d.nombre}</p>
                <p className="text-[11px] text-text-3">{(d.size / 1024 / 1024).toFixed(2)} MB · {d.subido_at ? new Date(d.subido_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</p>
              </div>
              <a href={d.url} target="_blank" rel="noreferrer noopener" className="btn-ghost btn-sm flex-shrink-0">Ver</a>
              <button onClick={() => eliminar(d)} className="btn-ghost btn-sm text-danger/80 hover:text-danger flex-shrink-0">Eliminar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
