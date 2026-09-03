/* Cómo se escribe el número de un stand.
 *
 * El campo es texto libre y la etiqueta ya dice «Stand», así que quien escribe
 * «Stand C10» —que es lo natural, porque el campo se llama Stand— acaba viendo
 * «STAND STAND C10» en el directorio público. Visto en producción.
 *
 * Se limpia al PINTAR y no al guardar: lo que el organizador escribió es suyo,
 * y reescribirle el dato por detrás es peor que enseñarlo bien. */
export function numeroDeStand(valor) {
  return String(valor ?? '').trim().replace(/^stand\s*[:.\-–]?\s*/i, '').trim();
}
