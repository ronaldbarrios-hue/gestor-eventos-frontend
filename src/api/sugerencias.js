import client from './client.js';

/* #49 · Buzón: qué tipo de evento o de vacante buscaba alguien y no encontró.
   `contexto` es libre y se manda tal cual (el servidor lo acota): sirve para
   entender la sugerencia meses después, cuando ya nadie recuerda desde dónde
   se escribió. */
export const sugerenciasApi = {
  crear: (body) => client.post('/me/sugerencias', body).then(r => r.data),
  mias : ()     => client.get('/me/sugerencias').then(r => r.data),
};
