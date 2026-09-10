import client from './client.js';

export const auditoriaApi = {
  /* `params` lleva page, limit, accion y q. Se servian las ultimas 100 y no se
     decia: en un evento con equipo, cien apuntes son un dia — o sea que «quien
     toco que» contestaba sobre hoy y parecia contestar sobre el evento. */
  list: (eventoId, params = {}) =>
    client.get(`/eventos/${eventoId}/auditoria`, { params }).then(r => r.data),
};
