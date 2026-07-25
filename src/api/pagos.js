import client from './client.js';

export const pagosApi = {
  /* Settings del organizador */
  test       : ()                  => client.get('/me/mercadopago/test').then(r => r.data),
  conectar   : (mp_access_token, mp_public_key) =>
    client.post('/me/mercadopago/conectar', { mp_access_token, mp_public_key }).then(r => r.data),
  desconectar: ()                  => client.delete('/me/mercadopago').then(r => r.data),

  /* Flujo público de compra */
  comprar    : (slug, body)        => client.post(`/eventos/publicos/slug/${slug}/comprar`, body).then(r => r.data),

};
