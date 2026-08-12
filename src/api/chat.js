import client from './client.js';

export const chatApi = {
  channels       : (eventoId)                        => client.get(`/eventos/${eventoId}/chat/channels`).then(r => r.data),
  crearChannel   : (eventoId, body)                  => client.post(`/eventos/${eventoId}/chat/channels`, body).then(r => r.data),
  editarChannel  : (eventoId, channelId, body)       => client.patch(`/eventos/${eventoId}/chat/channels/${channelId}`, body).then(r => r.data),
  borrarChannel  : (eventoId, channelId)             => client.delete(`/eventos/${eventoId}/chat/channels/${channelId}`).then(r => r.data),
  messages       : (eventoId, channelId, params={})  => client.get(`/eventos/${eventoId}/chat/channels/${channelId}/messages`, { params }).then(r => r.data),
  enviar         : (eventoId, channelId, body)       => client.post(`/eventos/${eventoId}/chat/channels/${channelId}/messages`, body).then(r => r.data),
  abrirDM        : (eventoId, user_id)               => client.post(`/eventos/${eventoId}/chat/dm`, { user_id }).then(r => r.data),

  /* Borrado suave: el mensaje se marca y se pinta como eliminado. El propio
     siempre; los de otros solo con el permiso `borrar_mensajes`. */
  borrarMensaje  : (eventoId, channelId, messageId) =>
    client.delete(`/eventos/${eventoId}/chat/channels/${channelId}/messages/${messageId}`).then(r => r.data),

  /* Anclar, archivar y marcar leído son de cada persona, no del canal. */
  prefs          : (eventoId, channelId, body) =>
    client.patch(`/eventos/${eventoId}/chat/channels/${channelId}/prefs`, body).then(r => r.data),
};
