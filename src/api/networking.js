import client from './client.js';

export const networkingApi = {
  /* Vista del asistente */
  expositores : (eventoId) => client.get(`/eventos/${eventoId}/networking/expositores`).then(r => r.data),
  misCitas    : (eventoId) => client.get(`/eventos/${eventoId}/networking/mis-citas`).then(r => r.data),
  reservar    : (eventoId, horarioId) => client.post(`/eventos/${eventoId}/networking/horarios/${horarioId}/reservar`).then(r => r.data),
  cancelar    : (eventoId, citaId) => client.delete(`/eventos/${eventoId}/networking/citas/${citaId}`).then(r => r.data),

  /* Vista del organizador */
  admin           : (eventoId) => client.get(`/eventos/${eventoId}/networking/admin`).then(r => r.data),
  crearExpositor  : (eventoId, body) => client.post(`/eventos/${eventoId}/networking/expositores`, body).then(r => r.data),
  borrarExpositor : (eventoId, expositorId) => client.delete(`/eventos/${eventoId}/networking/expositores/${expositorId}`).then(r => r.data),
  generarHorarios : (eventoId, expositorId, body) => client.post(`/eventos/${eventoId}/networking/expositores/${expositorId}/horarios`, body).then(r => r.data),
  borrarHorario   : (eventoId, horarioId) => client.delete(`/eventos/${eventoId}/networking/horarios/${horarioId}`).then(r => r.data),
};
