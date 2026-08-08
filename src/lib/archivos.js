/* Reglas de subida de archivos, en un solo sitio.

   Estaban escritas dentro de DocumentosSection. Al necesitarlas también para
   la hoja de vida del candidato, copiarlas habría dejado dos listas de
   bloqueo que se desincronizan en la primera prisa: se saca aquí.

   ⚠️ Esto es validación de CLIENTE. Frena el error honesto y el intento
   perezoso, no a un atacante — cualquiera puede saltarse el navegador y
   hablarle directo a Storage. El escaneo real de malware va en el servidor
   (ClamAV o un servicio de scanning) y sigue pendiente. Para documentos
   sensibles, además, conviene bucket privado con URLs firmadas. */

/* Nunca se aceptan, diga lo que diga el MIME: el navegador se cree lo que
   el archivo declara, así que la extensión es la última línea barata. */
export const EXT_BLOQUEADAS = [
  'exe', 'bat', 'cmd', 'com', 'msi', 'msix', 'scr', 'pif', 'lnk', 'reg', 'dll',
  'sh', 'bash', 'ps1', 'psm1', 'vbs', 'vbe', 'jse', 'wsf', 'hta',
  'js', 'mjs', 'cjs', 'jar', 'apk',
  'html', 'htm', 'xhtml', 'svg',        // ejecutan scripts al abrirse
  'php', 'phtml',
  /* Formatos de Office CON macros. El .docx no puede llevarlas por
     definición del formato; el .doc y los *m sí. */
  'docm', 'dotm', 'xlsm', 'xltm', 'pptm', 'potm', 'doc', 'xls', 'ppt',
];

export const TIPOS_DOCUMENTO = {
  'application/pdf': 'PDF',
  'image/jpeg': 'Imagen', 'image/png': 'Imagen', 'image/webp': 'Imagen', 'image/gif': 'Imagen',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPT',
  'text/plain': 'Texto', 'text/csv': 'CSV',
};

/* La hoja de vida es más estricta: la abre un desconocido que está
   contratando, así que solo PDF y DOCX. Se prefiere PDF y se dice. */
export const TIPOS_CV = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
};

export const ACCEPT_DOCUMENTO = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.docx,.xlsx,.pptx,.txt,.csv';
export const ACCEPT_CV = '.pdf,.docx';

export const MAX_DOCUMENTO = 25 * 1024 * 1024;   // 25 MB
export const MAX_CV        = 8 * 1024 * 1024;    // 8 MB: un CV que pesa más, no es un CV

/* Quita todo lo que pueda hacer de las suyas en una ruta o en una cabecera
   Content-Disposition. */
export function sanitizarNombre(nombre) {
  return (nombre || 'archivo').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
}

/* Devuelve un mensaje de error, o null si el archivo pasa. */
export function validarArchivo(file, { tipos = TIPOS_DOCUMENTO, maxBytes = MAX_DOCUMENTO, queEs = 'archivo' } = {}) {
  if (!file) return 'No se recibió ningún archivo.';
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (EXT_BLOQUEADAS.includes(ext)) {
    return `Por seguridad no se aceptan archivos .${ext}. Suele ser un programa o un documento con macros.`;
  }
  if (!tipos[file.type]) {
    const permitidos = [...new Set(Object.values(tipos))].join(', ');
    return `Ese tipo de archivo no se acepta para ${queEs}. Se admiten: ${permitidos}.`;
  }
  if (file.size > maxBytes) {
    return `El archivo pesa más de ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  }
  /* Doble llave: que el MIME diga PDF no basta si la extensión dice otra
     cosa, y al revés. Un .pdf.exe renombrado cae aquí. */
  const extEsperadaPorTipo = {
    'application/pdf': ['pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  }[file.type];
  if (extEsperadaPorTipo && !extEsperadaPorTipo.includes(ext)) {
    return `El archivo dice ser ${tipos[file.type]} pero su extensión es .${ext}. No se acepta.`;
  }
  return null;
}
