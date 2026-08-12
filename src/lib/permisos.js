/* Catálogo central de permisos por rol dentro de un evento.
   Cada permiso tiene id, label, descripción y grupo.

   `aplicado` dice si el servidor lo VERIFICA de verdad hoy. Los que están en
   `false` se pueden conceder y no cambian nada todavía: se dejan porque los
   roles semilla ya los reparten y esconderlos haría que un rol tuviera
   permisos invisibles en su propia pantalla de edición. Con la marca, quien
   arma un rol sabe cuál va a surtir efecto.

   Faltaban tres que el backend SÍ comprueba —`gestionar_agenda`,
   `gestionar_expositores` y `gestionar_torneo`— y que la semilla de la 0054
   reparte entre Editor, Coordinador, Expositor, Speaker y Moderación. Al no
   estar aquí, no se podían conceder a mano y un rol podía tener poderes que
   su propio editor no enseñaba. */

export const PERMISOS = [
  /* Evento */
  { id: 'editar_evento',         grupo: 'Evento',    label: 'Editar evento',           desc: 'Cambiar título, descripción, fechas, ubicación y modalidad.', aplicado: true },
  { id: 'publicar_evento',       grupo: 'Evento',    label: 'Publicar / cancelar',     desc: 'Cambiar el estado del evento.', aplicado: true },
  { id: 'editar_pagina_publica', grupo: 'Evento',    label: 'Editar página pública',   desc: 'Usar el editor visual, la marca y la publicación.', aplicado: true },
  { id: 'gestionar_imagenes',    grupo: 'Evento',    label: 'Imágenes y galería',      desc: 'Subir y borrar portada y galería.', aplicado: true },

  /* Espacio del evento */
  { id: 'gestionar_agenda',      grupo: 'Espacio',   label: 'Gestionar el espacio',    desc: 'Crear y editar sub-eventos: charlas, talleres, shows, competencias.', aplicado: true },
  { id: 'gestionar_torneo',      grupo: 'Espacio',   label: 'Gestionar torneos',       desc: 'Equipos, llaves, resultados y categorías.', aplicado: true },
  { id: 'gestionar_expositores', grupo: 'Espacio',   label: 'Gestionar expositores',   desc: 'Stands, fichas y puntos de los expositores.', aplicado: true },

  /* Equipo */
  { id: 'invitar_staff',         grupo: 'Equipo',    label: 'Invitar al equipo',       desc: 'Agregar nuevas personas como staff.', aplicado: true },
  { id: 'gestionar_roles',       grupo: 'Equipo',    label: 'Gestionar roles',         desc: 'Crear, editar y borrar roles del evento.', aplicado: true },
  { id: 'remover_miembros',      grupo: 'Equipo',    label: 'Quitar miembros',         desc: 'Sacar gente del equipo del evento.', aplicado: true },

  /* Tickets */
  { id: 'gestionar_tickets',     grupo: 'Tickets',   label: 'Gestionar tipos de boleta', desc: 'Crear, editar y borrar tipos de ticket.', aplicado: true },
  { id: 'gestionar_descuentos',  grupo: 'Tickets',   label: 'Códigos de descuento',    desc: 'Crear y administrar cupones.', aplicado: false },

  /* Clientes */
  { id: 'ver_clientes',          grupo: 'Clientes',  label: 'Ver lista de clientes',   desc: 'Acceso a la lista de inscritos.', aplicado: true },
  { id: 'gestionar_clientes',    grupo: 'Clientes',  label: 'Editar clientes',         desc: 'Cambiar estado, reembolsar, invalidar.', aplicado: true },
  { id: 'checkin',               grupo: 'Clientes',  label: 'Hacer check-in',          desc: 'Escanear QR y marcar asistencia.', aplicado: true },
  { id: 'vip_zone',              grupo: 'Clientes',  label: 'Acceso zona VIP',         desc: 'Atender la zona VIP.', aplicado: false },

  /* Chat */
  { id: 'crear_canales',         grupo: 'Chat',      label: 'Crear canales',           desc: 'Crear chats principales y subgrupos.', aplicado: false },
  { id: 'borrar_mensajes',       grupo: 'Chat',      label: 'Moderar mensajes',        desc: 'Borrar mensajes de otros miembros.', aplicado: false },

  /* Pagos */
  { id: 'ver_pagos',             grupo: 'Pagos',     label: 'Ver pagos e ingresos',    desc: 'Acceso al dashboard financiero.', aplicado: false },
  { id: 'reembolsar',            grupo: 'Pagos',     label: 'Emitir reembolsos',       desc: 'Devolver dinero a clientes.', aplicado: false },

  /* Analytics */
  { id: 'ver_analytics',         grupo: 'Analytics', label: 'Ver analytics',           desc: 'Métricas, conversión y reportes.', aplicado: true },
];

/* Agrupado para UI */
export function permisosPorGrupo() {
  const map = new Map();
  for (const p of PERMISOS) {
    if (!map.has(p.grupo)) map.set(p.grupo, []);
    map.get(p.grupo).push(p);
  }
  return Array.from(map.entries()); // [['Evento', [...]], ['Equipo', [...]], ...]
}

export function labelFor(id) {
  return PERMISOS.find(p => p.id === id)?.label || id;
}
