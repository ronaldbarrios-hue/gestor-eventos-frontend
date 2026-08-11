import client from './client.js';

/* Correos del evento (backend: routes/emails.js + lib/emailPlantillas.js).

   El catálogo de tipos y de variables lo manda el backend, no lo repite el
   frontend. Antes había dos listas distintas: aquí se editaban `confirmacion`,
   `bienvenida`, `recordatorio` y `cancelacion`, y los envíos automáticos del
   servidor no leían ninguna de las cuatro. Se diseñaba un correo que nunca
   salía. */
export const emailsApi = {
  /* Tipos, variables, plantillas guardadas y estado del proveedor. */
  catalogo: (eventoId) =>
    client.get(`/eventos/${eventoId}/emails`).then(r => r.data),

  guardar: (eventoId, tipo, plantilla) =>
    client.put(`/eventos/${eventoId}/emails/${tipo}`, plantilla).then(r => r.data),

  /* Borra la plantilla y el tipo vuelve a su texto por defecto. */
  restablecer: (eventoId, tipo) =>
    client.delete(`/eventos/${eventoId}/emails/${tipo}`).then(r => r.data),

  /* Devuelve el HTML de verdad, el mismo que sale por SMTP. `plantilla` puede
     ir sin guardar para ver los cambios mientras se escriben. */
  previsualizar: (eventoId, { tipo, plantilla }) =>
    client.post(`/eventos/${eventoId}/emails/previsualizar`, { tipo, plantilla }).then(r => r.data),

  diagnostico: (eventoId) =>
    client.get(`/eventos/${eventoId}/emails/diagnostico`).then(r => r.data),

  /* Qué se mandó y qué falló. */
  envios: (eventoId, params = {}) =>
    client.get(`/eventos/${eventoId}/emails/envios`, { params }).then(r => r.data),

  prueba: (eventoId, tipo) =>
    client.post(`/eventos/${eventoId}/emails/prueba`, { tipo }).then(r => r.data),

  enviar: (eventoId, { tipo, audiencia }) =>
    client.post(`/eventos/${eventoId}/emails/enviar`, { tipo, audiencia }).then(r => r.data),
};
