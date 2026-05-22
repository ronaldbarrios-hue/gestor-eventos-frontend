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

  /* Públicas (sin auth) */
  publicos     : (params = {}) => client.get('/eventos/publicos', { params }).then(r => r.data),
  publicoBySlug: (slug)        => client.get(`/eventos/publicos/slug/${slug}`).then(r => r.data),
  reservar     : (slug, body)  => client.post(`/eventos/publicos/slug/${slug}/reservar`, body).then(r => r.data),
  ticketByCode : (codigo)      => client.get(`/eventos/publicos/ticket/${codigo}`).then(r => r.data),

  /* Catálogo */
  categorias: () => client.get('/categorias').then(r => r.data),
};
