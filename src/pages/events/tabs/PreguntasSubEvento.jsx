import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { agendaApi } from '../../../api/agenda.js';
import { useToast } from '../../../context/ToastContext.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import CondicionEditor from '../../../components/CondicionEditor.jsx';
import CampoSensible from '../../../components/CampoSensible.jsx';
import ImportarDefinicion from '../../../components/formulario/ImportarDefinicion.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import { useCierreSeguro, alPulsarElFondo } from '../../../components/ui/cierreSeguro.js';

/* ──────────────────────────────────────────────────────────────────
   Las preguntas propias de un sub-evento.

   El modo 'propio' existía desde la migración 0059 y se podía elegir, pero no
   había pantalla para ESCRIBIR las preguntas: el sub-evento se quedaba con
   cero y se comportaba igual que 'ninguno'. El selector lo advertía en vez de
   prometerlo. Esta es la pantalla que faltaba.

   Lo unico que NO tiene y el del evento si: «solo para el tipo VIP», que no
   significa nada aqui —a un sub-evento no se entra con una boleta u otra—.

   Las fichas prearmadas y la importacion desde una hoja tampoco estaban, y esa
   si era una omision. La justificacion era que «son para el registro del
   evento», y no se sostiene: el formulario del evento pide cuatro preguntas y
   una postulacion de startup pide veintiuna. La pantalla que las importaba
   estaba a un clic, en la pestana de al lado, y desde aqui no habia forma de
   llegar. Ahora el servidor manda el mismo catalogo a los tres formularios y
   este editor lo usa entero.

   Todo lo demas si. Durante un tiempo no, y el comentario que estaba aqui lo
   justificaba: «sin grupos, sin ayuda por campo... esas cosas son del
   formulario de compra». Era mentira por omision: la base guarda `grupo` y
   `ayuda` para estas preguntas igual que para las otras —viven en la misma
   tabla—, y el renderizador publico ya pintaba las dos. Lo que faltaba era
   donde escribirlas. Un campo que la base guarda y la pantalla no deja llenar
   no es una decision de diseno, es un hueco.

   Pero NO corto en preguntas. Aquí decía que el tope estaba «en doce a
   propósito: quien necesite treinta quiere el formulario del evento». Era una
   suposición sobre cómo trabaja la gente, y falló: un formulario de 21
   preguntas para una batalla de pitch no cabía. Describir una startup pide
   más que comprar una entrada, no menos. El tope ahora es el mismo de los tres
   formularios y lo manda el servidor en `max_campos`.

   Y las condiciones —«mostrar sólo si…»— sí están: el servidor las guardaba y
   la página pública las respetaba desde siempre, pero esta pantalla no tenía
   dónde ponerlas. Eran tres formularios y una sola donde configurarlas.
   ────────────────────────────────────────────────────────────────── */

/* Sólo los tipos que tienen sentido en una pregunta corta. El catálogo
   completo viaja en la respuesta del servidor, pero ofrecerlo entero aquí
   invita a montar la ficha de caracterización en el sitio equivocado. */
/* Los ids TIENEN que ser los del catálogo del servidor
   (lib/formularioCampos.js). Aquí decían `select` y `textarea`, que no existen
   —se llaman `seleccion` y `parrafo`—, así que `validarDefinicion` cortaba con
   «Tipo de pregunta inválido» y guardar una pregunta de esos dos tipos fallaba
   siempre. El renderizador público entendía los nombres inventados, con lo cual
   editor y render se daban la razón entre ellos y el backend los rechazaba.

   Se mantiene un SUBCONJUNTO a propósito: son preguntas cortas de un taller, y
   ofrecer el catálogo entero invita a montar aquí la ficha de caracterización,
   que va en el formulario del evento. Las etiquetas se toman del servidor
   cuando llegan, para no volver a mantener dos textos. */
/* Los tipos que se pueden pedir aquí.
 *
 * Era una lista de NUEVE, escrita a mano, cuando el servidor conoce más — y
 * `archivo` y `foto` se quedaban fuera. O sea: en un sub-evento o un torneo se
 * podía pedir un texto, pero no un documento. Y no fallaba nada: el tipo
 * simplemente no salía en el desplegable, y quien lo buscaba concluía que la
 * plataforma no lo hacía. La base lo guarda, el renderizador público lo pinta
 * y la ruta de subida lo autoriza desde la 0115; sólo este desplegable no lo
 * ofrecía.
 *
 * Ahora manda el catálogo del servidor, que es la fuente. La lista de abajo
 * sólo es el respaldo para el instante en que todavía no ha llegado la
 * respuesta —y para eso tiene que estar completa, no recortada: si se queda
 * corta, el desplegable cambia de opciones al cargar. */
const ETIQUETAS_RESPALDO = {
  texto: 'Texto corto', parrafo: 'Texto largo', numero: 'Número',
  seleccion: 'Elegir una', multiple: 'Elegir varias', checkbox: 'Sí / no',
  email: 'Correo', telefono: 'Teléfono', fecha: 'Fecha',
  documento: 'Documento de identidad', archivo: 'Archivo adjunto (PDF, Word, presentación)', foto: 'Foto',
};
const TIPOS_PERMITIDOS = Object.keys(ETIQUETAS_RESPALDO);
const CON_OPCIONES = new Set(['seleccion', 'multiple']);

/* Lo que cuenta como «lo que hay escrito». Se dejan fuera las claves locales
   (`_k`), que cambian al anadir una pregunta sin que nadie haya escrito nada. */
const huella = (cs) => JSON.stringify((cs || []).map(c => [
  c.tipo, c.etiqueta || '', c.requerido || false, c.opciones || null,
  c.max_caracteres ?? '', c.max_palabras ?? '', c.visible_si || null,
  c.sensible || false, c.ayuda || '', c.grupo || '',
]));

let contador = 0;
const claveLocal = () => `nueva_${++contador}`;

/* Quien pregunta: un sub-evento por defecto, o cualquier otra cosa que tenga
   campos propios —hoy, un torneo—.

   La alternativa era copiar este editor entero para los torneos, y ya se sabe
   cómo acaba: el editor de sub-eventos y el de torneos separándose poco a poco
   hasta que uno acepta un tipo de campo que el otro no. Lo que cambia entre los
   dos es de dónde se leen los campos y dónde se guardan; el resto —ordenar,
   validar, el tope, los tipos permitidos— es lo mismo. */
const fuenteDeSesion = (evento, sesion) => ({
  titulo: `Preguntas de «${sesion.titulo}»`,
  ayuda: 'Sólo para apuntarse a esta actividad. Cortas: la boleta ya sabe quién es.',
  vacio: 'Sin preguntas, apuntarse es un solo botón — que suele ser lo correcto.',
  vacioAyuda: 'Añade alguna sólo si necesitas algo que la boleta no sabe.',
  cargar : () => agendaApi.formularioSesion(evento.id, sesion.id),
  guardar: (campos) => agendaApi.guardarFormularioSesion(evento.id, sesion.id, campos),
  textoGuardado: (n) => (n
    ? `Guardado. Quien se apunte a «${sesion.titulo}» verá estas ${n} preguntas.`
    : 'Sin preguntas: apuntarse a este sub-evento vuelve a ser un solo botón.'),
});

export default function PreguntasSubEvento({ evento, sesion, fuente, onClose, onGuardado }) {
  const { success, error: toastErr } = useToast();
  const f = fuente || fuenteDeSesion(evento, sesion);
  const [campos, setCampos] = useState(null);   // null = cargando
  /* Mientras llega la respuesta del servidor. No un número bajo: si se queda
     corto, el botón de añadir sale deshabilitado durante ese instante y
     parece que ya no caben más. */
  const [max, setMax] = useState(60);
  const [tipos, setTipos] = useState(
    TIPOS_PERMITIDOS.map(id => ({ id, label: ETIQUETAS_RESPALDO[id] })));
  /* Sugerencias de grupo. `grupo` es columna de `event_form_fields` desde la
     0055 y estos formularios ya la guardaban; lo que faltaba era ofrecerla. */
  const [grupos, setGrupos] = useState([]);
  /* Fichas prearmadas y hoja de importacion. Existian solo en el formulario
     del evento, que es el que menos las necesita: comprar una entrada pide
     cuatro preguntas y postular una startup pide veintiuna. Ahora el servidor
     manda el mismo catalogo a los tres. */
  const [fichas, setFichas] = useState([]);
  const [plantilla, setPlantilla] = useState(null);
  const [importando, setImportando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState(null);

  useEffect(() => {
    let vivo = true;
    f.cargar()
      .then(d => {
        if (!vivo) return;
        const cargados = (d.campos || []).map(c => ({ ...c, _k: c.id }));
        setCampos(cargados);
        /* La foto de lo que vino, para poder distinguir «no toqué nada» de
           «escribí ocho preguntas». Sin esto habria que preguntar siempre, y
           una pregunta que sale aunque no haya nada que perder se aprende a
           despachar sin leerla — y entonces no protege el dia que si hay. */
        setOriginal(huella(cargados));
        if (d.max_campos) setMax(d.max_campos);
        /* El catálogo viaja con la respuesta y se usa ENTERO. Antes se
           cruzaba con la lista de aquí, así que un tipo nuevo del servidor no
           llegaba nunca a este editor: había que acordarse de añadirlo a mano
           en dos sitios, y no se hizo. */
        if (Array.isArray(d.tipos) && d.tipos.length) setTipos(d.tipos);
        if (Array.isArray(d.grupos)) setGrupos(d.grupos);
        if (Array.isArray(d.fichas)) setFichas(d.fichas);
        if (d.plantilla) setPlantilla(d.plantilla);
      })
      .catch(e => { if (vivo) { toastErr(e.response?.data?.error || e.message); setCampos([]); } });
    return () => { vivo = false; };
    /* `f` se reconstruye en cada render, así que no puede ir en las
       dependencias: la carga se repetiría sin parar. Lo que la identifica son
       el evento y de quién son las preguntas. */
  }, [evento.id, sesion?.id, fuente?.clave, toastErr]);

  /* Cambios sin guardar. Se compara el contenido, no la identidad: mover una
     pregunta y devolverla a su sitio no es un cambio, y avisar de eso enseña a
     ignorar el aviso. */
  const hayCambios = campos !== null && original !== null && huella(campos) !== original;
  const cerrar = useCierreSeguro(hayCambios, onClose);

  const set = (k, patch) => setCampos(cs => cs.map(c => (c._k === k ? { ...c, ...patch } : c)));
  const quitar = (k) => setCampos(cs => cs.filter(c => c._k !== k));
  const mover = (k, delta) => setCampos(cs => {
    const i = cs.findIndex(c => c._k === k);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= cs.length) return cs;
    const copia = [...cs];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    return copia;
  });
  /* Para no repetir una pregunta que ya esta. Se compara el enunciado sin
     acentos ni mayusculas: «Numero de documento» y «numero de documento» son
     la misma pregunta hecha dos veces, y el formulario publico las pediria las
     dos. */
  const clave = (t) => String(t || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  const nuevoDe = (preset) => ({
    _k: claveLocal(),
    tipo: 'texto', etiqueta: '', requerido: false, opciones: null,
    visible_si: null, sensible: false, ayuda: '', grupo: '',
    ...preset,
    /* «Solo para el tipo VIP» es del formulario de compra: aqui el filtro ya
       es el sub-evento o el torneo. El servidor tambien lo limpia. */
    ticket_type_id: null,
  });

  const agregarVarios = (presets) => {
    const yaEstan = new Set(campos.map(c => clave(c.etiqueta)));
    const nuevos = presets.filter(c => !yaEstan.has(clave(c.etiqueta)));
    if (!nuevos.length) { toastErr('Esas preguntas ya estan en el formulario.'); return; }
    /* No caben todas: se agregan las que caben en vez de rechazar el lote
       entero. Rechazarlo obliga a recortar el archivo y volver a subirlo. */
    const caben = nuevos.slice(0, Math.max(0, max - campos.length));
    if (!caben.length) { toastErr(`El formulario ya tiene el maximo de ${max} preguntas.`); return; }
    setCampos(cs => [...cs, ...caben.map(nuevoDe)]);
    setImportando(false);
    success(caben.length < nuevos.length
      ? `${caben.length} agregadas; ${nuevos.length - caben.length} no caben.`
      : `${caben.length} ${caben.length === 1 ? 'pregunta agregada' : 'preguntas agregadas'}. Revisa y guarda.`);
  };

  /* Esta la ficha entera? Es lo que decide si el boton agrega o quita. */
  const fichaPuesta = (ficha) => {
    if (!ficha.campos?.length) return false;
    const estan = new Set(campos.map(c => clave(c.etiqueta)));
    return ficha.campos.every(c => estan.has(clave(c.etiqueta)));
  };

  /* Quitarla entera. Pulsar por error la de caracterizacion y tener que borrar
     veintidos preguntas a mano no lo hace nadie: se abandona la pantalla.

     Si alguna ya esta guardada se avisa, porque el servidor hace el diff por id
     y borrarla se lleva las respuestas que ya haya dado la gente. */
  const quitarFicha = async (ficha) => {
    const suyas = new Set(ficha.campos.map(c => clave(c.etiqueta)));
    const guardadas = campos.filter(c => suyas.has(clave(c.etiqueta)) && c.id).length;
    if (guardadas > 0) {
      const ok = await confirmDialog({
        title: `Quitar «${ficha.nombre}»`,
        message: `${guardadas} de estas preguntas ya estan guardadas. Si quitas la ficha y guardas, se borran junto con las respuestas que ya haya dado la gente.`,
        confirmLabel: 'Quitar de todos modos',
        danger: true,
      });
      if (!ok) return;
    }
    setCampos(cs => cs.filter(c => !suyas.has(clave(c.etiqueta))));
    success(`«${ficha.nombre}» quitada.`);
  };

  const agregar = () => setCampos(cs => [
    ...cs,
    { _k: claveLocal(), tipo: 'texto', etiqueta: '', requerido: false, opciones: null, visible_si: null, sensible: false, ayuda: '', grupo: '' },
  ]);

  const guardar = async () => {
    for (const c of campos) {
      if (!c.etiqueta?.trim()) { toastErr('Hay una pregunta sin enunciado.'); return; }
      if (CON_OPCIONES.has(c.tipo) && !(c.opciones || []).filter(Boolean).length) {
        toastErr(`"${c.etiqueta}" necesita al menos una opción.`); return;
      }
    }
    setSaving(true);
    try {
      const payload = campos.map(c => ({
        /* Las que ya existían viajan con su id: el servidor las actualiza en
           su sitio y las respuestas ya guardadas siguen apuntando a ellas. */
        ...(String(c._k).startsWith('nueva_') ? {} : { id: c.id }),
        tipo: c.tipo,
        etiqueta: c.etiqueta.trim(),
        requerido: Boolean(c.requerido),
        opciones: CON_OPCIONES.has(c.tipo) ? (c.opciones || []).filter(Boolean) : null,
        /* '' o vacio = sin limite. Se manda null y no 0: un 0 guardado seria
           una pregunta que no se puede responder. */
        max_caracteres: c.max_caracteres ? Number(c.max_caracteres) : null,
        max_palabras: c.max_palabras ? Number(c.max_palabras) : null,
        /* Sólo significa algo en un archivo, y el servidor lo limpia en
           cualquier otro tipo. Se manda igual: filtrarlo aquí dejaría un
           `sensible` viejo si se marca el campo y luego se le cambia el tipo. */
        sensible: Boolean(c.sensible),
        /* Se muestra debajo de la pregunta en el formulario público. El
           renderizador es el mismo de los tres formularios y ya lo pintaba:
           lo único que faltaba era dónde escribirlo. */
        ayuda: c.ayuda?.trim() || null,
        grupo: c.grupo?.trim() || null,
        /* Sin esta línea la condición se pierde al guardar: el editor la
           muestra, se define, y el objeto que viaja al servidor la deja
           fuera. Ya pasó una vez en el formulario del evento. */
        visible_si: c.visible_si || null,
      }));
      const d = await f.guardar(payload);
      success(f.textoGuardado(payload.length));
      onGuardado?.(d);
      onClose();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={alPulsarElFondo(cerrar)}>
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text-1">{f.titulo}</h3>
            <p className="text-xs text-text-3 mt-0.5">{f.ayuda}</p>
          </div>
          <button onClick={cerrar} aria-label="Cerrar" className="text-text-3 hover:text-text-1 flex-shrink-0">✕</button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {/* Empezar con algo hecho. Va arriba y no al final: quien abre esto
              con veinte preguntas que copiar de un documento tiene que ver la
              importacion ANTES de empezar a escribirlas a mano. */}
          {campos !== null && (fichas.length > 0 || plantilla) && (
            <div className="flex flex-wrap gap-2 pb-1">
              {fichas.map(fi => {
                const puesta = fichaPuesta(fi);
                return (
                  <button key={fi.id} onClick={() => (puesta ? quitarFicha(fi) : agregarVarios(fi.campos))}
                    title={puesta ? `Quitar las ${fi.campos.length} preguntas de «${fi.nombre}»` : fi.descripcion}
                    aria-pressed={puesta}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors
                                ${puesta
                                  ? 'border-success/40 bg-success/10 text-text-1 hover:border-danger/40 hover:bg-danger/10'
                                  : 'border-border-2 text-text-2 hover:text-text-1 hover:bg-surface-2'}`}>
                    <span className={puesta ? 'text-success' : 'text-primary-light'}>{puesta ? '✓' : '+'}</span>
                    {fi.nombre}
                    <span className="text-text-3">· {fi.campos.length}</span>
                  </button>
                );
              })}
              {plantilla && (
                <button onClick={() => setImportando(v => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-2
                             text-xs text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
                  <span className="text-primary-light">↑</span> Desde Excel o CSV
                </button>
              )}
            </div>
          )}

          {importando && (
            <ImportarDefinicion
              catalogo={{ plantilla, tipos }}
              cupo={Math.max(0, max - (campos?.length || 0))}
              nombreEvento={evento?.titulo}
              onAgregar={agregarVarios}
              onCerrar={() => setImportando(false)}
            />
          )}

          {campos === null ? (
            <p className="text-sm text-text-3 text-center py-8">Cargando…</p>
          ) : campos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
              <p className="text-sm text-text-2">{f.vacio}</p>
              <p className="text-xs text-text-3 mt-1.5">{f.vacioAyuda}</p>
            </div>
          ) : campos.map((c, i) => (
            <Pregunta
              key={c._k}
              campo={c}
              campos={campos}
              grupos={grupos}
              tipos={tipos}
              primera={i === 0}
              ultima={i === campos.length - 1}
              onChange={patch => set(c._k, patch)}
              onQuitar={() => quitar(c._k)}
              onSubir={() => mover(c._k, -1)}
              onBajar={() => mover(c._k, +1)}
            />
          ))}

          {campos !== null && (
            <button
              onClick={agregar}
              disabled={campos.length >= max}
              className="w-full py-2.5 rounded-2xl border border-dashed border-border text-sm text-text-2 hover:text-text-1 hover:border-accent/50 transition-colors disabled:opacity-40">
              {campos.length >= max ? `Máximo ${max} preguntas` : '+ Añadir pregunta'}
            </button>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <p className="text-[11px] text-text-3">
            {campos?.length || 0} de {max}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={cerrar} className="btn-ghost btn-sm">Cancelar</button>
            <button onClick={guardar} disabled={saving || campos === null} className="btn-primary btn-sm">
              {saving ? <><Spinner size="sm" /> Guardando…</> : 'Guardar preguntas'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Pregunta({ campo, campos, grupos, tipos, primera, ultima, onChange, onQuitar, onSubir, onBajar }) {
  const conOpciones = CON_OPCIONES.has(campo.tipo);
  const opciones = campo.opciones || [];

  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 p-3.5 space-y-2.5">
      <div className="flex items-start gap-2">
        <div className="flex flex-col flex-shrink-0 pt-1.5">
          <button onClick={onSubir} disabled={primera} aria-label="Subir"
            className="text-text-3 hover:text-text-1 disabled:opacity-20 leading-none text-[10px] px-1">▲</button>
          <button onClick={onBajar} disabled={ultima} aria-label="Bajar"
            className="text-text-3 hover:text-text-1 disabled:opacity-20 leading-none text-[10px] px-1">▼</button>
        </div>

        <input
          value={campo.etiqueta}
          onChange={e => onChange({ etiqueta: e.target.value })}
          placeholder="¿Qué le preguntas? Ej: ¿Traes tu propia raqueta?"
          className="input !h-10 flex-1 text-sm" />

        <button onClick={onQuitar} aria-label="Quitar pregunta"
          className="w-9 h-10 flex items-center justify-center text-text-3 hover:text-danger flex-shrink-0 text-lg">×</button>
      </div>

      <div className="flex items-center gap-2 flex-wrap pl-7">
        <select
          value={campo.tipo}
          onChange={e => {
            const tipo = e.target.value;
            /* Al cambiar a un tipo con opciones se arranca con una vacía; al
               salir de él se limpian, para que no queden restos invisibles. */
            onChange({ tipo, opciones: CON_OPCIONES.has(tipo) ? (opciones.length ? opciones : ['']) : null });
          }}
          className="input !h-9 text-xs w-auto">
          {tipos.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        <label className="flex items-center gap-1.5 text-xs text-text-2 cursor-pointer">
          <input type="checkbox" checked={Boolean(campo.requerido)}
            onChange={e => onChange({ requerido: e.target.checked })}
            className="w-3.5 h-3.5 accent-[#8B5CF6]" />
          Obligatoria
        </label>

        {/* Cuanto se puede escribir. Solo en texto y parrafo: en los demas
            tipos el limite ya lo pone su verificacion o sus opciones.
            Vacio = sin limite, que es como estaba todo hasta ahora. */}
        {['texto', 'parrafo'].includes(campo.tipo) && (
          <>
            <label className="flex items-center gap-1.5 text-xs text-text-3">
              máx.
              <input type="number" min="1" max="10000" inputMode="numeric" placeholder="—"
                value={campo.max_caracteres ?? ''}
                onChange={e => onChange({ max_caracteres: e.target.value })}
                className="input !h-9 text-xs w-16" />
              caracteres
            </label>
            <label className="flex items-center gap-1.5 text-xs text-text-3">
              máx.
              <input type="number" min="1" max="2000" inputMode="numeric" placeholder="—"
                value={campo.max_palabras ?? ''}
                onChange={e => onChange({ max_palabras: e.target.value })}
                className="input !h-9 text-xs w-16" />
              palabras
            </label>
          </>
        )}
      </div>

      {conOpciones && (
        <div className="pl-7 space-y-1.5">
          {opciones.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={o}
                onChange={e => onChange({ opciones: opciones.map((x, k) => (k === i ? e.target.value : x)) })}
                placeholder={`Opción ${i + 1}`}
                className="input !h-9 flex-1 text-sm" />
              <button onClick={() => onChange({ opciones: opciones.filter((_, k) => k !== i) })}
                aria-label="Quitar opción"
                className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-danger flex-shrink-0">×</button>
            </div>
          ))}
          <button onClick={() => onChange({ opciones: [...opciones, ''] })}
            className="text-xs text-accent hover:underline">+ Añadir opción</button>
        </div>
      )}

      {/* Los mismos que el formulario del evento, no copias. */}
      <div className="pl-7 space-y-2">
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={campo.ayuda || ''} onChange={e => onChange({ ayuda: e.target.value })}
            maxLength={300} className="input !h-9 text-xs"
            placeholder="Texto de ayuda (opcional). Ej: «Sin puntos ni guiones»" />
          {/* Se escribe o se elige, como en el formulario del evento: los
              sugeridos salen de los formatos de caracterización oficiales y
              no sirven para un torneo. */}
          <input list={`grupos-${campo._k}`} value={campo.grupo || ''}
            onChange={e => onChange({ grupo: e.target.value })}
            maxLength={80} className="input !h-9 text-xs"
            placeholder="Grupo (opcional). Ej: «Sobre tu propuesta»" />
          <datalist id={`grupos-${campo._k}`}>
            {(grupos || []).map(g => <option key={g} value={g} />)}
          </datalist>
        </div>
        <CampoSensible campo={campo} onChange={v => onChange({ sensible: v })} />
        <CondicionEditor campo={campo} campos={campos}
          onChange={visible_si => onChange({ visible_si })} />
      </div>
    </div>
  );
}
