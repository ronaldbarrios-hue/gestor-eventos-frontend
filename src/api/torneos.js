import client from './client.js';

export const torneosApi = {
  get              : (eventoId) => client.get(`/eventos/${eventoId}/torneo`).then(r => r.data),
  crear            : (eventoId, body) => client.post(`/eventos/${eventoId}/torneo`, body).then(r => r.data),
  borrar           : (eventoId, torneoId) => client.delete(`/eventos/${eventoId}/torneo/${torneoId}`).then(r => r.data),

  crearEquipo      : (eventoId, torneoId, body) => client.post(`/eventos/${eventoId}/torneo/${torneoId}/equipos`, body).then(r => r.data),
  borrarEquipo     : (eventoId, torneoId, equipoId) => client.delete(`/eventos/${eventoId}/torneo/${torneoId}/equipos/${equipoId}`).then(r => r.data),

  camposDisponibles: (eventoId, torneoId) => client.get(`/eventos/${eventoId}/torneo/${torneoId}/campos-disponibles`).then(r => r.data),
  importarEquipos  : (eventoId, torneoId, body) => client.post(`/eventos/${eventoId}/torneo/${torneoId}/importar-equipos`, body).then(r => r.data),

  generarFixture   : (eventoId, torneoId) => client.post(`/eventos/${eventoId}/torneo/${torneoId}/generar`).then(r => r.data),
  cerrarGrupos     : (eventoId, torneoId) => client.post(`/eventos/${eventoId}/torneo/${torneoId}/cerrar-grupos`).then(r => r.data),

  registrarResultado: (eventoId, torneoId, partidoId, body) =>
    client.patch(`/eventos/${eventoId}/torneo/${torneoId}/partidos/${partidoId}`, body).then(r => r.data),

  posiciones       : (eventoId, torneoId) => client.get(`/eventos/${eventoId}/torneo/${torneoId}/posiciones`).then(r => r.data),
};
