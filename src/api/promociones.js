import client from './client.js';

export const promocionesApi = {
  list    : (eventoId)            => client.get(`/eventos/${eventoId}/promociones`).then(r => r.data),
  crear   : (eventoId, body)      => client.post(`/eventos/${eventoId}/promociones`, body).then(r => r.data),
  editar  : (eventoId, id, body)  => client.patch(`/eventos/${eventoId}/promociones/${id}`, body).then(r => r.data),
  borrar  : (eventoId, id)        => client.delete(`/eventos/${eventoId}/promociones/${id}`).then(r => r.data),
  validar : (slug, body)          => client.post(`/eventos/publicos/slug/${slug}/promocion/validar`, body).then(r => r.data),
};
