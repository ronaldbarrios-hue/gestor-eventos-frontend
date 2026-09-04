import client from './client.js';

export const networkingApi = {
  /* Vista del asistente */
  expositores : (eventoId) => client.get(`/eventos/${eventoId}/networking/expositores`).then(r => r.data),
  misCitas    : (eventoId) => client.get(`/eventos/${eventoId}/networking/mis-citas`).then(r => r.data),
  reservar    : (eventoId, horarioId) => client.post(`/eventos/${eventoId}/networking/horarios/${horarioId}/reservar`).then(r => r.data),
  /* Lo que anotó quien fue a la cita. Suyo: el servidor sólo deja escribir
     sobre la propia. */
  guardarNotas: (eventoId, citaId, notas) =>
    client.patch(`/eventos/${eventoId}/networking/citas/${citaId}/notas`, { notas }).then(r => r.data),
  cancelar    : (eventoId, citaId) => client.delete(`/eventos/${eventoId}/networking/citas/${citaId}`).then(r => r.data),

  /* Vista del organizador */
  expositoresAdmin: (eventoId) => client.get(`/eventos/${eventoId}/expositores`).then(r => r.data),
  crearStand      : (eventoId, body) => client.post(`/eventos/${eventoId}/expositores`, body).then(r => r.data),
  editarStand     : (eventoId, id, body) => client.patch(`/eventos/${eventoId}/expositores/${id}`, body).then(r => r.data),
  borrarStand     : (eventoId, id) => client.delete(`/eventos/${eventoId}/expositores/${id}`).then(r => r.data),
  /* La bolsa de puntos y su reparto. Existian en el backend desde la 0057
     —con trigger que aplica el tope— y no los llamaba nadie: la tarjeta de
     cada stand ensenaba «% de la bolsa repartida» de un numero que no habia
     forma de fijar. */
  bolsa           : (eventoId) => client.get(`/eventos/${eventoId}/expositores/bolsa`).then(r => r.data),
  guardarBolsa    : (eventoId, body) => client.put(`/eventos/${eventoId}/expositores/bolsa`, body).then(r => r.data),
  guardarCuotas   : (eventoId, body) => client.put(`/eventos/${eventoId}/expositores/cuotas`, body).then(r => r.data),
  admin           : (eventoId) => client.get(`/eventos/${eventoId}/networking/admin`).then(r => r.data),
  crearExpositor  : (eventoId, body) => client.post(`/eventos/${eventoId}/networking/expositores`, body).then(r => r.data),
  /* Faltaba, y su ausencia se notaba: un expositor creado desde la Rueda de
     Negocios no se podía editar desde ninguna parte — sólo borrar y volver a
     crear. Detrás es el mismo manejador que `editarStand`. */
  editarExpositor : (eventoId, id, body) => client.patch(`/eventos/${eventoId}/networking/expositores/${id}`, body).then(r => r.data),
  borrarExpositor : (eventoId, expositorId) => client.delete(`/eventos/${eventoId}/networking/expositores/${expositorId}`).then(r => r.data),
  generarHorarios : (eventoId, expositorId, body) => client.post(`/eventos/${eventoId}/networking/expositores/${expositorId}/horarios`, body).then(r => r.data),
  borrarHorario   : (eventoId, horarioId) => client.delete(`/eventos/${eventoId}/networking/horarios/${horarioId}`).then(r => r.data),

  /* La parrilla. Existía entera en el servidor —ver, aprobar, mover, sentar— y
     no la llamaba nadie: quien organiza tenía las rutas y ninguna pantalla.
     Un hueco que se abría porque una empresa no llegaba se quedaba muerto toda
     la jornada, porque una cita sólo la podía soltar quien la reservó. */
  citas       : (eventoId) => client.get(`/eventos/${eventoId}/networking/citas`).then(r => r.data),
  /* Aprobar, mover de casilla y anotar son la misma acción —tocar una casilla—
     y por eso van por la misma ruta. Contesta 409 si la casilla de destino ya
     está ocupada, que al reorganizar es lo normal, no un fallo. */
  tocarCita   : (eventoId, citaId, body) =>
    client.patch(`/eventos/${eventoId}/networking/citas/${citaId}`, body).then(r => r.data),
  /* Sentar a alguien a mano: nace confirmada, porque pedirle que apruebe una
     cita que le acaban de poner sería devolverle el trabajo. */
  sentar      : (eventoId, horarioId, userId) =>
    client.post(`/eventos/${eventoId}/networking/citas`, { horario_id: horarioId, user_id: userId }).then(r => r.data),
};
