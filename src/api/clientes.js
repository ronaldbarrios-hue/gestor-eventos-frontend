import client from './client.js';

export const clientesApi = {
  list         : (eventoId, params = {})        => client.get(`/eventos/${eventoId}/clientes`, { params }).then(r => r.data),
  cambiarEstado: (eventoId, ticketId, estado)   => client.patch(`/eventos/${eventoId}/clientes/${ticketId}`, { estado }).then(r => r.data),
  /* Volver a mandarle la entrada a quien ya la tiene. Va al correo REGISTRADO
     en la boleta —el servidor no acepta destinatario—, y es el mismo correo que
     sale al pagar, con la plantilla del evento. */
  reenviar     : (eventoId, ticketId)           => client.post(`/eventos/${eventoId}/clientes/${ticketId}/reenviar`).then(r => r.data),
  /* Cuánto entró, de qué, qué falta por cobrar y qué se devolvió. Permiso
     `ver_pagos`. */
  dinero       : (eventoId)                     => client.get(`/eventos/${eventoId}/dinero`).then(r => r.data),
  /* Deja constancia del reembolso. NO mueve dinero: eso se hace en la pasarela.
     Permiso `reembolsar`. */
  reembolsar   : (eventoId, ticketId, motivo)   => client.post(`/eventos/${eventoId}/clientes/${ticketId}/reembolsar`, { motivo }).then(r => r.data),
  checkin      : (eventoId, body)               => client.post(`/eventos/${eventoId}/checkin`, body).then(r => r.data),
  reingreso    : (eventoId, body)               => client.post(`/eventos/${eventoId}/reingreso`, body).then(r => r.data),
  aforoZonas   : (eventoId)                      => client.get(`/eventos/${eventoId}/zonas/aforo`).then(r => r.data),
  /* Entrada/salida de una zona SIN boleta: el contador de mano del staff. */
  movimientoZona: (eventoId, body)              => client.post(`/eventos/${eventoId}/zonas/movimiento`, body).then(r => r.data),
  /* Pone el contador a cero sin borrar el histórico (escribe un corte). */
  limpiarAforo : (eventoId, body = {})           => client.post(`/eventos/${eventoId}/zonas/limpiar`, body).then(r => r.data),
  reporteZonas : (eventoId, params = {})         => client.get(`/eventos/${eventoId}/zonas/reporte`, { params }).then(r => r.data),
  reporteManual: (eventoId, body)                => client.post(`/eventos/${eventoId}/zonas/reporte-manual`, body).then(r => r.data),
  /* El estado en vivo de todo lo que hay puesto en el plano: aforo de las
     zonas, ingresos por cada puerta e inscripción de cada sub-evento. */
  mapaVivo     : (eventoId)                      => client.get(`/eventos/${eventoId}/mapa/vivo`).then(r => r.data),
  alertas      : (eventoId, params = {})         => client.get(`/eventos/${eventoId}/alertas`, { params }).then(r => r.data),
  reportarAlerta: (eventoId, body)               => client.post(`/eventos/${eventoId}/alertas`, body).then(r => r.data),
  resolverAlerta: (eventoId, id)                 => client.patch(`/eventos/${eventoId}/alertas/${id}/resolver`).then(r => r.data),
  importar     : (eventoId, body)               => client.post(`/eventos/${eventoId}/clientes/importar`, body).then(r => r.data),
  exportar     : (eventoId)                     => client.get(`/eventos/${eventoId}/clientes/exportar`).then(r => r.data),
};
