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
  guardarFormulario : (id, campos) => client.put(`/eventos/${id}/formulario`, { campos }).then(r => r.data),
  /* Públicas (sin auth) */
  publicos     : (params = {}) => client.get('/eventos/publicos', { params }).then(r => r.data),
  publicoBySlug: (slug)        => client.get(`/eventos/publicos/slug/${slug}`).then(r => r.data),
  reservar     : (slug, body)  => client.post(`/eventos/publicos/slug/${slug}/reservar`, body).then(r => r.data),
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
  inscribirSesion: (slug, sesionId, body) =>
    client.post(`/eventos/publicos/slug/${slug}/sesiones/${sesionId}/inscribir`, body).then(r => r.data),
  /* Catálogo */
  categorias: () => client.get('/categorias').then(r => r.data),
};
