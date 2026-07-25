import client from './client.js';

export const meApi = {
  perfil       : ()          => client.get('/me').then(r => r.data),
  actualizar   : (body)      => client.patch('/me', body).then(r => r.data),
  boletas      : ()          => client.get('/me/boletas').then(r => r.data),
  transferir   : (ticketId, body) => client.post(`/me/boletas/${ticketId}/transferir`, body).then(r => r.data),
};
