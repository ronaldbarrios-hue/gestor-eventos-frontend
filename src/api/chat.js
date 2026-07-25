import client from './client.js';

export const chatApi = {
  channels       : (eventoId)                        => client.get(`/eventos/${eventoId}/chat/channels`).then(r => r.data),
  crearChannel   : (eventoId, body)                  => client.post(`/eventos/${eventoId}/chat/channels`, body).then(r => r.data),
  editarChannel  : (eventoId, channelId, body)       => client.patch(`/eventos/${eventoId}/chat/channels/${channelId}`, body).then(r => r.data),
  borrarChannel  : (eventoId, channelId)             => client.delete(`/eventos/${eventoId}/chat/channels/${channelId}`).then(r => r.data),
  messages       : (eventoId, channelId, params={})  => client.get(`/eventos/${eventoId}/chat/channels/${channelId}/messages`, { params }).then(r => r.data),
  enviar         : (eventoId, channelId, body)       => client.post(`/eventos/${eventoId}/chat/channels/${channelId}/messages`, body).then(r => r.data),
};
