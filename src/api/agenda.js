import client from './client.js';

export const agendaApi = {
  speakers          : (eventoId)                      => client.get(`/eventos/${eventoId}/speakers`).then(r => r.data),
  crearSpeaker      : (eventoId, body)                => client.post(`/eventos/${eventoId}/speakers`, body).then(r => r.data),
  editarSpeaker     : (eventoId, id, body)            => client.patch(`/eventos/${eventoId}/speakers/${id}`, body).then(r => r.data),
  borrarSpeaker     : (eventoId, id)                  => client.delete(`/eventos/${eventoId}/speakers/${id}`).then(r => r.data),
  sessions          : (eventoId)                      => client.get(`/eventos/${eventoId}/sessions`).then(r => r.data),
  crearSession      : (eventoId, body)                => client.post(`/eventos/${eventoId}/sessions`, body).then(r => r.data),
  editarSession     : (eventoId, id, body)            => client.patch(`/eventos/${eventoId}/sessions/${id}`, body).then(r => r.data),
  borrarSession     : (eventoId, id)                  => client.delete(`/eventos/${eventoId}/sessions/${id}`).then(r => r.data),
  /* Preguntas propias de un sub-evento (modo 'propio'). Endpoint aparte del
     formulario del evento a propósito: los dos hacen un diff que borra lo que
     no viene en el payload, y compartirlo haría que guardar uno se llevara
     por delante el otro. */
  formularioSesion       : (eventoId, sesionId)         => client.get(`/eventos/${eventoId}/sesiones/${sesionId}/formulario`).then(r => r.data),
  guardarFormularioSesion: (eventoId, sesionId, campos) => client.put(`/eventos/${eventoId}/sesiones/${sesionId}/formulario`, { campos }).then(r => r.data),
  /* Quién se apuntó a qué. */
  participacion     : (eventoId)                      => client.get(`/eventos/${eventoId}/sesiones/participacion`).then(r => r.data),
  inscripciones     : (eventoId, sesionId)            => client.get(`/eventos/${eventoId}/sesiones/${sesionId}/inscripciones`).then(r => r.data),
  /* Cambiar a mano el estado de UNA inscripción: apuntado, asistió, cancelado.
     Es la salida de emergencia del escáner — alguien que se quedó sin batería,
     una plaza que se libera— y sin ella la lista sólo se puede mirar. */
  estadoInscripcion : (eventoId, sesionId, id, estado) =>
    client.patch(`/eventos/${eventoId}/sesiones/${sesionId}/inscripciones/${id}`, { estado }).then(r => r.data),
  /* Lo ÚNICO que suma asistencia a un sub-evento: la persona ya inscrita
     vuelve a pasar su QR en la puerta de ESE taller. El check-in del evento no
     toca esto —entrar al recinto no es asistir a una charla—. */
  marcarAsistencia  : (eventoId, sesionId, body)      => client.post(`/eventos/${eventoId}/sesiones/${sesionId}/asistencia`, body).then(r => r.data),
  misFavoritos      : (eventoId)                      => client.get(`/eventos/${eventoId}/agenda/mis-favoritos`).then(r => r.data),
  marcarFavorito    : (eventoId, sessionId)            => client.post(`/eventos/${eventoId}/agenda/favoritos/${sessionId}`).then(r => r.data),
  quitarFavorito    : (eventoId, sessionId)            => client.delete(`/eventos/${eventoId}/agenda/favoritos/${sessionId}`).then(r => r.data),
};
