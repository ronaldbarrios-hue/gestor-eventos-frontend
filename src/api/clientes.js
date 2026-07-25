import client from './client.js';

export const clientesApi = {
  list         : (eventoId, params = {})        => client.get(`/eventos/${eventoId}/clientes`, { params }).then(r => r.data),
  cambiarEstado: (eventoId, ticketId, estado)   => client.patch(`/eventos/${eventoId}/clientes/${ticketId}`, { estado }).then(r => r.data),
  checkin      : (eventoId, body)               => client.post(`/eventos/${eventoId}/checkin`, body).then(r => r.data),
  importar     : (eventoId, body)               => client.post(`/eventos/${eventoId}/clientes/importar`, body).then(r => r.data),
};
