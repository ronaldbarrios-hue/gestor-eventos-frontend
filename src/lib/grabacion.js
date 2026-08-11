/* ── Grabación de audio: elegir formato y normalizar el MIME ───────────
   Dos cosas que hay que resolver juntas, porque arreglar una rompe la otra.

   1. No todos los navegadores graban lo mismo. Chrome y Firefox hacen webm;
      Safari e iOS solo mp4, y `new MediaRecorder(stream, {mimeType:'audio/webm'})`
      les lanza NotSupportedError. Hay que preguntar antes con isTypeSupported.

   2. `MediaRecorder.mimeType` no devuelve lo que pediste, devuelve el tipo
      completo con sus parámetros: "audio/webm;codecs=opus". Storage compara el
      contentType contra allowed_mime_types con igualdad exacta, y ahí solo está
      'audio/webm'. Así que para grabar hay que usar el tipo largo, y para subir
      hay que quitarle los parámetros. */

/* En orden de preferencia. El primero que el navegador admita, gana. */
const FORMATOS = [
  { mime: 'audio/webm;codecs=opus', ext: 'webm' },
  { mime: 'audio/webm',             ext: 'webm' },
  { mime: 'audio/mp4;codecs=mp4a.40.2', ext: 'm4a' },
  { mime: 'audio/mp4',              ext: 'm4a' },
  { mime: 'audio/ogg;codecs=opus',  ext: 'ogg' },
  { mime: 'audio/mpeg',             ext: 'mp3' },
];

/* Quita los parámetros del MIME: "audio/webm;codecs=opus" → "audio/webm".
   Es la forma que el bucket acepta. */
export function mimeBase(mime) {
  return String(mime || '').split(';')[0].trim().toLowerCase();
}

/* El formato que este navegador puede grabar, o null si no puede ninguno.
   `isTypeSupported` no existe en navegadores muy viejos: si falta, se asume
   que no hay grabación en vez de reventar. */
export function formatoGrabacion() {
  if (typeof MediaRecorder === 'undefined') return null;
  const soporta = typeof MediaRecorder.isTypeSupported === 'function'
    ? (m) => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } }
    : () => false;
  return FORMATOS.find(f => soporta(f.mime)) || null;
}

export function hayGrabacion() {
  return Boolean(formatoGrabacion());
}

/* Extensión que corresponde a un MIME grabado, para que el nombre del archivo
   no mienta sobre su contenido (Storage saca la extensión del nombre). */
export function extensionDe(mime) {
  const base = mimeBase(mime);
  return FORMATOS.find(f => mimeBase(f.mime) === base)?.ext
    || base.split('/')[1]?.replace(/[^a-z0-9]/g, '')
    || 'webm';
}

/* Convierte el blob que suelta MediaRecorder en un File listo para subir:
   nombre con la extensión correcta y type sin parámetros. */
export function archivoDeAudio(blob, mimeGrabado) {
  const base = mimeBase(mimeGrabado || blob?.type) || 'audio/webm';
  const ext  = extensionDe(base);
  const sello = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return new File([blob], `audio-${sello}.${ext}`, { type: base });
}
