import client from './client.js';

/* Términos y privacidad PROPIOS de cada evento (backend: routes/legal.js).

   Distintos de los de GESTEK: la plataforma responde por sí misma y el
   organizador por su evento. El formulario de inscripción enlaza siempre a los
   del evento, así que la lectura es pública y no exige sesión. */
export const legalApi = {
  publico : (slug)             => client.get(`/eventos/publicos/slug/${slug}/legal`).then(r => r.data),
  leer    : (eventoId)         => client.get(`/eventos/${eventoId}/legal`).then(r => r.data),
  guardar : (eventoId, body)   => client.put(`/eventos/${eventoId}/legal`, body).then(r => r.data),
};
