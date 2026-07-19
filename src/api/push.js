import client from './client.js';

export const pushApi = {
  vapidKey   : ()                => client.get('/push/vapid-key').then(r => r.data),
  subscribe  : (body)            => client.post('/me/push/subscribe', body).then(r => r.data),
  unsubscribe: (endpoint)        => client.delete('/me/push/unsubscribe', { data: { endpoint } }).then(r => r.data),
  test       : ()                => client.post('/me/push/test').then(r => r.data),
  broadcast  : (eventoId, body)  => client.post(`/eventos/${eventoId}/push/broadcast`, body).then(r => r.data),
};
