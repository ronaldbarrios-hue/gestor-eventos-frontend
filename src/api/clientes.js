import client from './client.js';

export const clientesApi = {
  list         : (eventoId, params = {})        => client.get(`/eventos/${eventoId}/clientes`, { params }).then(r => r.data),
  cambiarEstado: (eventoId, ticketId, estado)   => client.patch(`/eventos/${eventoId}/clientes/${ticketId}`, { estado }).then(r => r.data),
  checkin      : (eventoId, body)               => client.post(`/eventos/${eventoId}/checkin`, body).then(r => r.data),
  reingreso    : (eventoId, body)               => client.post(`/eventos/${eventoId}/reingreso`, body).then(r => r.data),
  aforoZonas   : (eventoId)                      => client.get(`/eventos/${eventoId}/zonas/aforo`).then(r => r.data),
  /* Entrada/salida de una zona SIN boleta: el contador de mano del staff. */
  movimientoZona: (eventoId, body)              => client.post(`/eventos/${eventoId}/zonas/movimiento`, body).then(r => r.data),
  /* Pone el contador a cero sin borrar el histórico (escribe un corte). */
  limpiarAforo : (eventoId, body = {})           => client.post(`/eventos/${eventoId}/zonas/limpiar`, body).then(r => r.data),
  reporteZonas : (eventoId, params = {})         => client.get(`/eventos/${eventoId}/zonas/reporte`, { params }).then(r => r.data),
  alertas      : (eventoId, params = {})         => client.get(`/eventos/${eventoId}/alertas`, { params }).then(r => r.data),
  reportarAlerta: (eventoId, body)               => client.post(`/eventos/${eventoId}/alertas`, body).then(r => r.data),
  resolverAlerta: (eventoId, id)                 => client.patch(`/eventos/${eventoId}/alertas/${id}/resolver`).then(r => r.data),
  importar     : (eventoId, body)               => client.post(`/eventos/${eventoId}/clientes/importar`, body).then(r => r.data),
  exportar     : (eventoId)                     => client.get(`/eventos/${eventoId}/clientes/exportar`).then(r => r.data),
};
