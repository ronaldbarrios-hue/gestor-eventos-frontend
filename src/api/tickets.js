import client from './client.js';

export const ticketsApi = {
  list   : (eventoId)                    => client.get(`/eventos/${eventoId}/tickets`).then(r => r.data),
  crear  : (eventoId, body)              => client.post(`/eventos/${eventoId}/tickets`, body).then(r => r.data),
  editar : (eventoId, ticketId, body)    => client.patch(`/eventos/${eventoId}/tickets/${ticketId}`, body).then(r => r.data),
  borrar : (eventoId, ticketId)          => client.delete(`/eventos/${eventoId}/tickets/${ticketId}`).then(r => r.data),
};
