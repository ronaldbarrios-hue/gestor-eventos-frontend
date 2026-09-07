import client from './client.js';

export const ticketsApi = {
  list   : (eventoId)                    => client.get(`/eventos/${eventoId}/tickets`).then(r => r.data),
  crear  : (eventoId, body)              => client.post(`/eventos/${eventoId}/tickets`, body).then(r => r.data),
  /* Las boletas de un tipo que se vendieron ANTES de que el tipo dijera «crea
     un equipo». No entran solas: quien mete al equipo es un disparador de la
     base que sólo corre cuando la boleta cambia de estado, y esas ya no
     cambian. Se pregunta antes de guardar, para avisar en vez de dejar el
     hueco hecho. */
  boletasSinEquipo : (eventoId, ticketId) => client.get(`/eventos/${eventoId}/tickets/${ticketId}/boletas-sin-equipo`).then(r => r.data),
  crearEquipos     : (eventoId, ticketId) => client.post(`/eventos/${eventoId}/tickets/${ticketId}/crear-equipos`).then(r => r.data),
  editar : (eventoId, ticketId, body)    => client.patch(`/eventos/${eventoId}/tickets/${ticketId}`, body).then(r => r.data),
  borrar : (eventoId, ticketId)          => client.delete(`/eventos/${eventoId}/tickets/${ticketId}`).then(r => r.data),
};
