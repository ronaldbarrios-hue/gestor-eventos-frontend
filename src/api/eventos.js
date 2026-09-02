import client from './client.js';

export const eventosApi = {
  /* Privadas (requieren login) */
  list      : (params = {}) => client.get('/eventos',           { params }).then(r => r.data),
  get       : (id)          => client.get(`/eventos/${id}`).then(r => r.data),
  create    : (body)        => client.post('/eventos', body).then(r => r.data),
  update    : (id, body)    => client.patch(`/eventos/${id}`, body).then(r => r.data),
  delete    : (id)          => client.delete(`/eventos/${id}`).then(r => r.data),
  cambiarEstado: (id, estado) => client.post(`/eventos/${id}/estado`, { estado }).then(r => r.data),
  publicar  : (id) => client.post(`/eventos/${id}/estado`, { estado: 'publicado' }).then(r => r.data),
  cancelar  : (id) => client.post(`/eventos/${id}/estado`, { estado: 'cancelado' }).then(r => r.data),
  archivar  : (id) => client.post(`/eventos/${id}/estado`, { estado: 'archivado' }).then(r => r.data),
  duplicar  : (id, titulo) => client.post(`/eventos/${id}/duplicar`, titulo ? { titulo } : {}).then(r => r.data),
  /* Formulario personalizado de compra */
  getFormulario     : (id)        => client.get(`/eventos/${id}/formulario`).then(r => r.data),
  subirPadron  : (id, filas, origen) => client.post(`/eventos/${id}/padron`, { filas, origen }).then(r => r.data),
  padronEstado : (id)          => client.get(`/eventos/${id}/padron/estado`).then(r => r.data),
  borrarPadron : (id)          => client.delete(`/eventos/${id}/padron`).then(r => r.data),
  /* Qué columna del archivo llena cada pregunta. Por id de pregunta, no por
     su enunciado: renombrar una pregunta no debe romper el prellenado. */
  guardarMapeoPadron: (id, mapeo) => client.put(`/eventos/${id}/padron/mapeo`, { mapeo }).then(r => r.data),
  guardarFormulario : (id, campos) => client.put(`/eventos/${id}/formulario`, { campos }).then(r => r.data),
  /* Públicas (sin auth) */
  publicos     : (params = {}) => client.get('/eventos/publicos', { params }).then(r => r.data),
  /* `seccion` es para el embed: el servidor devuelve SÓLO el bloque de esa
     sección en vez de la landing entera. Sin ella, incrustar «Cómo llegar» en
     una web ajena metía en su DOM todos los demás bloques con su configuración.
     Ver `bloqueDeSeccion` en el backend. */
  publicoBySlug: (slug, seccion) => client
    .get(`/eventos/publicos/slug/${slug}`, seccion ? { params: { seccion } } : undefined)
    .then(r => r.data),
  /* Términos y privacidad PROPIOS del evento (migración 0059). El formulario
     de inscripción los enlaza siempre. */
  legalPublico : (slug)        => client.get(`/eventos/publicos/slug/${slug}/legal`).then(r => r.data),
  legal        : (id)          => client.get(`/eventos/${id}/legal`).then(r => r.data),
  guardarLegal : (id, body)    => client.put(`/eventos/${id}/legal`, body).then(r => r.data),
  reservar     : (slug, body)  => client.post(`/eventos/publicos/slug/${slug}/reservar`, body).then(r => r.data),
  /* Prellenar desde el padrón de eventos anteriores. Va por POST y no por GET:
     una cédula en la query string queda escrita en los logs de acceso del
     servidor y en el historial del navegador. */
  prellenar    : (slug, documento) => client.post(`/eventos/publicos/slug/${slug}/prellenar`, { documento }).then(r => r.data),
  ticketByCode : (codigo)      => client.get(`/eventos/publicos/ticket/${codigo}`).then(r => r.data),
  completarFormularioTicket: (codigo, respuestas) =>
    client.post(`/eventos/publicos/ticket/${codigo}/formulario`, { respuestas }).then(r => r.data),
  fichaExpositor      : (codigo)          => client.get(`/eventos/publicos/expositor/${codigo}`).then(r => r.data),
  guardarFichaExpositor: (codigo, body)   => client.put(`/eventos/publicos/expositor/${codigo}`, body).then(r => r.data),
  torneoPublico: (slug) => client.get(`/eventos/publicos/slug/${slug}/torneo`).then(r => r.data),
  torneoPublicoUno: (slug, torneoId) => client.get(`/eventos/publicos/slug/${slug}/torneos/${torneoId}`).then(r => r.data),
  torneosResumen: (slug) => client.get(`/eventos/publicos/slug/${slug}/torneos-resumen`).then(r => r.data),
  rankingPublico: (slug) => client.get(`/eventos/publicos/slug/${slug}/ranking`).then(r => r.data),
  agendaPublica: (slug) => client.get(`/eventos/publicos/slug/${slug}/agenda`).then(r => r.data),
  /* Apuntarse a un sub-evento desde fuera del panel. Con `codigo` de boleta se
     cuelga de ella y no hay que volver a escribir los datos; sin código hacen
     falta nombre y correo. */
  /* Los sub-eventos con su cupo libre y sus preguntas, sin cuenta ni sesión.
     Es lo que permite ofrecer el segundo registro justo al terminar el
     primero, sin mandar a nadie a otra pantalla. */
  sesionesPublicas: (slug) => client.get(`/eventos/publicos/slug/${slug}/sesiones`).then(r => r.data),
  inscribirSesion: (slug, sesionId, body) =>
    client.post(`/eventos/publicos/slug/${slug}/sesiones/${sesionId}/inscribir`, body).then(r => r.data),
  /* Catálogo */
  categorias: () => client.get('/categorias').then(r => r.data),
};
