import client from './client.js';

/* Conexiones que el organizador hace con SU cuenta: hoy la de Anthropic, que
   es la que paga el asistente. La llave nunca vuelve del servidor — sólo una
   pista y el resultado de la última comprobación. */
export const conexionesApi = {
  verIA    : ()      => client.get('/me/conexiones/ia').then(r => r.data),
  guardarIA: (body)  => client.put('/me/conexiones/ia', body).then(r => r.data),
  probarIA : ()      => client.post('/me/conexiones/ia/probar').then(r => r.data),
  borrarIA : ()      => client.delete('/me/conexiones/ia').then(r => r.data),
};
