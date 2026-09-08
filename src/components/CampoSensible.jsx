/* «Son datos sensibles»: la casilla que decide a qué bucket va un adjunto.
 *
 * Vivía dentro de `FormularioTab`, o sea sólo en el formulario del evento. El
 * de los sub-eventos y el de los torneos comparten otro editor y ahí no
 * estaba: se podía pedir un archivo, pero no decir que era una cédula. Y
 * «sensible» sin marcar no es una casilla apagada — es un enlace que no caduca
 * dentro de `respuestas`, que sale en el CSV de asistentes y viaja por correo
 * en cuanto alguien reenvía la hoja.
 *
 * Está aquí y no copiada porque el texto ES la funcionalidad: quien lo marca
 * decide dónde acaba el documento de otra persona, y dos redacciones distintas
 * de la misma decisión son dos decisiones distintas.
 */
export default function CampoSensible({ campo, onChange }) {
  /* Sólo en un archivo. En cualquier otro tipo es una promesa que nadie
     cumple: quien la marque creerá que ese dato queda protegido, y no cambia
     nada. El servidor lo limpia igual (`filaCampo`). */
  if (campo?.tipo !== 'archivo') return null;

  return (
    <label className="flex items-start gap-2 cursor-pointer rounded-xl border border-border bg-surface-2/40 px-3 py-2.5">
      <input type="checkbox" checked={Boolean(campo.sensible)}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5" />
      <span className="text-xs text-text-2 leading-relaxed">
        <span className="font-medium text-text-1 block">Son datos sensibles</span>
        Para cédulas, RUT, certificados. El archivo se guarda aparte, sin enlace público:
        sólo se abre desde el panel, con un enlace que caduca, y queda registrado quién lo vio.
        <span className="block mt-1 text-text-3">
          Sin marcar —un portafolio, una propuesta— el enlace queda en la respuesta y sale en el Excel.
        </span>
      </span>
    </label>
  );
}
