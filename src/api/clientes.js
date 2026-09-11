import client from './client.js';

export const clientesApi = {
  /* Un adjunto marcado como sensible. No hay URL que pintar: en la respuesta
     vive una referencia. El servidor comprueba el permiso, firma un enlace que
     caduca y anota quien lo abrio. */
  archivoPrivado: (eventoId, ticketId, campoId) =>
    client.get(`/eventos/${eventoId}/clientes/${ticketId}/archivo`, { params: { campo: campoId } }).then(r => r.data),
  list         : (eventoId, params = {})        => client.get(`/eventos/${eventoId}/clientes`, { params }).then(r => r.data),
  /* TODOS los asistentes, recorriendo las paginas que hagan falta.
   *
   * Seis pantallas pedian `limit: 1000` —imprimir escarapelas, carnes,
   * etiquetas, accesos, invitaciones y facturacion— y el servidor sirve como
   * mucho 200 por peticion. Se quedaban con las primeras 200 sin decirlo: un
   * juego de escarapelas incompleto, y en facturacion unas cuentas que salian
   * de 200 boletas de 386.
   *
   * El corte se decide con lo que el servidor DICE que cabe (`por_pagina`), no
   * con lo que se le pidio: un bucle que pide 500 y compara contra 500 para en
   * la primera tanda el dia que el tope baja. Eso ya paso una vez.
   *
   * El tope de vueltas es un cinturon: 20 tandas son 4.000 boletas, y a partir
   * de ahi lo que se quiere es la exportacion, que va por otro camino y sabe
   * que va a tardar. */
  listarTodos  : async (eventoId, filtros = {}) => {
    const POR_TANDA = 200;
    const todos = [];
    let ultima = null;
    for (let page = 1; page <= 20; page++) {
      const d = await client
        .get(`/eventos/${eventoId}/clientes`, { params: { ...filtros, page, limit: POR_TANDA } })
        .then(r => r.data);
      ultima = d;
      const tanda = d.clientes || [];
      todos.push(...tanda);
      if (tanda.length < (d.por_pagina ?? POR_TANDA)) break;
    }
    /* Se devuelve con la forma de `list` —la misma respuesta, con la lista
       entera dentro— para que quien lo use no tenga que cambiar como lo lee.
       `campos_formulario` y `tipos` vienen en cada pagina; vale el de la
       ultima. */
    return { ...(ultima || {}), clientes: todos, total: ultima?.total ?? todos.length };
  },
  /* Cuanto trajo cada boton de registro. `origen: null` es «directo»: quien
     llego a la pagina del evento sin pasar por ningun boton. */
  origenes     : (eventoId)                     => client.get(`/eventos/${eventoId}/origenes`).then(r => r.data),
  cambiarEstado: (eventoId, ticketId, estado)   => client.patch(`/eventos/${eventoId}/clientes/${ticketId}`, { estado }).then(r => r.data),
  /* Borrar no es anular: anular deja la fila marcada como inválida —y eso está
     bien casi siempre—, esto se la lleva. Es para lo que no debió existir: los
     duplicados de un fallo, las boletas de prueba del montaje. */
  borrar       : (eventoId, ticketId)           => client.delete(`/eventos/${eventoId}/clientes/${ticketId}`).then(r => r.data),
  /* Volver a mandarle la entrada a quien ya la tiene. Va al correo REGISTRADO
     en la boleta —el servidor no acepta destinatario—, y es el mismo correo que
     sale al pagar, con la plantilla del evento. */
  reenviar     : (eventoId, ticketId)           => client.post(`/eventos/${eventoId}/clientes/${ticketId}/reenviar`).then(r => r.data),
  /* Cuánto entró, de qué, qué falta por cobrar y qué se devolvió. Permiso
     `ver_pagos`. */
  dinero       : (eventoId)                     => client.get(`/eventos/${eventoId}/dinero`).then(r => r.data),
  /* Deja constancia del reembolso. NO mueve dinero: eso se hace en la pasarela.
     Permiso `reembolsar`. */
  reembolsar   : (eventoId, ticketId, motivo)   => client.post(`/eventos/${eventoId}/clientes/${ticketId}/reembolsar`, { motivo }).then(r => r.data),
  checkin      : (eventoId, body)               => client.post(`/eventos/${eventoId}/checkin`, body).then(r => r.data),
  reingreso    : (eventoId, body)               => client.post(`/eventos/${eventoId}/reingreso`, body).then(r => r.data),
  aforoZonas   : (eventoId)                      => client.get(`/eventos/${eventoId}/zonas/aforo`).then(r => r.data),
  /* Entrada/salida de una zona SIN boleta: el contador de mano del staff. */
  movimientoZona: (eventoId, body)              => client.post(`/eventos/${eventoId}/zonas/movimiento`, body).then(r => r.data),
  /* Pone el contador a cero sin borrar el histórico (escribe un corte). */
  limpiarAforo : (eventoId, body = {})           => client.post(`/eventos/${eventoId}/zonas/limpiar`, body).then(r => r.data),
  reporteZonas : (eventoId, params = {})         => client.get(`/eventos/${eventoId}/zonas/reporte`, { params }).then(r => r.data),
  reporteManual: (eventoId, body)                => client.post(`/eventos/${eventoId}/zonas/reporte-manual`, body).then(r => r.data),
  /* El estado en vivo de todo lo que hay puesto en el plano: aforo de las
     zonas, ingresos por cada puerta e inscripción de cada sub-evento. */
  mapaVivo     : (eventoId)                      => client.get(`/eventos/${eventoId}/mapa/vivo`).then(r => r.data),
  alertas      : (eventoId, params = {})         => client.get(`/eventos/${eventoId}/alertas`, { params }).then(r => r.data),
  reportarAlerta: (eventoId, body)               => client.post(`/eventos/${eventoId}/alertas`, body).then(r => r.data),
  resolverAlerta: (eventoId, id)                 => client.patch(`/eventos/${eventoId}/alertas/${id}/resolver`).then(r => r.data),
  importar     : (eventoId, body)               => client.post(`/eventos/${eventoId}/clientes/importar`, body).then(r => r.data),
  /* `ticketTypeId` exporta UN tipo de boleta. En estos eventos los tipos son
     las actividades, asi que «quien va al DemoDay» es una hoja distinta de «la
     lista del evento»; sin esto habia que exportar las 440 filas y filtrar a
     mano en Excel. Sin el parametro, sale todo como siempre. */
  exportar     : (eventoId, ticketTypeId)       => client.get(`/eventos/${eventoId}/clientes/exportar`, {
    params: ticketTypeId ? { ticket_type_id: ticketTypeId } : {},
  }).then(r => r.data),
};
