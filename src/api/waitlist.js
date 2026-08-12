import client from './client.js';

export const waitlistApi = {
  list: (eventoId, params = {}) =>
    client.get(`/eventos/${eventoId}/waitlist`, { params }).then(r => r.data),

  join: (slug, body) =>
    client.post(`/eventos/publicos/slug/${slug}/waitlist`, body).then(r => r.data),

  updateEstado: (eventoId, waitlistId, estado) =>
    client.patch(`/eventos/${eventoId}/waitlist/${waitlistId}`, { estado }).then(r => r.data),

  notify: (eventoId, waitlistId) =>
    client.post(`/eventos/${eventoId}/waitlist/${waitlistId}/notify`).then(r => r.data),

  remove: (eventoId, waitlistId) =>
    client.delete(`/eventos/${eventoId}/waitlist/${waitlistId}`).then(r => r.data),

  /* ¿Sigue en pie el cupo que le ofrecimos por correo? Se consulta ANTES de
     que la persona rellene nada, para no dejarla escribir un formulario
     entero y avisarle al final de que llegó tarde. Sin auth: el token es la
     credencial, y quien recibió el correo puede no tener cuenta. */
  verificarCupo: (token) =>
    client.get(`/eventos/publicos/cupo/${encodeURIComponent(token)}`).then(r => r.data),
};
