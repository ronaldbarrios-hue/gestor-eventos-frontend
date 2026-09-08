/* «Mostrar sólo si…»: el editor de una condición, para CUALQUIER formulario.
 *
 * Vivía dentro de `FormularioTab`, o sea sólo en el formulario del evento. El
 * de los sub-eventos y el de los torneos comparten otro editor
 * —`PreguntasSubEvento`— y ahí no había forma de poner una condición, aunque
 * el servidor las guarda y la página pública las respeta desde siempre: eran
 * tres formularios y una sola pantalla donde configurarlas.
 *
 * Está aquí, y no copiado en el segundo, porque copiarlo es exactamente cómo
 * se separaron las otras cuatro listas de esta base.
 */
import { posiblesAntecedentes, valoresDe, OPERADORES_CONDICION } from '../lib/camposCondicionales.js';

/* ─────────── Condición: cuándo se enseña esta pregunta ───────────

   «Si vive en zona rural, se abren estas opciones; si urbana, estas otras.»

   Dos restricciones que no son adorno:

   · El antecedente sólo puede ser una pregunta ANTERIOR. Depender de una que
     todavía no se ha hecho no significa nada, y de paso hace imposible el
     ciclo por construcción en vez de tener que cazarlo al evaluar.
   · Y sólo de opciones cerradas. Condicionar sobre un texto libre obliga a
     acertar la respuesta letra por letra, y la primera tilde de más rompe la
     regla sin que nadie entienda por qué.

   Si no hay ninguna pregunta que cumpla las dos, no se enseña el editor: un
   desplegable vacío invita a pelearse con él. */
export default function CondicionEditor({ campo, campos, onChange }) {
  const antecedentes = posiblesAntecedentes(campos, campo._key || campo._k || campo.id);
  const cond = campo.visible_si || null;
  const origen = antecedentes.find(a => a.id === cond?.campo) || null;
  const valores = valoresDe(origen);

  if (antecedentes.length === 0) {
    return cond ? (
      <p className="text-[11px] text-warning">
        Esta pregunta tenía una condición, pero ya no hay ninguna pregunta de opciones antes que ella.
        Se mostrará siempre.
      </p>
    ) : null;
  }

  if (!cond) {
    return (
      <button onClick={() => onChange({ campo: antecedentes[0].id, op: '=', valor: valoresDe(antecedentes[0])[0] ?? '' })}
        className="text-[11px] text-primary hover:underline w-fit">
        + Mostrar sólo si…
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2/40 px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Mostrar sólo si</p>
        <button onClick={() => onChange(null)} className="text-[11px] text-text-3 hover:text-danger transition-colors">
          Quitar condición
        </button>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        <select value={cond.campo}
          onChange={e => {
            const nuevo = antecedentes.find(a => a.id === e.target.value);
            /* Al cambiar de pregunta, el valor viejo casi nunca existe en la
               nueva: se pone el primero de las suyas en vez de dejar una
               condición que no se puede cumplir nunca. */
            onChange({ campo: e.target.value, op: cond.op, valor: valoresDe(nuevo)[0] ?? '' });
          }}
          className="input rounded-lg py-1.5 text-xs">
          {antecedentes.map(a => <option key={a.id} value={a.id}>{a.etiqueta || '(sin enunciado)'}</option>)}
        </select>
        <select value={cond.op} onChange={e => onChange({ ...cond, op: e.target.value })}
          className="input rounded-lg py-1.5 text-xs">
          {OPERADORES_CONDICION.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {valores.length > 0 ? (
          <select value={String(cond.valor ?? '')} onChange={e => onChange({ ...cond, valor: e.target.value })}
            className="input rounded-lg py-1.5 text-xs">
            {valores.map(v => <option key={v} value={v}>{v === 'true' ? 'Marcada' : v === 'false' ? 'Sin marcar' : v}</option>)}
          </select>
        ) : (
          <input value={String(cond.valor ?? '')} onChange={e => onChange({ ...cond, valor: e.target.value })}
            className="input rounded-lg py-1.5 text-xs" placeholder="valor" />
        )}
      </div>
      {campo.requerido && (
        <p className="text-[11px] text-text-3">
          Sigue siendo obligatoria, pero sólo cuando se muestra: si la condición no se cumple, no se le pide a nadie.
        </p>
      )}
    </div>
  );
}

