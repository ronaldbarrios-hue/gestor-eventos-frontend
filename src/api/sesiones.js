import client from './client.js';

/* Inscripción a sub-eventos (backend: routes/sesiones.js).

   La boleta del evento sigue siendo la llave de entrada; esto es la inscripción
   a una actividad concreta dentro del evento, con su propio cupo y su propio
   formulario. Es lo que permite responder cuánta gente asistió al evento y
   cuánta participó en cada taller — antes no quedaba registro de eso. */
export const sesionesApi = {
  /* ── Público ── */
  listar: (slug) =>
    client.get(`/eventos/publicos/slug/${slug}/sesiones`).then(r => r.data),

  /* `codigo` es el de la boleta del evento. Sin él hacen falta nombre y correo:
     en la práctica siempre llega quien aparece en el taller sin haber pasado
     por la entrada general, y si no se le puede registrar, el conteo miente. */
  inscribir: (slug, sesionId, { codigo, nombre, email, telefono, respuestas } = {}) =>
    client.post(`/eventos/publicos/slug/${slug}/sesiones/${sesionId}/inscribir`,
      { codigo, nombre, email, telefono, respuestas }).then(r => r.data),

  /* ── Panel ── */
  participacion: (eventoId) =>
    client.get(`/eventos/${eventoId}/sesiones/participacion`).then(r => r.data),

  inscripciones: (eventoId, sesionId, params = {}) =>
    client.get(`/eventos/${eventoId}/sesiones/${sesionId}/inscripciones`, { params }).then(r => r.data),

  /* Marcar que sí fue. Acepta el código de la boleta —se escanea el QR que la
     persona ya tiene— o el id de la inscripción. */
  marcarAsistencia: (eventoId, sesionId, { codigo, inscripcion_id } = {}) =>
    client.post(`/eventos/${eventoId}/sesiones/${sesionId}/asistencia`,
      { codigo, inscripcion_id }).then(r => r.data),

  cambiarEstado: (eventoId, sesionId, id, estado) =>
    client.patch(`/eventos/${eventoId}/sesiones/${sesionId}/inscripciones/${id}`, { estado }).then(r => r.data),
};
