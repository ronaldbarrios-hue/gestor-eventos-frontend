import client from './client.js';

export const clientesApi = {
  list         : (eventoId, params = {})        => client.get(`/eventos/${eventoId}/clientes`, { params }).then(r => r.data),
  cambiarEstado: (eventoId, ticketId, estado)   => client.patch(`/eventos/${eventoId}/clientes/${ticketId}`, { estado }).then(r => r.data),
  checkin      : (eventoId, body)               => client.post(`/eventos/${eventoId}/checkin`, body).then(r => r.data),
  reingreso    : (eventoId, body)               => client.post(`/eventos/${eventoId}/reingreso`, body).then(r => r.data),
  aforoZonas   : (eventoId)                      => client.get(`/eventos/${eventoId}/zonas/aforo`).then(r => r.data),
  alertas      : (eventoId, params = {})         => client.get(`/eventos/${eventoId}/alertas`, { params }).then(r => r.data),
  reportarAlerta: (eventoId, body)               => client.post(`/eventos/${eventoId}/alertas`, body).then(r => r.data),
  resolverAlerta: (eventoId, id)                 => client.patch(`/eventos/${eventoId}/alertas/${id}/resolver`).then(r => r.data),
  importar     : (eventoId, body)               => client.post(`/eventos/${eventoId}/clientes/importar`, body).then(r => r.data),
};
