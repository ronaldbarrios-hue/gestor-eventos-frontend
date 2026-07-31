import client from './client.js';

export const pagosApi = {
  /* Settings del organizador */
  test       : ()                  => client.get('/me/mercadopago/test').then(r => r.data),
  conectar   : (mp_access_token, mp_public_key) =>
    client.post('/me/mercadopago/conectar', { mp_access_token, mp_public_key }).then(r => r.data),
  desconectar: ()                  => client.delete('/me/mercadopago').then(r => r.data),

  /* Wompi (pasarela colombiana) */
  wompiEstado     : ()      => client.get('/me/wompi').then(r => r.data),
  wompiConectar   : (body)  => client.post('/me/wompi/conectar', body).then(r => r.data),
  wompiDesconectar: ()      => client.delete('/me/wompi').then(r => r.data),

  /* Flujo público de compra */
  comprar     : (slug, body) => client.post(`/eventos/publicos/slug/${slug}/comprar`, body).then(r => r.data),
  comprarWompi: (slug, body) => client.post(`/eventos/publicos/slug/${slug}/comprar-wompi`, body).then(r => r.data),
};
