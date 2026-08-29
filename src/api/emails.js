import client from './client.js';

/* Servicio de correos del evento (backend: routes/emails.js).
   Las plantillas viven en page_json.emails; el backend las renderiza y envía
   por el SMTP propio. */
export const emailsApi = {
  prueba: (eventoId, tipo) =>
    client.post(`/eventos/${eventoId}/emails/prueba`, { tipo }).then(r => r.data),
  enviar: (eventoId, { tipo, audiencia }) =>
    client.post(`/eventos/${eventoId}/emails/enviar`, { tipo, audiencia }).then(r => r.data),

  /* La cola: cuántos esperan, cuántos no salieron, y el botón de volver a
     intentarlo. Lo que la cola marca como fallido —tres intentos, o un envío
     que se quedó a medias porque el proceso murió— no se reenvía solo a
     propósito: insistir con una dirección que rebota quema la reputación del
     dominio, y reenviar lo interrumpido duplicaría la boleta. */
  cola: (eventoId) =>
    client.get(`/eventos/${eventoId}/emails/cola`).then(r => r.data),
  reintentarCola: (eventoId) =>
    client.post(`/eventos/${eventoId}/emails/cola/reintentar`).then(r => r.data),
};
