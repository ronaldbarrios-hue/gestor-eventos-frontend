import { useEffect, useState } from 'react';

/* GESTEK — Un solo renderizador para los campos del formulario.

   Había TRES copias de esto: `CampoDinamico` en EventoPublicoPage, otra igual
   en MiTicketPage, y `CampoSesion` en InscripcionSesionModal. Se separaron, que
   es lo que pasa siempre:

   · Las dos `CampoDinamico` pintaban `checkbox`, `seleccion` y `foto`, y todo
     lo demás caía a un `<input type=text>`. Un campo de selección MÚLTIPLE
     —que el servidor conoce y la ficha de caracterización usa dos veces— salía
     como una caja de texto, y el backend rechazaba la respuesta porque esperaba
     una lista.
   · `CampoSesion` pintaba `select`, `textarea` y `multiple`. Los dos primeros
     no existen en el catálogo del servidor: se llaman `seleccion` y `parrafo`.
     Editor y renderizador se entendían entre ellos y el backend los rechazaba
     al guardar.

   El catálogo manda desde `lib/formularioCampos.js` en el servidor. Aquí sólo
   se pinta, y los alias viejos se traducen por si quedó alguno guardado. */

/* Los nombres que nunca fueron válidos, por si alguno sobrevive en un borrador
   del navegador o en una base que no se revisó. */
const ALIAS = { select: 'seleccion', textarea: 'parrafo', number: 'numero', date: 'fecha' };
const tipoDe = (campo) => ALIAS[campo?.tipo] || campo?.tipo || 'texto';

/* Los tipos que guardan una lista. Tiene que coincidir con `valor: 'lista'`
   del catálogo del servidor. */
export const ES_LISTA = new Set(['multiple']);

/* Valor inicial coherente con el tipo: una lista vacía no es lo mismo que una
   cadena vacía, y arrancar un `multiple` en '' hace que el primer clic
   concatene texto en vez de agregar a un array. */
export function valorInicial(campo) {
  const t = tipoDe(campo);
  if (ES_LISTA.has(t)) return [];
  if (t === 'checkbox') return false;
  return '';
}

/* ── Validación en el cliente ────────────────────────────────────────
   Espejo de `validarRespuesta` del servidor. El servidor sigue siendo la
   autoridad —esto no lo reemplaza—, pero avisar antes de enviar evita que
   alguien llene 22 preguntas y pierda el intento por un correo mal escrito.

   Las dos sutilezas que el backend documenta y que las copias sueltas se
   saltaban:
   · en una casilla, `false` es una respuesta dada («no»), no un hueco;
   · una lista vacía sí es un hueco. */

const RE_EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function fallaCampo(campo, valor) {
  const t = tipoDe(campo);

  if (t === 'checkbox') {
    const marcada = valor === true || valor === 'true' || valor === 1 || valor === '1';
    if (campo.requerido && !marcada) return `Debes marcar «${campo.etiqueta}».`;
    return null;
  }

  const vacio = valor === undefined || valor === null || valor === ''
    || (Array.isArray(valor) && valor.length === 0);
  if (vacio) return campo.requerido ? `«${campo.etiqueta}» es obligatorio.` : null;

  switch (t) {
    case 'email':
      if (!RE_EMAIL.test(String(valor).trim())) return `«${campo.etiqueta}» no parece un correo electrónico.`;
      break;
    case 'telefono': {
      const d = String(valor).replace(/[^\d]/g, '');
      if (d.length < 7 || d.length > 15) return `«${campo.etiqueta}» debe tener entre 7 y 15 dígitos.`;
      break;
    }
    case 'documento': {
      const limpio = String(valor).replace(/[\s.-]/g, '');
      if (!/^[A-Za-z0-9]{4,20}$/.test(limpio)) return `«${campo.etiqueta}» no parece un número de documento.`;
      break;
    }
    case 'numero':
      if (!Number.isFinite(Number(valor))) return `«${campo.etiqueta}» debe ser un número.`;
      break;
    case 'fecha':
      if (Number.isNaN(new Date(valor).getTime())) return `«${campo.etiqueta}» no es una fecha válida.`;
      break;
    case 'seleccion': {
      const ops = campo.opciones || [];
      if (ops.length && !ops.includes(String(valor))) return `«${campo.etiqueta}»: esa opción no está en la lista.`;
      break;
    }
    case 'multiple': {
      if (!Array.isArray(valor)) return `«${campo.etiqueta}» debe traer una lista de opciones.`;
      const ops = campo.opciones || [];
      const fuera = valor.filter(v => ops.length && !ops.includes(String(v)));
      if (fuera.length) return `«${campo.etiqueta}»: ${fuera.join(', ')} no está en la lista.`;
      break;
    }
    case 'foto':
      if (!/^https?:\/\//i.test(String(valor))) return `Falta subir la imagen de «${campo.etiqueta}».`;
      break;
    default:
      break;
  }
  return null;
}

/* Devuelve el primer error, o null. `ticketTypeId` salta los campos de otro
   tipo de boleta, igual que el servidor. */
export function primerFallo(campos, respuestas = {}, ticketTypeId = null) {
  for (const c of campos || []) {
    if (c.ticket_type_id && String(c.ticket_type_id) !== String(ticketTypeId)) continue;
    const fallo = fallaCampo(c, respuestas[c.id]);
    if (fallo) return fallo;
  }
  return null;
}

/* ── Render ──────────────────────────────────────────────────────────── */

const CLS = 'input rounded-2xl py-3 text-base';

export default function CampoFormulario({ campo, value, onChange, eventoId }) {
  const t = tipoDe(campo);
  const req = Boolean(campo.requerido);

  const Etiqueta = () => (
    <label className="label" htmlFor={`campo-${campo.id}`}>
      {campo.etiqueta}{req && <span className="text-danger-light"> *</span>}
    </label>
  );
  const Ayuda = () => campo.ayuda
    ? <p className="text-[11px] text-text-3 mt-1 leading-relaxed">{campo.ayuda}</p>
    : null;

  if (t === 'checkbox') {
    return (
      <label className="flex items-start gap-2.5 text-sm text-text-2 cursor-pointer py-1">
        <input type="checkbox" id={`campo-${campo.id}`} checked={Boolean(value)}
          onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded accent-primary" />
        <span>
          {campo.etiqueta}{req && <span className="text-danger-light"> *</span>}
          {campo.ayuda && <span className="block text-[11px] text-text-3">{campo.ayuda}</span>}
        </span>
      </label>
    );
  }

  if (t === 'seleccion') {
    return (
      <div className="field">
        <Etiqueta />
        <select id={`campo-${campo.id}`} required={req} value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className={`${CLS} bg-surface-2`}>
          <option value="">Selecciona una opción</option>
          {(campo.opciones || []).map(op => <option key={op} value={op}>{op}</option>)}
        </select>
        <Ayuda />
      </div>
    );
  }

  /* Selección múltiple: casillas, y el valor SIEMPRE es un array. Se conserva
     el orden del catálogo, no el de los clics, para que dos respuestas iguales
     se vean iguales al exportarlas. */
  if (t === 'multiple') {
    const marcadas = Array.isArray(value) ? value : [];
    const opciones = campo.opciones || [];
    const alternar = (op, activo) => {
      const siguiente = activo ? [...marcadas, op] : marcadas.filter(x => x !== op);
      onChange(opciones.filter(o => siguiente.includes(o)));
    };
    return (
      <fieldset className="field">
        <legend className="label">
          {campo.etiqueta}{req && <span className="text-danger-light"> *</span>}
          <span className="text-text-3 font-normal"> · puedes marcar varias</span>
        </legend>
        <div className="space-y-1.5 mt-1">
          {opciones.map(op => (
            <label key={op} className="flex items-start gap-2.5 text-sm text-text-2 cursor-pointer">
              <input type="checkbox" checked={marcadas.includes(op)}
                onChange={e => alternar(op, e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-primary" />
              <span>{op}</span>
            </label>
          ))}
        </div>
        <Ayuda />
      </fieldset>
    );
  }

  if (t === 'parrafo') {
    return (
      <div className="field">
        <Etiqueta />
        <textarea id={`campo-${campo.id}`} required={req} rows={3} value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className={`${CLS} resize-y min-h-[5rem]`} />
        <Ayuda />
      </div>
    );
  }

  if (t === 'foto') {
    return (
      <div className="field">
        <Etiqueta />
        <FormPhotoUploaderLazy value={value} onChange={onChange} eventoId={eventoId} campoId={campo.id} />
        <Ayuda />
      </div>
    );
  }

  /* Texto y sus parientes. `inputMode` importa en móvil: pedir un documento y
     que salga el teclado de letras es medio formulario perdido. */
  const attrs = {
    email:     { type: 'email',  inputMode: 'email',   autoComplete: 'email' },
    telefono:  { type: 'tel',    inputMode: 'tel',     autoComplete: 'tel' },
    documento: { type: 'text',   inputMode: 'numeric', autoComplete: 'off' },
    numero:    { type: 'number', inputMode: 'numeric' },
    fecha:     { type: 'date' },
  }[t] || { type: 'text' };

  return (
    <div className="field">
      <Etiqueta />
      <input id={`campo-${campo.id}`} required={req} {...attrs} value={value ?? ''}
        onChange={e => onChange(e.target.value)} className={CLS} />
      <Ayuda />
    </div>
  );
}

/* Carga diferida: el uploader usa Storage directo desde el navegador, así que
   sólo se importa si el formulario tiene de verdad un campo de foto. */
function FormPhotoUploaderLazy(props) {
  const [Comp, setComp] = useState(null);
  useEffect(() => {
    import('./FormPhotoUploader.jsx').then(m => setComp(() => m.default));
  }, []);
  if (!Comp) return <div className="h-40 rounded-2xl bg-surface-2/40 animate-pulse" />;
  return <Comp {...props} />;
}
