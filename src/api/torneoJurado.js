import client from './client.js';

/* Puntaje por jurado ("show de talento"): todos participan, nadie se
   enfrenta a nadie, califica un jurado con puntos. Ver routes/torneoJurado.js
   en el backend — este archivo es un espejo 1:1 de esas rutas, igual que
   torneos.js lo es de routes/torneos.js. */

export const torneoJuradoApi = {
  /* Rúbrica: los criterios que se suman (o el único "Puntaje general"). */
  criterios       : (eventoId, torneoId) => client.get(`/eventos/${eventoId}/torneo/${torneoId}/criterios`).then(r => r.data),
  guardarCriterios: (eventoId, torneoId, criterios) =>
    client.patch(`/eventos/${eventoId}/torneo/${torneoId}/criterios`, { criterios }).then(r => r.data),

  /* Rondas: 'una_ronda' (una sola) o 'eliminatoria' (varias, con corte). */
  rondas          : (eventoId, torneoId) => client.get(`/eventos/${eventoId}/torneo/${torneoId}/rondas`).then(r => r.data),
  guardarRondas   : (eventoId, torneoId, rondas) =>
    client.patch(`/eventos/${eventoId}/torneo/${torneoId}/rondas`, { rondas }).then(r => r.data),

  /* Quién califica este torneo. Estar aquí ES el permiso — no es un rol. */
  jurados         : (eventoId, torneoId) => client.get(`/eventos/${eventoId}/torneo/${torneoId}/jurados`).then(r => r.data),
  agregarJurado   : (eventoId, torneoId, userId) =>
    client.post(`/eventos/${eventoId}/torneo/${torneoId}/jurados`, { user_id: userId }).then(r => r.data),
  quitarJurado    : (eventoId, torneoId, userId) =>
    client.delete(`/eventos/${eventoId}/torneo/${torneoId}/jurados/${userId}`).then(r => r.data),

  /* Lo que ve y manda el jurado asignado (assertEsJurado decide el acceso, no
     un permiso del catálogo). */
  calificar       : (eventoId, torneoId) => client.get(`/eventos/${eventoId}/torneo/${torneoId}/calificar`).then(r => r.data),
  guardarNotas    : (eventoId, torneoId, body) =>
    client.put(`/eventos/${eventoId}/torneo/${torneoId}/calificar`, body).then(r => r.data),

  /* Sólo modo_rondas = 'eliminatoria': cierra la ronda abierta y clasifica. */
  cerrarRonda     : (eventoId, torneoId) => client.post(`/eventos/${eventoId}/torneo/${torneoId}/cerrar-ronda`).then(r => r.data),

  /* Tabla de posiciones de una ronda (la abierta, o la última, si no se pide otra). */
  tabla           : (eventoId, torneoId, rondaId) =>
    client.get(`/eventos/${eventoId}/torneo/${torneoId}/tabla-jurado`, { params: rondaId ? { ronda_id: rondaId } : {} }).then(r => r.data),
};
