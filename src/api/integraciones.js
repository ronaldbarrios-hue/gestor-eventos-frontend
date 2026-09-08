import client from './client.js';

export const integracionesApi = {
  /* tokens */
  listTokens : ()      => client.get('/me/integraciones/tokens').then(r => r.data),
  /* `scopes` decide qué puede hacer Claude. Va desde que se crea y no después:
     un token que nace pudiendo todo y se limita luego ya estuvo pudiendo todo. */
  crearToken : (nombre, scopes) => client.post('/me/integraciones/tokens', { nombre, scopes }).then(r => r.data),
  revocarToken:(id)    => client.delete(`/me/integraciones/tokens/${id}`).then(r => r.data),

  /* webhooks */
  listWebhooks: ()             => client.get('/me/integraciones/webhooks').then(r => r.data),
  crearWebhook: (url, eventos) => client.post('/me/integraciones/webhooks', { url, eventos }).then(r => r.data),
  editarWebhook:(id, body)     => client.patch(`/me/integraciones/webhooks/${id}`, body).then(r => r.data),
  borrarWebhook:(id)           => client.delete(`/me/integraciones/webhooks/${id}`).then(r => r.data),
  deliveries  : (id)           => client.get(`/me/integraciones/webhooks/${id}/deliveries`).then(r => r.data),

  /* Google Calendar (OAuth) */
  googleEstado     : () => client.get('/me/google').then(r => r.data),
  googleConectar   : () => client.get('/me/google/conectar').then(r => r.data),
  googleDesconectar: () => client.delete('/me/google').then(r => r.data),
};
