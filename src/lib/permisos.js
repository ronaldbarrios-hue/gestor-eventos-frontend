/* Catálogo central de permisos por rol dentro de un evento.
   Cada permiso tiene id, label, descripción y grupo. */

export const PERMISOS = [
  /* Evento */
  { id: 'editar_evento',         grupo: 'Evento',    label: 'Editar evento',           desc: 'Cambiar título, descripción, fechas, ubicación y modalidad.' },
  { id: 'publicar_evento',       grupo: 'Evento',    label: 'Publicar / cancelar',     desc: 'Cambiar el estado del evento.' },
  { id: 'editar_pagina_publica', grupo: 'Evento',    label: 'Editar página pública',   desc: 'Usar el editor visual de bloques.' },
  { id: 'gestionar_imagenes',    grupo: 'Evento',    label: 'Imágenes y galería',      desc: 'Subir y borrar portada y galería.' },

  /* Equipo */
  { id: 'invitar_staff',         grupo: 'Equipo',    label: 'Invitar al equipo',       desc: 'Agregar nuevas personas como staff.' },
  { id: 'gestionar_roles',       grupo: 'Equipo',    label: 'Gestionar roles',         desc: 'Crear, editar y borrar roles del evento.' },
  { id: 'remover_miembros',      grupo: 'Equipo',    label: 'Quitar miembros',         desc: 'Sacar gente del equipo del evento.' },

  /* Tickets */
  { id: 'gestionar_tickets',     grupo: 'Tickets',   label: 'Gestionar tipos de boleta', desc: 'Crear, editar y borrar tipos de ticket.' },
  { id: 'gestionar_descuentos',  grupo: 'Tickets',   label: 'Códigos de descuento',    desc: 'Crear y administrar cupones.' },

  /* Clientes */
  { id: 'ver_clientes',          grupo: 'Clientes',  label: 'Ver lista de clientes',   desc: 'Acceso a la lista de inscritos.' },
  { id: 'gestionar_clientes',    grupo: 'Clientes',  label: 'Editar clientes',         desc: 'Cambiar estado, reembolsar, invalidar.' },
  { id: 'checkin',               grupo: 'Clientes',  label: 'Hacer check-in',          desc: 'Escanear QR y marcar asistencia.' },
  { id: 'vip_zone',              grupo: 'Clientes',  label: 'Acceso zona VIP',         desc: 'Atender la zona VIP.' },

  /* Chat */
  { id: 'crear_canales',         grupo: 'Chat',      label: 'Crear canales',           desc: 'Crear chats principales y subgrupos.' },
  { id: 'borrar_mensajes',       grupo: 'Chat',      label: 'Moderar mensajes',        desc: 'Borrar mensajes de otros miembros.' },

  /* Pagos */
  { id: 'ver_pagos',             grupo: 'Pagos',     label: 'Ver pagos e ingresos',    desc: 'Acceso al dashboard financiero.' },
  { id: 'reembolsar',            grupo: 'Pagos',     label: 'Emitir reembolsos',       desc: 'Devolver dinero a clientes.' },

  /* Analytics */
  { id: 'ver_analytics',         grupo: 'Analytics', label: 'Ver analytics',           desc: 'Métricas, conversión y reportes.' },
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
