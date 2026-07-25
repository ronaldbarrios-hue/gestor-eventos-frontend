import client from './client.js';

/* Stands: catálogo de motivos + escaneo de la escarapela.
   Los puntos cuelgan del ticket (funciona con asistentes sin cuenta). */
export const interaccionesApi = {
  motivos       : (eventoId)          => client.get(`/eventos/${eventoId}/motivos`).then(r => r.data),
  guardarMotivos: (eventoId, motivos) => client.put(`/eventos/${eventoId}/motivos`, { motivos }).then(r => r.data),

  /* body: { qr_token | codigo, motivo_id?, nota?, lugar? } */
  registrar     : (eventoId, body)    => client.post(`/eventos/${eventoId}/interacciones`, body).then(r => r.data),
  historial     : (eventoId, params)  => client.get(`/eventos/${eventoId}/interacciones`, { params }).then(r => r.data),
  borrar        : (eventoId, id)      => client.delete(`/eventos/${eventoId}/interacciones/${id}`).then(r => r.data),

  /* Canje con el MISMO QR de la escarapela. */
  saldo         : (eventoId, params)  => client.get(`/eventos/${eventoId}/canje/saldo`, { params }).then(r => r.data),
  canjear       : (eventoId, body)    => client.post(`/eventos/${eventoId}/canje`, body).then(r => r.data),
};

/* Panel del EXPOSITOR — autenticado por el código de su boleta-Stand.
   Base pública /eventos/publicos/expositor/:codigo/... */
const EXPO = (codigo) => `/eventos/publicos/expositor/${codigo}`;
export const expositorApi = {
  panel         : (codigo)          => client.get(`${EXPO(codigo)}/panel`).then(r => r.data),
  guardarMotivos: (codigo, motivos) => client.put(`${EXPO(codigo)}/motivos`, { motivos }).then(r => r.data),
  registrar     : (codigo, body)    => client.post(`${EXPO(codigo)}/interacciones`, body).then(r => r.data),
  historial     : (codigo)          => client.get(`${EXPO(codigo)}/interacciones`).then(r => r.data),
  recompensas   : (codigo)          => client.get(`${EXPO(codigo)}/recompensas`).then(r => r.data),
  guardarRecompensas: (codigo, recompensas) => client.put(`${EXPO(codigo)}/recompensas`, { recompensas }).then(r => r.data),
  saldo         : (codigo, params)  => client.get(`${EXPO(codigo)}/canje/saldo`, { params }).then(r => r.data),
  canjear       : (codigo, body)    => client.post(`${EXPO(codigo)}/canje`, body).then(r => r.data),
  franjas       : (codigo)          => client.get(`${EXPO(codigo)}/franjas`).then(r => r.data),
  crearFranja   : (codigo, body)    => client.post(`${EXPO(codigo)}/franjas`, body).then(r => r.data),
  borrarFranja  : (codigo, id)      => client.delete(`${EXPO(codigo)}/franjas/${id}`).then(r => r.data),
};
