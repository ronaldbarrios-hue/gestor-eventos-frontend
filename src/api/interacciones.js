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

  /* Canje con el MISMO QR de la escarapela.
     Consulta, pero va por POST: el `qr_token` es lo que valida una boleta, y en
     la query string quedaría escrito en los logs de acceso del servidor y en el
     historial del navegador. En el cuerpo, no. */
  saldo         : (eventoId, body)    => client.post(`/eventos/${eventoId}/canje/saldo`, body).then(r => r.data),
  canjear       : (eventoId, body)    => client.post(`/eventos/${eventoId}/canje`, body).then(r => r.data),

  /* Ranking de expositores por puntos otorgados e interacciones. */
  rankingExpositores: (eventoId) => client.get(`/eventos/${eventoId}/expositores/ranking`).then(r => r.data),
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
  /* POST y no GET, por lo mismo que arriba: el qr_token no va en la URL. */
  saldo         : (codigo, body)    => client.post(`${EXPO(codigo)}/canje/saldo`, body).then(r => r.data),
  canjear       : (codigo, body)    => client.post(`${EXPO(codigo)}/canje`, body).then(r => r.data),
  franjas       : (codigo)          => client.get(`${EXPO(codigo)}/franjas`).then(r => r.data),
  crearFranja   : (codigo, body)    => client.post(`${EXPO(codigo)}/franjas`, body).then(r => r.data),
  /* Faltaba, y su ausencia dejaba «borra y vuelve a crearla» como única forma
     de corregir una errata en el título o mover media hora una demo. El
     endpoint existía desde el principio (`routes/expositor.js`), filtrando
     por `expositor_id` para que nadie toque la franja de otro. */
  editarFranja  : (codigo, id, body) => client.patch(`${EXPO(codigo)}/franjas/${id}`, body).then(r => r.data),
  borrarFranja  : (codigo, id)      => client.delete(`${EXPO(codigo)}/franjas/${id}`).then(r => r.data),
};

/* Portal del CAPITÁN de un equipo de torneo — autenticado por el código de su
   boleta de inscripción, igual que el expositor con la suya. Base pública
   /eventos/publicos/equipo/:codigo/… */
const EQUIPO = (codigo) => `/eventos/publicos/equipo/${codigo}`;
export const equipoTorneoApi = {
  panel   : (codigo)       => client.get(`${EQUIPO(codigo)}/panel`).then(r => r.data),
  guardar : (codigo, body) => client.put(`${EQUIPO(codigo)}/ficha`, body).then(r => r.data),
};
