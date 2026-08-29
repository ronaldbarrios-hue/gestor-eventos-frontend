/* Qué preguntas se ven, según lo que ya contestó la persona.
 *
 * Espejo de `camposVisibles` en lib/formularioCampos.js del backend. Los dos
 * lados hacen falta y hacen cosas distintas:
 *
 *   · Aquí decide qué se PINTA, para que la pregunta aparezca y desaparezca
 *     mientras se rellena.
 *   · Allí decide qué se EXIGE, porque el navegador puede mentir sobre lo que
 *     enseñó: si la exigencia se decidiera aquí, bastaría con no pintar un
 *     campo para saltarse un obligatorio.
 *
 * Si esta lógica cambia, tiene que cambiar en los dos. Es el precio de que el
 * formulario reaccione al instante sin dejar el servidor a merced del cliente.
 *
 * La forma de la condición está en la migración 0084:
 *   visible_si = { campo: <id>, op: '=' | '!=' | 'incluye', valor: any }
 */

export const OPERADORES_CONDICION = [
  { value: '=',       label: 'es igual a' },
  { value: '!=',      label: 'es distinto de' },
  { value: 'incluye', label: 'incluye' },
];

export function cumpleCondicion(cond, respuestas) {
  if (!cond || typeof cond !== 'object' || !cond.campo) return true;
  const v = respuestas?.[cond.campo];
  const esperado = cond.valor;
  switch (cond.op) {
    case '!=':      return String(v ?? '') !== String(esperado ?? '');
    /* Para las de opción múltiple, donde la respuesta es una lista. */
    case 'incluye': return Array.isArray(v)
      ? v.map(String).includes(String(esperado))
      : String(v ?? '') === String(esperado);
    case '=':
    default:        return String(v ?? '') === String(esperado ?? '');
  }
}

/* En cascada y no de una pasada: si A depende de B y B depende de C, ocultar C
   tiene que ocultar también A. Se repite hasta que nada cambia, con un tope de
   vueltas que además corta los ciclos (A↔B). */
export function camposVisibles(campos, respuestas = {}) {
  const lista = Array.isArray(campos) ? campos : [];
  const oculto = new Set();
  for (let vuelta = 0; vuelta < lista.length + 1; vuelta++) {
    let cambio = false;
    for (const c of lista) {
      if (oculto.has(c.id)) continue;
      const cond = c.visible_si;
      if (!cond?.campo) continue;
      if (oculto.has(cond.campo) || !cumpleCondicion(cond, respuestas)) {
        oculto.add(c.id); cambio = true;
      }
    }
    if (!cambio) break;
  }
  return lista.filter(c => !oculto.has(c.id));
}

/* Qué campos pueden ser el antecedente de una condición.

   Sólo los de opciones cerradas: condicionar sobre un texto libre obliga a
   acertar la respuesta letra por letra, y la primera tilde de más rompe la
   regla sin que nadie entienda por qué.

   Y sólo los ANTERIORES en el orden: una pregunta no puede depender de otra
   que todavía no se ha hecho. Eso además hace imposible el ciclo por
   construcción, en vez de tener que cazarlo al evaluar. */
const TIPOS_CONDICIONABLES = new Set(['seleccion', 'multiple', 'checkbox']);

export function posiblesAntecedentes(campos, claveActual) {
  const lista = Array.isArray(campos) ? campos : [];
  const i = lista.findIndex(c => (c._key || c.id) === claveActual);
  const antes = i < 0 ? lista : lista.slice(0, i);
  return antes.filter(c =>
    TIPOS_CONDICIONABLES.has(c.tipo)
    /* Y que ya exista en el servidor. Una pregunta recién añadida todavía no
       tiene `id`, y la condición guarda ese id: apuntar a una sin guardar
       dejaría una referencia a nada en cuanto el servidor le asignara el suyo.
       Se ofrece después de guardar, que es cuando la referencia es estable. */
    && Boolean(c.id)
    && (c.opciones?.length || c.tipo === 'checkbox'));
}

/* Los valores que se pueden elegir como `valor` de la condición. */
export function valoresDe(campo) {
  if (!campo) return [];
  if (campo.tipo === 'checkbox') return ['true', 'false'];
  return Array.isArray(campo.opciones) ? campo.opciones.map(String) : [];
}
