import client from './client.js';

export const analyticsApi = {
  get: (eventoId, dias = 30) => client.get(`/eventos/${eventoId}/analytics`, { params: { dias } }).then(r => r.data),
};
