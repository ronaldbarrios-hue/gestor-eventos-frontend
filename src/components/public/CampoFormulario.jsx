import { lazy, Suspense } from 'react';

/* Un campo del formulario de inscripción, y la lista completa agrupada.

   Estaba copiado a mano en EventoPublicoPage y en MiTicketPage, idéntico en las
   dos. Al añadir los tipos nuevos habría hecho falta tocar las dos copias y
   acordarse de las dos: eso es exactamente cómo se separan.

   Los tipos y su validación los define el backend en lib/formularioCampos.js.
   Aquí solo se pinta, y se le pone al navegador la pista que corresponde
   (inputMode, autoComplete, type) para que en un móvil salga el teclado
   adecuado — un campo de documento con teclado de letras es un formulario que
   nadie quiere llenar. */

const FormPhotoUploader = lazy(() => import('../ui/FormPhotoUploader.jsx'));

function FormPhotoUploaderLazy(props) {
  return (
    <Suspense fallback={<div className="h-24 rounded-2xl border border-border bg-surface/40 animate-pulse" />}>
      <FormPhotoUploader {...props} />
    </Suspense>
  );
}

export default function CampoFormulario({ campo, value, onChange, eventoId }) {
  const req = campo.requerido;
  const etiqueta = (
    <>
      {campo.etiqueta}
      {req && <span className="text-danger-light"> *</span>}
    </>
  );
  const ayuda = campo.ayuda
    ? <p className="text-[11px] text-text-3 mt-1 leading-snug">{campo.ayuda}</p>
    : null;

  /* Casilla sí/no */
  if (campo.tipo === 'checkbox') {
    return (
      <div className="py-1">
        <label className="flex items-start gap-2.5 text-sm text-text-2 cursor-pointer">
          <input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded accent-primary" />
          <span>{etiqueta}</span>
        </label>
        {ayuda}
      </div>
    );
  }

  /* Una sola opción */
  if (campo.tipo === 'seleccion') {
    return (
      <div className="field">
        <label className="label">{etiqueta}</label>
        <select required={req} value={value || ''} onChange={e => onChange(e.target.value)}
          className="input bg-surface-2 rounded-2xl py-3 text-base">
          <option value="" disabled>Selecciona una opción</option>
          {(campo.opciones || []).map(op => <option key={op} value={op}>{op}</option>)}
        </select>
        {ayuda}
      </div>
    );
  }

  /* Varias opciones. Con casillas y no con un <select multiple>, que en móvil no
     se entiende y en escritorio obliga a saber que hay que dejar pulsado Ctrl. */
  if (campo.tipo === 'multiple') {
    const marcadas = Array.isArray(value) ? value : [];
    const alternar = (op) => onChange(
      marcadas.includes(op) ? marcadas.filter(x => x !== op) : [...marcadas, op],
    );
    return (
      <div className="field">
        <label className="label">{etiqueta}</label>
        <div className="flex flex-wrap gap-2 pt-0.5">
          {(campo.opciones || []).map(op => {
            const on = marcadas.includes(op);
            return (
              <button key={op} type="button" onClick={() => alternar(op)} aria-pressed={on}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${on
                  ? 'border-primary/50 bg-primary/15 text-text-1'
                  : 'border-border text-text-3 hover:text-text-2 hover:border-border-2'}`}>
                {op}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-text-3 mt-1">Puedes marcar varias.</p>
        {campo.ayuda && <p className="text-[11px] text-text-3 leading-snug">{campo.ayuda}</p>}
      </div>
    );
  }

  if (campo.tipo === 'foto') {
    return (
      <div className="field">
        <label className="label">{etiqueta}</label>
        <FormPhotoUploaderLazy value={value} onChange={onChange} eventoId={eventoId} campoId={campo.id} />
        {ayuda}
      </div>
    );
  }

  if (campo.tipo === 'parrafo') {
    return (
      <div className="field">
        <label className="label">{etiqueta}</label>
        <textarea required={req} rows={3} value={value || ''} onChange={e => onChange(e.target.value)}
          className="input !h-auto resize-y rounded-2xl py-3 text-base" />
        {ayuda}
      </div>
    );
  }

  /* El resto son un <input>, con la pista que le toca a cada uno. El backend
     valida igual: esto es para que escribirlo sea cómodo, no una defensa. */
  const props = {
    texto:     { type: 'text' },
    numero:    { type: 'number', inputMode: 'numeric' },
    fecha:     { type: 'date' },
    email:     { type: 'email', inputMode: 'email', autoComplete: 'email',
                 placeholder: 'nombre@correo.com', spellCheck: false },
    telefono:  { type: 'tel', inputMode: 'tel', autoComplete: 'tel',
                 placeholder: '300 000 0000' },
    documento: { type: 'text', inputMode: 'numeric', autoComplete: 'off',
                 placeholder: 'Sin puntos ni guiones' },
  }[campo.tipo] || { type: 'text' };

  return (
    <div className="field">
      <label className="label">{etiqueta}</label>
      <input {...props} required={req} value={value || ''} onChange={e => onChange(e.target.value)}
        className="input rounded-2xl py-3 text-base" />
      {ayuda}
    </div>
  );
}

/* La lista completa, con un separador cuando cambia el bloque.

   Una ficha de caracterización son ~22 preguntas: sin cortes es un muro y la
   gente abandona a mitad. El orden lo decide el organizador; aquí solo se
   respeta y se corta cuando cambia el grupo. */
export function CamposFormulario({ campos, valores, onChange, eventoId, columnas = 1 }) {
  if (!campos?.length) return null;

  const bloques = [];
  for (const c of campos) {
    const g = c.grupo || '';
    if (!bloques.length || bloques[bloques.length - 1].grupo !== g) bloques.push({ grupo: g, campos: [] });
    bloques[bloques.length - 1].campos.push(c);
  }

  const rejilla = columnas > 1 ? 'grid sm:grid-cols-2 gap-3 items-start' : 'space-y-3';

  return (
    <div className="space-y-5">
      {bloques.map((b, i) => (
        <section key={`${b.grupo}-${i}`} className="space-y-3">
          {b.grupo && (
            <div className="flex items-center gap-3 pt-1">
              <h4 className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{b.grupo}</h4>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <div className={rejilla}>
            {b.campos.map(c => (
              <CampoFormulario
                key={c.id}
                campo={c}
                value={valores[c.id]}
                onChange={v => onChange(c.id, v)}
                eventoId={eventoId}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
