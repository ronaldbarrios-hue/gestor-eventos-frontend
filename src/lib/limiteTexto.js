/* Cuánto se puede escribir en una pregunta de texto.
 *
 * ── Por qué está aquí y no dentro del componente ─────────────────────────
 *
 * Esto es una regla, no una pantalla: cuenta palabras y decide si alguien se
 * pasó. Vivía dentro de `CampoFormulario.jsx` y eso dejaba sus pruebas
 * saltándose solas —node no importa JSX—, o sea comprobando nada mientras
 * decían «ok». Es el mismo sitio del que ya salieron las reglas por tipo a
 * `lib/validarDato.js`.
 *
 * ── Los dos límites, y por qué son dos ───────────────────────────────────
 *
 * «100 caracteres» es una restricción de ESPACIO —cabe en la etiqueta, cabe en
 * la columna—. «10 palabras» es una restricción de FORMA —sé breve—. Convertir
 * una en otra obliga a adivinar cuánto mide una palabra. Se pueden usar juntos
 * o por separado, y ninguno es obligatorio.
 *
 * Sólo en texto y párrafo: en un correo el límite ya lo pone su verificación, y
 * en una selección lo ponen sus opciones.
 */

export const TIPOS_CON_LIMITE = new Set(['texto', 'parrafo']);

/* MISMA regla que `contarPalabras` en lib/formularioCampos.js del servidor —hay
   una prueba que compara las dos funciones—. Si contaran distinto, el contador
   diría 10 y el servidor 11: el formulario se volvería imposible de enviar sin
   que nada en pantalla explique la contradicción.

   Separa por espacios: los saltos de línea y los espacios dobles no suman, y un
   guion no parte la palabra («veinticuatro-siete» es una). */
export function contarPalabras(texto) {
  return String(texto ?? '').trim().split(/\s+/).filter(Boolean).length;
}

/* Lo que hay que enseñar mientras se escribe, o null si esa pregunta no tiene
   límite. `pasado` es lo que decide el color: avisar ANTES de enviar es la
   diferencia entre corregir una línea y perder el formulario entero. */
export function limiteDe(campo, valor, tipo = campo?.tipo) {
  if (!TIPOS_CON_LIMITE.has(tipo)) return null;
  const maxC = Number(campo?.max_caracteres) || 0;
  const maxP = Number(campo?.max_palabras) || 0;
  if (!maxC && !maxP) return null;

  const texto = String(valor ?? '');
  const usadoC = texto.length;
  const usadoP = contarPalabras(texto);
  return {
    maxC, maxP, usadoC, usadoP,
    pasado: (maxC > 0 && usadoC > maxC) || (maxP > 0 && usadoP > maxP),
  };
}

/* El mensaje, con lo único accionable: por cuánto se pasó. «Demasiado largo»
   obliga a borrar a ojo hasta que deje de quejarse. */
export function mensajeLimite(campo, lim) {
  if (!lim?.pasado) return null;
  if (lim.maxC > 0 && lim.usadoC > lim.maxC) {
    return `«${campo.etiqueta}»: máximo ${lim.maxC} caracteres. Llevas ${lim.usadoC}, te sobran ${lim.usadoC - lim.maxC}.`;
  }
  return `«${campo.etiqueta}»: máximo ${lim.maxP} palabras. Llevas ${lim.usadoP}, te sobran ${lim.usadoP - lim.maxP}.`;
}
