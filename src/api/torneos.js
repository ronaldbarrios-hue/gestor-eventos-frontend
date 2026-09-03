import client from './client.js';

export const torneosApi = {
  /* Lista de torneos del evento (multi-torneo). */
  list             : (eventoId) => client.get(`/eventos/${eventoId}/torneos`).then(r => r.data),
  /* Un torneo concreto con equipos + partidos. */
  getOne           : (eventoId, torneoId) => client.get(`/eventos/${eventoId}/torneos/${torneoId}`).then(r => r.data),
  /* RETROCOMPAT: primer torneo del evento (+ lista en `torneos`). */
  get              : (eventoId) => client.get(`/eventos/${eventoId}/torneo`).then(r => r.data),
  crear            : (eventoId, body) => client.post(`/eventos/${eventoId}/torneo`, body).then(r => r.data),
  editar           : (eventoId, torneoId, body) => client.patch(`/eventos/${eventoId}/torneo/${torneoId}`, body).then(r => r.data),
  borrar           : (eventoId, torneoId) => client.delete(`/eventos/${eventoId}/torneo/${torneoId}`).then(r => r.data),

  /* #48 · El árbol de categorías del evento. Llega plano, con `padre_id`:
     el panel y la página pública lo arman de formas distintas. */
  categorias       : (eventoId) => client.get(`/eventos/${eventoId}/torneo-categorias`).then(r => r.data),
  crearCategoria   : (eventoId, body) => client.post(`/eventos/${eventoId}/torneo-categorias`, body).then(r => r.data),
  editarCategoria  : (eventoId, id, body) => client.patch(`/eventos/${eventoId}/torneo-categorias/${id}`, body).then(r => r.data),
  borrarCategoria  : (eventoId, id) => client.delete(`/eventos/${eventoId}/torneo-categorias/${id}`).then(r => r.data),

  /* 0095 · los campos propios de este torneo: lo que se le pide a un equipo
     además del nombre. Dorsal y posición en fútbol; nick, rango y servidor en
     esports. */
  formulario       : (eventoId, torneoId) => client.get(`/eventos/${eventoId}/torneo/${torneoId}/formulario`).then(r => r.data),
  guardarFormulario: (eventoId, torneoId, campos) => client.put(`/eventos/${eventoId}/torneo/${torneoId}/formulario`, { campos }).then(r => r.data),

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
