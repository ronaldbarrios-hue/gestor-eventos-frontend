/* Los ajustes de la rueda, en el navegador.
 *
 * Espejo de `lib/ajustesRueda.js` del servidor. Aquí se usa para decidir si la
 * pestaña se pinta y para no dejar guardar un tope que la base va a rechazar;
 * el servidor sigue siendo el que manda.
 *
 * Módulo plano —no dentro del `.jsx`— porque es lógica y sus pruebas tienen que
 * poder correrla: node no importa JSX.
 */

/* La lista que decidía la rueda hasta la 0113. Sobrevive por una sola razón:
   mientras el backend viejo siga en pie —y hoy hay dos servidores sirviendo la
   misma API, uno de ellos a mano—, un evento leído sin `networking_activo`
   tiene que seguir enseñando la pestaña que enseñaba ayer. Sin esto, la rueda
   de FESTECH desaparece del panel el día del despliegue. */
export const CATEGORIAS_HEREDADAS = ['negocios', 'marketing', 'tecnologia'];

export function ruedaEncendida(evento) {
  if (!evento) return false;
  if (evento.networking_activo === undefined || evento.networking_activo === null) {
    return CATEGORIAS_HEREDADAS.includes(evento?.categoria?.slug);
  }
  return evento.networking_activo === true;
}

export const TOPE_MAX = 200;

/* null = sin tope · undefined = lo que escribieron no vale */
export function topeValido(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > TOPE_MAX) return undefined;
  return n;
}

export const MOTIVO_MAX = 80;

export function limpiarMotivo(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, ' ').trim().slice(0, MOTIVO_MAX);
  return s || null;
}

/* Cómo se pinta una casilla de la parrilla. Tres estados y no dos: «libre»,
   «ocupada» y «bloqueada» son cosas distintas para quien coordina, y pintar
   las dos últimas igual convierte un bloqueo propio en una reunión que uno no
   recuerda haber puesto. */
export function estadoDeCasilla(horario) {
  if (horario?.cita) return 'ocupada';
  if (horario?.bloqueado) return 'bloqueada';
  return 'libre';
}
