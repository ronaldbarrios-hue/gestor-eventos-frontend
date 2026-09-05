import { useEffect, useState } from 'react';
import SelectorBuscable, { MultiBuscable } from './SelectorBuscable.jsx';
import { verificar } from '../../lib/validarDato.js';
import { limiteDe, mensajeLimite } from '../../lib/limiteTexto.js';

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

/* Listas largas: por encima de este umbral el campo se pinta con buscador en
   vez de un desplegable interminable. El mismo número que UMBRAL_BUSCABLE en
   lib/formularioCampos.js del servidor —si se cambia, se cambia en los dos
   sitios; el servidor es el que manda y lo entrega en el catálogo.

   `buscable` en el campo anula el automático: true siempre, false nunca. */
const UMBRAL_BUSCABLE = 8;

export function esBuscable(campo) {
  const t = tipoDe(campo);
  if (t !== 'seleccion' && t !== 'multiple') return false;
  if (typeof campo?.buscable === 'boolean') return campo.buscable;
  return (campo?.opciones?.length || 0) > UMBRAL_BUSCABLE;
}


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

/* Las reglas por tipo viven en lib/validarDato.js, que es el mismo sitio del
   que las lee el registro de la cuenta. Estaban aqui copiadas y en el
   servidor, y el registro no usaba ninguna de las dos. */

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

  /* Los tipos con verificacion propia la delegan, y el mensaje que vuelve ya
     dice que hacer —incluido el caso de haber escrito en la casilla de al
     lado: «eso parece un correo, aqui va el telefono»—. */
  const verificado = verificar(t, valor);
  if (verificado) return `«${campo.etiqueta}»: ${verificado.charAt(0).toLowerCase()}${verificado.slice(1)}`;

  /* El limite se comprueba aqui tambien y no solo con `maxLength`: el atributo
     no existe para las palabras, y pegar texto en un campo puede saltarselo en
     algunos navegadores. El servidor lo vuelve a comprobar igual. */
  const lim = limiteDe(campo, valor, t);
  const pasado = mensajeLimite(campo, lim);
  if (pasado) return pasado;

  switch (t) {
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

/* Todos los errores a la vez, indexados por campo: `{ [campoId]: mensaje }`.

   Devolver solo el primero obligaba a corregir de uno en uno, enviando el
   formulario entre cada intento. Con 22 preguntas eso son 22 viajes. Y el
   unico aviso era un cuadro arriba del modal que, en una columna con scroll,
   queda fuera de pantalla justo cuando aparece. */
export function fallosDe(campos, respuestas = {}, ticketTypeId = null) {
  const fallos = {};
  for (const c of campos || []) {
    if (c.ticket_type_id && String(c.ticket_type_id) !== String(ticketTypeId)) continue;
    const fallo = fallaCampo(c, respuestas[c.id]);
    if (fallo) fallos[c.id] = fallo;
  }
  return fallos;
}

/* El primero, para quien solo quiera avisar de uno. Se apoya en `fallosDe`
   para no tener dos recorridos que puedan opinar distinto. */
export function primerFallo(campos, respuestas = {}, ticketTypeId = null) {
  const fallos = fallosDe(campos, respuestas, ticketTypeId);
  const primero = (campos || []).find(c => fallos[c.id]);
  return primero ? fallos[primero.id] : null;
}

/* Que campos pueden ir en media columna.

   La regla vive aqui porque este es el unico sitio que conoce el tipo. Lo
   corto y de forma conocida —un numero, una fecha, un telefono, un
   documento— cabe en media. Todo lo demas ocupa la fila entera: un correo
   partido a 21 caracteres obliga a hacer scroll DENTRO del campo para releer
   lo que uno escribio, que es exactamente la queja de origen.

   Una seleccion cabe en media solo si es corta de verdad: si se convirtio en
   buscador, o si alguna opcion es larga, el desplegable recorta el texto y no
   se ve que se eligio. Las opciones vienen del servidor: aqui no hay ninguna
   lista escrita. */
const MEDIA = new Set(['numero', 'fecha', 'telefono', 'documento']);
const LARGO_OPCION = 24;

export function ocupaFila(campo) {
  const t = tipoDe(campo);
  if (MEDIA.has(t)) return false;
  if (t === 'seleccion' && !esBuscable(campo)) {
    const ops = campo?.opciones || [];
    return ops.some(o => String(o).length > LARGO_OPCION);
  }
  return true;
}

/* ── Render ──────────────────────────────────────────────────────────── */

/* La geometria vive en `.input-form` (index.css), que es la misma que usaban
   doce sitios copiandola a mano. */
const CLS = 'input-form';

export default function CampoFormulario({ campo, value, onChange, eventoId, error }) {
  const t = tipoDe(campo);
  const req = Boolean(campo.requerido);
  /* El campo que fallo se marca EN el campo. Antes el unico aviso era un
     cuadro arriba del formulario: con scroll, aparece fuera de pantalla justo
     cuando hace falta, y no dice cual de las 22 preguntas es. */
  const cls = error ? `${CLS} field-error` : CLS;
  const idError = error ? `err-${campo.id}` : undefined;

  const Etiqueta = () => (
    <label className="label" htmlFor={`campo-${campo.id}`}>
      {campo.etiqueta}{req && <span className="text-danger-light"> *</span>}
    </label>
  );
  /* Lo que lleva escrito, mientras escribe.
     Sin esto el limite solo se descubre al enviar, que es despues de haber
     escrito de mas — y entonces hay que recortar a ciegas. Se dice cuanto
     queda, no cuanto se lleva: lo que la persona necesita saber es si le cabe
     lo que falta por decir. */
  const lim = limiteDe(campo, value, t);
  const Contador = () => {
    if (!lim) return null;
    const partes = [];
    if (lim.maxC > 0) partes.push(`${lim.usadoC} / ${lim.maxC} caracteres`);
    if (lim.maxP > 0) partes.push(`${lim.usadoP} / ${lim.maxP} palabras`);
    return (
      <p className={`text-[11px] mt-1 tabular-nums ${lim.pasado ? 'text-danger-light font-semibold' : 'text-text-3'}`}
         aria-live="polite">
        {partes.join(' · ')}{lim.pasado && ' · te pasaste'}
      </p>
    );
  };

  const Ayuda = () => (
    <>
      {campo.ayuda && <p className="text-[11px] text-text-3 mt-1 leading-relaxed">{campo.ayuda}</p>}
      <Contador />
      {error && <p id={idError} className="text-[11px] text-danger-light mt-1 leading-relaxed">{error}</p>}
    </>
  );

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
    if (esBuscable(campo)) {
      return (
        <div className="field">
          <Etiqueta />
          <SelectorBuscable id={`campo-${campo.id}`} opciones={campo.opciones || []}
            value={value ?? ''} onChange={onChange} requerido={req} />
          <Ayuda />
        </div>
      );
    }
    return (
      <div className="field">
        <Etiqueta />
        <select id={`campo-${campo.id}`} required={req} value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className={`${cls} bg-surface-2`} aria-invalid={Boolean(error)} aria-describedby={idError}>
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
        {esBuscable(campo) ? (
          <div className="mt-1">
            <MultiBuscable id={`campo-${campo.id}`} opciones={opciones}
              value={marcadas} onChange={onChange} />
          </div>
        ) : (
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
        )}
        <Ayuda />
      </fieldset>
    );
  }

  if (t === 'parrafo') {
    return (
      <div className="field">
        <Etiqueta />
        {/* `maxLength` impide pasarse de caracteres mientras se escribe, que es
            mejor que dejar escribir y rechazar despues. No existe equivalente
            para palabras: eso lo avisa el contador y lo comprueba `fallaCampo`. */}
        <textarea id={`campo-${campo.id}`} required={req} rows={3} value={value ?? ''}
          maxLength={lim?.maxC > 0 ? lim.maxC : undefined}
          onChange={e => onChange(e.target.value)}
          className={`${cls} resize-y min-h-[5rem]`} />
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

  /* Un texto que PIDE UN NOMBRE se ofrece al autorrelleno.
   *
   * No hay tipo «nombre» en el catálogo —los tipos son texto, párrafo, número,
   * fecha, email, teléfono, documento, selección, múltiple, casilla y foto— y
   * el que se usa para «nombre del acompañante» o «a nombre de quién va la
   * factura» es `texto`, que podría ser cualquier cosa.
   *
   * Así que se deduce de la etiqueta, que es lo que ya hace este proyecto con
   * los documentos al importar. Sólo para ofrecer el autorrelleno: si acierta,
   * el móvil ofrece el nombre guardado y se ahorran diez segundos de teclear
   * de pie; si falla, no pasa nada — el campo sigue siendo un texto normal.
   * Por eso la lista es corta y no intenta ser lista. */
  const pareceNombre = t === 'texto'
    && /nombres?/i.test(campo.etiqueta || '')
    && !/(evento|empresa|usuario|archivo|producto)/i.test(campo.etiqueta || '');

  return (
    <div className="field">
      <Etiqueta />
      <input id={`campo-${campo.id}`} required={req} {...attrs}
        autoComplete={attrs.autoComplete || (pareceNombre ? 'name' : undefined)}
        maxLength={lim?.maxC > 0 ? lim.maxC : undefined}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)} className={cls} aria-invalid={Boolean(error)} aria-describedby={idError} />
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
