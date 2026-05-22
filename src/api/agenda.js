import client from './client.js';

export const agendaApi = {
  speakers          : (eventoId)                      => client.get(`/eventos/${eventoId}/speakers`).then(r => r.data),
  crearSpeaker      : (eventoId, body)                => client.post(`/eventos/${eventoId}/speakers`, body).then(r => r.data),
  editarSpeaker     : (eventoId, id, body)            => client.patch(`/eventos/${eventoId}/speakers/${id}`, body).then(r => r.data),
  borrarSpeaker     : (eventoId, id)                  => client.delete(`/eventos/${eventoId}/speakers/${id}`).then(r => r.data),

  sessions          : (eventoId)                      => client.get(`/eventos/${eventoId}/sessions`).then(r => r.data),
  crearSession      : (eventoId, body)                => client.post(`/eventos/${eventoId}/sessions`, body).then(r => r.data),
  editarSession     : (eventoId, id, body)            => client.patch(`/eventos/${eventoId}/sessions/${id}`, body).then(r => r.data),
  borrarSession     : (eventoId, id)                  => client.delete(`/eventos/${eventoId}/sessions/${id}`).then(r => r.data),
};
