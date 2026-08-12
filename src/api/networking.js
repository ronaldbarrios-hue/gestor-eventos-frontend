import client from './client.js';

export const networkingApi = {
  /* Vista del asistente */
  expositores : (eventoId) => client.get(`/eventos/${eventoId}/networking/expositores`).then(r => r.data),
  misCitas    : (eventoId) => client.get(`/eventos/${eventoId}/networking/mis-citas`).then(r => r.data),
  reservar    : (eventoId, horarioId) => client.post(`/eventos/${eventoId}/networking/horarios/${horarioId}/reservar`).then(r => r.data),
  cancelar    : (eventoId, citaId) => client.delete(`/eventos/${eventoId}/networking/citas/${citaId}`).then(r => r.data),

  /* Vista del organizador */
  /* `todos: true` trae también los desactivados, que antes quedaban invisibles
     en el panel y no se podían reactivar. */
  expositoresAdmin: (eventoId, { todos } = {}) =>
    client.get(`/eventos/${eventoId}/expositores`, { params: todos ? { todos: 1 } : {} }).then(r => r.data),

  /* Bolsa de puntos del evento y su reparto por stand (migración 0057). */
  bolsa       : (eventoId) => client.get(`/eventos/${eventoId}/expositores/bolsa`).then(r => r.data),
  guardarBolsa: (eventoId, body) => client.put(`/eventos/${eventoId}/expositores/bolsa`, body).then(r => r.data),
  guardarCuotas: (eventoId, cuotas) =>
    client.put(`/eventos/${eventoId}/expositores/cuotas`, { cuotas }).then(r => r.data),
  crearStand      : (eventoId, body) => client.post(`/eventos/${eventoId}/expositores`, body).then(r => r.data),
  editarStand     : (eventoId, id, body) => client.patch(`/eventos/${eventoId}/expositores/${id}`, body).then(r => r.data),
  borrarStand     : (eventoId, id) => client.delete(`/eventos/${eventoId}/expositores/${id}`).then(r => r.data),
  admin           : (eventoId) => client.get(`/eventos/${eventoId}/networking/admin`).then(r => r.data),
  crearExpositor  : (eventoId, body) => client.post(`/eventos/${eventoId}/networking/expositores`, body).then(r => r.data),
  borrarExpositor : (eventoId, expositorId) => client.delete(`/eventos/${eventoId}/networking/expositores/${expositorId}`).then(r => r.data),
  generarHorarios : (eventoId, expositorId, body) => client.post(`/eventos/${eventoId}/networking/expositores/${expositorId}/horarios`, body).then(r => r.data),
  borrarHorario   : (eventoId, horarioId) => client.delete(`/eventos/${eventoId}/networking/horarios/${horarioId}`).then(r => r.data),
};
