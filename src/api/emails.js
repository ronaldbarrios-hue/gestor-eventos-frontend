import client from './client.js';

/* Servicio de correos del evento (backend: routes/emails.js).
   Las plantillas viven en page_json.emails; el backend las renderiza y envía
   por el SMTP propio. */
export const emailsApi = {
  prueba: (eventoId, tipo) =>
    client.post(`/eventos/${eventoId}/emails/prueba`, { tipo }).then(r => r.data),
  enviar: (eventoId, { tipo, audiencia }) =>
    client.post(`/eventos/${eventoId}/emails/enviar`, { tipo, audiencia }).then(r => r.data),
};
