import client from './client.js';

export const rolesApi = {
  list   : (eventoId)                  => client.get(`/eventos/${eventoId}/roles`).then(r => r.data),
  crear  : (eventoId, body)            => client.post(`/eventos/${eventoId}/roles`, body).then(r => r.data),
  editar : (eventoId, rolId, body)     => client.patch(`/eventos/${eventoId}/roles/${rolId}`, body).then(r => r.data),
  borrar : (eventoId, rolId)           => client.delete(`/eventos/${eventoId}/roles/${rolId}`).then(r => r.data),
};
