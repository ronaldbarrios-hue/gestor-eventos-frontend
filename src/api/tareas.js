import client from './client.js';

export const tareasApi = {
  list      : (eventoId)                    => client.get(`/eventos/${eventoId}/tareas`).then(r => r.data),
  crear     : (eventoId, body)              => client.post(`/eventos/${eventoId}/tareas`, body).then(r => r.data),
  editar    : (eventoId, id, body)          => client.patch(`/eventos/${eventoId}/tareas/${id}`, body).then(r => r.data),
  borrar    : (eventoId, id)                => client.delete(`/eventos/${eventoId}/tareas/${id}`).then(r => r.data),
  log       : (eventoId, id)                => client.get(`/eventos/${eventoId}/tareas/${id}/log`).then(r => r.data),
  comentar  : (eventoId, id, texto)         => client.post(`/eventos/${eventoId}/tareas/${id}/comentar`, { texto }).then(r => r.data),
};
