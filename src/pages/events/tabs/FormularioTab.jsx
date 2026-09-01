import { useEffect, useMemo, useRef, useState } from 'react';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import { eventosApi } from '../../../api/eventos.js';
import { ticketsApi } from '../../../api/tickets.js';
import { useToast } from '../../../context/ToastContext.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import { leerHoja, columnaAOpciones, FORMATOS_ACEPTADOS } from '../../../lib/hojaCalculo.js';
import { esBuscable } from '../../../components/ui/CampoFormulario.jsx';
import { descargarPlantilla, leerPlantilla, HOJA_DATOS } from '../../../lib/plantillaFormulario.js';
import { posiblesAntecedentes, valoresDe, OPERADORES_CONDICION } from '../../../lib/camposCondicionales.js';

/* Tab Formulario — campos personalizados que se piden al comprar o reservar.
   Se guardan preservando el `id` de cada campo existente (el backend hace un
   diff), así las respuestas ya diligenciadas nunca quedan huérfanas.

   El catálogo de tipos, grupos y fichas VIENE DEL SERVIDOR (`GET
   /eventos/:id/formulario` devuelve `tipos`, `grupos`, `fichas`). Antes esta
   pantalla mantenía su propia lista de seis tipos y el servidor conocía once:
   selección múltiple, párrafo, correo, teléfono y documento no se podían
   elegir, así que la validación por tipo que ya existía en el backend no se
   disparaba nunca, y las tres fichas prearmadas —incluida la de
   caracterización, de 22 preguntas— no tenían botón en ninguna pantalla.
   Mantener aquí una copia del catálogo es justo lo que causó eso; no se
   vuelve a hacer.

   Ojo con el nombre: `tiposBoleta` son los tipos de BOLETA del evento.
   Antes esta variable se llamaba `tipos` y convivía con los tipos de CAMPO,
   que es parte de cómo se enredó esto. */

/* Clave para comparar dos preguntas y no repetirlas al agregar una ficha.

   Se compara sin tildes, sin mayúsculas y sin espacios de más porque las
   fichas y lo que ya escribió el organizador vienen de sitios distintos:
   «Numero de documento» y «Número de documento» son la misma pregunta y
   agregarlas dos veces deja un formulario que pide lo mismo dos veces.

   Faltaba. `agregarFicha` la llamaba y no existía en ningún lado, así que
   lanzaba ReferenceError en su primera línea — y como React no atrapa los
   errores de un manejador de clic, el botón sencillamente no hacía nada. */
const clave = (etiqueta) => String(etiqueta ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

function nuevoCampo(preset = {}) {
  return {
    _key: preset.id || `n${Math.random().toString(36).slice(2)}`,
    id: preset.id || null,
    tipo: preset.tipo || 'texto',
    etiqueta: preset.etiqueta || '',
    opciones: preset.opciones || [],
    /* null = que decida el tamano de la lista. */
    buscable: typeof preset.buscable === 'boolean' ? preset.buscable : null,
    requerido: preset.requerido ?? true,
    grupo: preset.grupo || '',
    ayuda: preset.ayuda || '',
    /* Sin esto la condición se perdía al guardar: el editor la mostraba, el
       usuario la definía, y `nuevoCampo` la dejaba fuera del objeto que viaja
       al servidor. */
    visible_si: preset.visible_si || null,
    ticket_type_id: preset.ticket_type_id || '',   // '' = todas las boletas
  };
}

/* ── Cargar preguntas desde la plantilla ──────────────────────────────

   Antes esto aceptaba cualquier hoja y adivinaba las columnas por sinónimos
   («pregunta», «enunciado», «campo», «nombre»…) y el tipo por otra tabla de
   sinónimos. Sonaba servicial y era lo contrario: adivinar falla EN SILENCIO.
   Una columna llamada «Tipo» que traía el tipo de BOLETA se tomaba como tipo
   de pregunta, la importación decía «listo», y el error salía en la página
   pública con gente ya comprando.

   Ahora hay una plantilla y la hoja se adapta a ella. Se pierde la comodidad
   de subir cualquier archivo; se gana que cuando algo no encaja se diga qué
   fila y qué columna, en vez de colar una interpretación equivocada.

   La definición de la plantilla viene del servidor con el catálogo, así que la
   hoja que se descarga y la que se acepta al subir son la misma por
   construcción. */

function ImportarDefinicion({ catalogo, onAgregar, onCerrar, cupo, nombreEvento }) {
  const [hoja, setHoja]         = useState(null);
  const [lectura, setLectura]   = useState(null);
  const [error, setError]       = useState('');
  const [cargando, setCargando] = useState(false);
  const [bajando, setBajando]   = useState(false);

  const plantilla = catalogo.plantilla;

  const bajarPlantilla = async () => {
    setBajando(true);
    try { await descargarPlantilla(plantilla, nombreEvento); }
    catch (e) { setError(`No se pudo generar la plantilla: ${e.message}`); }
    finally { setBajando(false); }
  };

  const tomarArchivo = async (file) => {
    if (!file) return;
    setError(''); setCargando(true); setHoja(null); setLectura(null);
    try {
      /* Por nombre, no la primera: la plantilla trae tres pestañas. */
      const h = await leerHoja(file, { hojaPreferida: HOJA_DATOS });
      const r = leerPlantilla(h, plantilla);
      if (r.error) { setError(r.error); return; }
      setHoja(h);
      setLectura(r);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };

  const listas = lectura?.campos || [];
  const errores = lectura?.errores || [];
  const caben = Math.min(listas.length, cupo);

  if (!plantilla) {
    return (
      <div className="rounded-2xl border border-border bg-surface/60 p-4">
        <p className="text-sm text-text-2">Este servidor todavía no publica la plantilla de importación.</p>
        <button onClick={onCerrar} className="btn-secondary btn-sm mt-3">Cerrar</button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-surface/60 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-1">Cargar preguntas desde la plantilla</p>
          <p className="text-xs text-text-3 mt-0.5 leading-relaxed max-w-xl">
            El formato es fijo: así se sabe exactamente cuál columna es la pregunta, cuál el tipo y
            cuáles las respuestas posibles. Descarga la plantilla, copia tus preguntas dentro y súbela.
          </p>
        </div>
        <button onClick={onCerrar} className="text-text-3 hover:text-text-1 text-sm shrink-0" aria-label="Cerrar">×</button>
      </div>

      {/* Los dos pasos, uno al lado del otro. Descargar va primero y con más
          peso: subir sin la plantilla es el camino que termina en rechazo. */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">Paso 1</p>
          <button onClick={bajarPlantilla} disabled={bajando} className="btn-primary btn-sm w-full">
            {bajando ? <><Spinner size="sm" /> Generando…</> : 'Descargar la plantilla'}
          </button>
          <p className="text-[11px] text-text-3 mt-2 leading-relaxed">
            Excel con las columnas exactas, un ejemplo de cada tipo de pregunta y una hoja de
            instrucciones.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">Paso 2</p>
          <label className="btn-secondary btn-sm w-full cursor-pointer justify-center">
            {cargando ? <><Spinner size="sm" /> Leyendo…</> : 'Subir la hoja llena'}
            <input type="file" accept={FORMATOS_ACEPTADOS} className="hidden"
              onChange={e => tomarArchivo(e.target.files?.[0])} />
          </label>
          <p className="text-[11px] text-text-3 mt-2 leading-relaxed">
            Se lee la primera hoja del archivo. Borra las filas de ejemplo antes de subirla.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-danger-light bg-danger/10 rounded-xl px-3 py-2 leading-relaxed">{error}</p>
      )}

      {lectura && (
        <>
          {/* Los errores ANTES de la vista previa: si hay filas rechazadas, es
              lo primero que hay que ver, no el resumen de lo que sí entró. */}
          {errores.length > 0 && (
            <div className="rounded-2xl border border-warning/30 bg-warning/5 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-warning-light">
                {errores.length} {errores.length === 1 ? 'fila no se pudo leer' : 'filas no se pudieron leer'}
              </p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {errores.slice(0, 12).map((e, i) => (
                  <li key={i} className="text-[11px] text-text-2 leading-relaxed">
                    <span className="text-text-3">Fila {e.fila}</span>
                    {e.pregunta ? ` · ${e.pregunta}` : ''} — {e.motivo}
                  </li>
                ))}
              </ul>
              {errores.length > 12 && (
                <p className="text-[11px] text-text-3">y {errores.length - 12} más.</p>
              )}
              <p className="text-[11px] text-text-3">
                Las demás filas se pueden agregar igual; corrige estas en la hoja y vuelve a subirla.
              </p>
            </div>
          )}

          {listas.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface-2/40 overflow-hidden">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-text-2">
                  {listas.length} {listas.length === 1 ? 'pregunta lista' : 'preguntas listas'}
                  {caben < listas.length && (
                    <span className="text-warning-light"> · sólo caben {caben}, ya tienes otras</span>
                  )}
                </p>
              </div>
              <ul className="divide-y divide-border/60 max-h-72 overflow-y-auto">
                {listas.slice(0, caben).map((c, i) => (
                  <li key={i} className="px-4 py-2 flex items-baseline gap-3">
                    <span className="text-[11px] text-text-3 w-6 shrink-0">{i + 1}</span>
                    <span className="text-sm text-text-1 flex-1 min-w-0 truncate">{c.etiqueta}</span>
                    <span className="text-[11px] text-text-3 shrink-0">
                      {catalogo.tipos.find(t => t.id === c.tipo)?.label || c.tipo}
                      {c.opciones.length > 0 && ` · ${c.opciones.length} opciones`}
                      {c.requerido && ' · obligatoria'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {caben > 0 && (
            <button onClick={() => onAgregar(listas.slice(0, caben))} className="btn-primary btn-sm">
              Agregar {caben} {caben === 1 ? 'pregunta' : 'preguntas'}
            </button>
          )}
        </>
      )}
    </div>
  );
}


/* `ticketTypeId` acota la vista a UNA boleta: personas, staff y empresas no se
   registran igual, y editar las tres en una sola lista obliga a leer la
   etiqueta de cada pregunta para saber a quién le toca.

   Filtra lo que se MUESTRA, nunca lo que se guarda. El servidor hace un diff
   contra la lista completa, así que mandar sólo lo visible borraría las
   preguntas de las demás boletas — el error caro que este filtro podría
   introducir si se hiciera a la ligera. */
export default function FormularioTab({
  evento, ticketTypeId = null,
  requiereNombre, onRequiereNombre,
  requiereEmail, onRequiereEmail,
  requiereTelefono, onRequiereTelefono,
}) {
  const [campos, setCampos] = useState([]);
  const [tiposBoleta, setTiposBoleta] = useState([]);
  const [catalogo, setCatalogo] = useState({
    tipos: [], grupos: [], fichas: [], conOpciones: new Set(), max: 60, agrupacion: false, plantilla: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [importando, setImportando] = useState(false);
  const { success, error: toastErr } = useToast();
  const finLista = useRef(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      eventosApi.getFormulario(evento.id),
      ticketsApi.list(evento.id).catch(() => ({ tickets: [] })),
    ])
      .then(([d, tt]) => {
        const tipos = d.tipos || [];
        setCatalogo({
          tipos,
          grupos: d.grupos || [],
          fichas: d.fichas || [],
          conOpciones: new Set(tipos.filter(t => t.conOpciones).map(t => t.id)),
          max: d.max_campos || 60,
          agrupacion: Boolean(d.agrupacion_lista),
          /* La plantilla de importacion la define el servidor: asi la hoja que
             se descarga y la que se acepta al subir son la misma por
             construccion, no por coincidencia. */
          plantilla: d.plantilla || null,
        });
        setCampos((d.campos || []).map(c => nuevoCampo({ ...c, opciones: c.opciones || [] })));
        setTiposBoleta(tt.tickets || tt.ticket_types || []);
      })
      .catch(e => toastErr(e.message))
      .finally(() => setLoading(false));
    /* eslint-disable-next-line */
  }, [evento.id]);

  const cupo = Math.max(0, catalogo.max - campos.length);

  /* Lo que se ve con una boleta elegida: lo suyo y lo que vale para todas.
     `campos` sigue entero para guardar. */
  const visibles = ticketTypeId
    ? campos.filter(c => !c.ticket_type_id || c.ticket_type_id === ticketTypeId)
    : campos;

  /* Las demás boletas, para poder copiarles el formulario. */
  const otrasBoletas = ticketTypeId ? tiposBoleta.filter(t => t.id !== ticketTypeId) : [];

  /* Con una boleta elegida, lo que se agregue es SUYO. Si no, vale para todas.
     Es lo que la persona espera: entró a editar el registro del staff, así que
     las preguntas que escribe ahí son del staff. */
  const conBoleta = (preset = {}) => ({ ticket_type_id: ticketTypeId || '', ...preset });

  const agregar = (preset) => {
    if (cupo === 0) { toastErr(`El formulario ya tiene el máximo de ${catalogo.max} preguntas.`); return; }
    setCampos(list => [...list, nuevoCampo(conBoleta(preset))]);
    setTimeout(() => finLista.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60);
  };
  const agregarVarios = (presets) => {
    if (!presets.length) return;
    setCampos(list => [...list, ...presets.map(p => nuevoCampo(conBoleta(p)))]);
    success(`${presets.length} ${presets.length === 1 ? 'pregunta agregada' : 'preguntas agregadas'}. Revisa y guarda.`);
  };

  /* Copiar las preguntas de otra boleta a ésta.

     El caso que lo pide: staff y expositores comparten casi todo el
     formulario y se diferencian en dos preguntas. Rearmar veinte a mano para
     cambiar dos es lo que hace que nadie use los formularios por boleta.

     Se copia lo PROPIO de la otra —lo que ya vale para todas no hace falta
     duplicarlo— y se saltan las que esta boleta ya tiene con el mismo
     enunciado. */
  /* Separar los formularios: lo compartido pasa a ser propio de cada boleta.

     El modelo por defecto es «una pregunta vale para todas», y para la mayoría
     de eventos está bien. Pero cuando de verdad se quiere un formulario por
     público —persona, staff, empresa— ese default estorba: borrar algo desde
     una boleta lo borra de todas, y cambiarlo pregunta por pregunta con veinte
     encima no lo hace nadie.

     Después de esto, cada boleta tiene su lista y se toca sin miedo.

     Dos decisiones que conviene entender antes de pulsarlo:

     La pregunta original SE QUEDA con la boleta que estás mirando, y las demás
     reciben copias nuevas. Es arbitrario, sí, pero conserva el `id` —y con él
     las respuestas ya diligenciadas— para al menos una boleta, en vez de
     perderlas para todas. Por eso se avisa de hacerlo ANTES de abrir el
     registro, no después.

     Y no hay vuelta atrás con un botón: deshacerlo es volver a poner «todas»
     en cada pregunta. */
  const separarFormularios = async () => {
    const compartidas = campos.filter(c => !c.ticket_type_id);
    if (compartidas.length === 0) { toastErr('No hay preguntas compartidas que separar.'); return; }
    if (tiposBoleta.length < 2) { toastErr('Hace falta más de un tipo de boleta.'); return; }

    const nombreActual = tiposBoleta.find(t => t.id === ticketTypeId)?.nombre || 'la boleta actual';
    const yaGuardadas = compartidas.filter(c => c.id).length;

    const ok = await confirmDialog({
      title: 'Separar los formularios',
      message:
        `${compartidas.length} preguntas se le piden hoy a todas las boletas. Cada una pasará a tener su propia copia, `
        + `así que a partir de ahí podrás cambiarlas o borrarlas sin tocar a las demás.

`
        + (yaGuardadas > 0
            ? `Ojo: ${yaGuardadas} ya están guardadas. Las originales se quedan con «${nombreActual}» —conservando las respuestas ya dadas— y las otras boletas reciben copias nuevas. Conviene hacerlo antes de abrir el registro.`
            : 'Todavía no hay respuestas, así que es el mejor momento para hacerlo.'),
      confirmLabel: `Separar en ${tiposBoleta.length} formularios`,
    });
    if (!ok) return;

    setCampos(list => {
      const propias = list.filter(c => c.ticket_type_id);
      const salida = [];
      for (const c of list) {
        if (c.ticket_type_id) continue;
        /* La original se queda con la boleta que se está mirando. */
        salida.push({ ...c, ticket_type_id: ticketTypeId });
        for (const t of tiposBoleta) {
          if (t.id === ticketTypeId) continue;
          salida.push(nuevoCampo({ ...c, id: null, _key: undefined, ticket_type_id: t.id }));
        }
      }
      return [...salida, ...propias];
    });
    success(`Listo: cada boleta tiene ahora su propio formulario. Revisa y guarda.`);
  };

  const copiarDe = (otroTipoId, nombreOtro) => {
    const suyasDeAlla = campos.filter(c => c.ticket_type_id === otroTipoId);
    if (suyasDeAlla.length === 0) { toastErr(`«${nombreOtro}» no tiene preguntas propias que copiar.`); return; }
    const yaEstan = new Set(visibles.map(c => clave(c.etiqueta)));
    const nuevas = suyasDeAlla.filter(c => !yaEstan.has(clave(c.etiqueta)));
    if (nuevas.length === 0) { toastErr(`Ya tienes todas las preguntas de «${nombreOtro}».`); return; }
    if (nuevas.length > cupo) { toastErr(`No caben: son ${nuevas.length} preguntas y quedan ${cupo} espacios.`); return; }
    setCampos(list => [...list, ...nuevas.map(c => nuevoCampo({ ...c, id: null, _key: undefined, ticket_type_id: ticketTypeId || '' }))]);
    success(`${nuevas.length} preguntas copiadas de «${nombreOtro}». Revisa y guarda.`);
  };

  /* Importar desde una hoja FUSIONA en vez de apilar, y en el empate manda el
     archivo.

     El caso real es este: alguien escribió a mano media docena de preguntas
     mientras esperaba la plantilla, y luego sube el Excel bueno con esas
     mismas y treinta más. Apilando quedaban duplicadas —el asistente las ve
     dos veces— y saltándolas ganaba la versión vieja, que suele ser la que
     está mal escrita o sin opciones.

     Gana el archivo porque es el documento que el organizador revisó. Se
     conserva el `id` de la pregunta que ya existía: el backend hace un diff
     por id, y perderlo dejaría huérfanas las respuestas ya diligenciadas. */
  const fusionarDesdeArchivo = (presets) => {
    if (!presets.length) return;
    let reemplazadas = 0;
    setCampos(list => {
      const porClave = new Map(list.map(c => [clave(c.etiqueta), c]));
      const nuevos = [];
      for (const p of presets) {
        const previo = porClave.get(clave(p.etiqueta));
        if (previo) {
          reemplazadas++;
          porClave.set(clave(p.etiqueta), nuevoCampo({ ...p, id: previo.id, _key: previo._key }));
        } else {
          nuevos.push(nuevoCampo(p));
        }
      }
      /* Las que ya estaban conservan su sitio; las nuevas van detrás. */
      return [...list.map(c => porClave.get(clave(c.etiqueta)) || c), ...nuevos];
    });
    const añadidas = presets.length - reemplazadas;
    success(reemplazadas === 0
      ? `${añadidas} ${añadidas === 1 ? 'pregunta agregada' : 'preguntas agregadas'}. Revisa y guarda.`
      : `${añadidas} nuevas y ${reemplazadas} actualizadas con lo que dice el archivo. Revisa y guarda.`);
  };

  /* Una ficha se agrega entera pero sin repetir lo que ya está: agregar dos
     veces la de caracterización dejaría 44 preguntas duplicadas. */
  /* ¿Está entera? Es lo que decide si el botón agrega o quita. */
  const fichaPuesta = (ficha) => {
    if (!ficha.campos?.length) return false;
    const estan = new Set(campos.map(c => clave(c.etiqueta)));
    return ficha.campos.every(c => estan.has(clave(c.etiqueta)));
  };

  /* Quitar la ficha entera de una vez.

     Antes, si se pulsaba por error la de caracterización, había que borrar
     veintidós preguntas a mano, una por una. Nadie hace eso: se guarda el
     formulario equivocado o se abandona la pantalla.

     Si alguna ya está guardada en el servidor se avisa antes, porque el
     backend hace el diff por id y borrarla se lleva por delante las respuestas
     que ya haya diligenciado alguien. */
  const quitarFicha = async (ficha) => {
    const suyas = new Set(ficha.campos.map(c => clave(c.etiqueta)));
    const guardadas = campos.filter(c => suyas.has(clave(c.etiqueta)) && c.id).length;
    if (guardadas > 0) {
      const ok = await confirmDialog({
        title: `Quitar «${ficha.nombre}»`,
        message: `${guardadas} de estas preguntas ya están guardadas. Si quitas la ficha y guardas los cambios, se borran junto con las respuestas que ya haya dado la gente.`,
        confirmLabel: 'Quitar de todos modos',
        danger: true,
      });
      if (!ok) return;
    }
    setCampos(list => list.filter(c => !suyas.has(clave(c.etiqueta))));
    success(`«${ficha.nombre}» quitada del formulario.`);
  };

  const agregarFicha = (ficha) => {
    const yaEstan = new Set(campos.map(c => clave(c.etiqueta)));
    const nuevos = ficha.campos.filter(c => !yaEstan.has(clave(c.etiqueta)));
    if (nuevos.length === 0) { toastErr(`«${ficha.nombre}» ya está completa en el formulario.`); return; }
    if (nuevos.length > cupo) {
      toastErr(`No caben: la ficha trae ${nuevos.length} preguntas nuevas y sólo quedan ${cupo} espacios.`);
      return;
    }
    agregarVarios(nuevos);
  };

  /* Quitar, sabiendo a quién se le quita.

     Mirando UNA boleta se ven dos cosas mezcladas: lo suyo y lo que se le pide
     a todas. Borrar lo segundo lo borra para todo el mundo — es correcto por
     dentro, y una trampa por fuera: estás en «vip» y das por hecho que lo que
     haces ahí se queda en «vip».

     Así que cuando la pregunta es compartida se dice antes, y se ofrece la
     salida que casi siempre es la que se quería: dejársela a las demás y
     quitarla sólo de ésta. Eso es un cambio de alcance, no un borrado, y por
     eso conserva la pregunta y sus respuestas. */
  const quitar = async (key) => {
    const campo = campos.find(c => c._key === key);
    const compartida = campo && !campo.ticket_type_id;

    if (ticketTypeId && compartida) {
      const nombreBoleta = tiposBoleta.find(t => t.id === ticketTypeId)?.nombre || 'esta boleta';
      const otras = tiposBoleta.filter(t => t.id !== ticketTypeId);

      const ok = await confirmDialog({
        title: 'Esta pregunta es de todas las boletas',
        message: otras.length > 0
          ? `«${campo.etiqueta || 'Sin enunciado'}» se le pide a todas. Si la quitas, desaparece también de ${otras.map(t => `«${t.nombre}»`).join(', ')}.\n\nSi lo que quieres es que sólo «${nombreBoleta}» deje de pedirla, cancela y cámbiale «Se pide en» a otra boleta.`
          : `«${campo.etiqueta || 'Sin enunciado'}» se le pide a todas las boletas.`,
        confirmLabel: 'Quitarla de todas',
        danger: true,
      });
      if (!ok) return;
    }

    setCampos(list => list.filter(c => c._key !== key));
  };
  const mover  = (key, dir) => setCampos(list => {
    const i = list.findIndex(c => c._key === key);
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const copia = [...list];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    return copia;
  });
  const actualizar = (key, patch) => setCampos(list => list.map(c => c._key === key ? { ...c, ...patch } : c));

  /* Al cambiar de tipo se limpian las opciones si el nuevo tipo no las usa,
     igual que hace el servidor al guardar. Si no, quedan restos invisibles. */
  const cambiarTipo = (key, tipo) => setCampos(list => list.map(c => {
    if (c._key !== key) return c;
    return { ...c, tipo, opciones: catalogo.conOpciones.has(tipo) ? c.opciones : [] };
  }));

  const guardar = async () => {
    for (const c of campos) {
      if (!c.etiqueta.trim()) { toastErr('Todas las preguntas necesitan un enunciado.'); return; }
      if (catalogo.conOpciones.has(c.tipo) && c.opciones.length === 0) {
        toastErr(`«${c.etiqueta}» necesita al menos una opción.`); return;
      }
    }
    setSaving(true);
    try {
      const payload = campos.map(c => ({
        id: c.id, tipo: c.tipo, etiqueta: c.etiqueta, opciones: c.opciones,
        requerido: c.requerido, grupo: c.grupo || null, ayuda: c.ayuda || null,
        ticket_type_id: c.ticket_type_id || null,
        buscable: c.buscable,
        visible_si: c.visible_si || null,
      }));
      const r = await eventosApi.guardarFormulario(evento.id, payload);
      setCampos((r.campos || []).map(c => nuevoCampo({ ...c, opciones: c.opciones || [] })));
      success('Formulario guardado. Ya se aplica en la página de compra.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <GLoader message="Cargando formulario..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display text-text-1 tracking-tight mb-1">Formulario de compra</h2>
        <p className="text-sm text-text-3 leading-relaxed">
          Define qué información le pides a cada persona al comprar o reservar una boleta,
          además de nombre y correo (que siempre se piden).
          {tiposBoleta.length > 1
            ? ' Cada pregunta puede ir en todas las boletas o sólo en un tipo.'
            : ' Se aplica a todas las boletas de este evento.'}
        </p>
      </div>

      {/* Fichas prearmadas + carga desde hoja */}
      <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
        <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">Empezar con algo hecho</p>
        <div className="flex flex-wrap gap-2">
          {catalogo.fichas.map(f => {
            const puesta = fichaPuesta(f);
            return (
              <button key={f.id} onClick={() => (puesta ? quitarFicha(f) : agregarFicha(f))}
                title={puesta ? `Quitar las ${f.campos.length} preguntas de «${f.nombre}»` : f.descripcion}
                aria-pressed={puesta}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors
                            ${puesta
                              ? 'border-success/40 bg-success/10 text-text-1 hover:border-danger/40 hover:bg-danger/10'
                              : 'border-border-2 text-text-2 hover:text-text-1 hover:bg-surface-2'}`}>
                <span className={puesta ? 'text-success' : 'text-primary-light'}>{puesta ? '✓' : '+'}</span>
                {f.nombre}
                <span className="text-text-3">· {f.campos.length}</span>
              </button>
            );
          })}
          <button onClick={() => setImportando(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-2
                       text-xs text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
            <span className="text-primary-light">↑</span> Desde Excel o CSV
          </button>
          {/* Sólo cuando hay algo que separar y más de una boleta. Ofrecerlo
              siempre lo convertiría en un botón que casi nunca aplica. */}
          {ticketTypeId && tiposBoleta.length > 1 && campos.some(c => !c.ticket_type_id) && (
            <button onClick={separarFormularios}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-accent/50
                         bg-accent/10 text-xs text-text-1 hover:bg-accent/20 transition-colors">
              <span className="text-accent-light">⇄</span> Separar los formularios
              <span className="text-text-3">· {campos.filter(c => !c.ticket_type_id).length} compartidas</span>
            </button>
          )}
        </div>
        {catalogo.fichas.length > 0 && (
          <p className="text-[11px] text-text-3 leading-relaxed">
            {catalogo.fichas.find(f => f.id === 'caracterizacion')?.descripcion}
          </p>
        )}
      </div>

      {importando && (
        <ImportarDefinicion
          catalogo={catalogo}
          nombreEvento={evento?.titulo || evento?.slug || 'evento'}
          cupo={cupo}
          onAgregar={fusionarDesdeArchivo}
          onCerrar={() => setImportando(false)}
        />
      )}

      {/* Lo que pide la PLATAFORMA, a la vista y bloqueado.

          Nombre, correo y teléfono no son preguntas del formulario: son
          columnas de la boleta. Con ellas se emite el QR, se manda y se
          identifica a quien entra en el check-in — si se pudieran borrar, la
          boleta saldría sin nombre y sin dirección a la que enviarla. Por eso
          los tres siguen apareciendo SIEMPRE en el formulario público: lo que
          cambia con el interruptor es si hace falta escribir algo ahí o si se
          puede dejar en blanco.

          Pero esconderlas tampoco valía: aparecían como «Paso 1» en el
          registro, igual que si fueran preguntas del organizador, y desde aquí
          no se veían. Quien editaba el formulario no entendía de dónde salía
          ese bloque ni por qué no se podía mover.

          Así que se enseñan, con candado y con el motivo. Y el interruptor de
          cada una va SOBRE su fila, que es donde significa algo: el de
          teléfono antes vivía en una tarjeta aparte, tres bloques más abajo,
          preguntando por un campo que aquí no se veía. Nombre y correo son
          obligatorios por defecto — no `undefined` == opcional — para que
          ningún evento existente cambie de comportamiento sólo por abrir esta
          pantalla. */}
      <div className="rounded-2xl border border-border bg-surface-2/30 p-4 space-y-2.5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">Los pide la plataforma</p>
          <p className="text-[11px] text-text-3">Con esto se emite la boleta y se hace el check-in. Siempre se muestran; lo que se puede cambiar es si son obligatorios.</p>
        </div>
        {[
          ['Nombre completo', 'Va impreso en la escarapela y en el QR', requiereNombre !== false, onRequiereNombre],
          ['Correo electrónico', 'A donde se manda la boleta', requiereEmail !== false, onRequiereEmail],
          ['Teléfono', 'Para avisar por WhatsApp si el correo no llega', Boolean(requiereTelefono), onRequiereTelefono],
        ].map(([etiqueta, porque, obligatorio, onCambiar]) => (
          <div key={etiqueta} className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 px-3 py-2.5">
            <span className="text-text-3 text-sm" aria-hidden="true">🔒</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-1">
                {etiqueta}{obligatorio && <span className="text-danger-light"> *</span>}
              </p>
              <p className="text-[11px] text-text-3">{porque}</p>
            </div>
            {onCambiar ? (
              <label className="flex items-center gap-2 text-[11px] text-text-2 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={Boolean(obligatorio)}
                  onChange={e => onCambiar(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary" />
                Obligatorio
              </label>
            ) : (
              <span className="text-[11px] text-text-3 whitespace-nowrap">Siempre</span>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {visibles.length === 0 && (
          <div className="rounded-3xl border border-border bg-surface/40 px-6 py-12 text-center space-y-3">
            <p className="text-sm text-text-3">
              {ticketTypeId
                ? 'Esta boleta no pide nada todavía. Agrega preguntas suyas, o cópialas de otra.'
                : 'Aún no agregas preguntas.'}
            </p>
            {/* Copiar de otra boleta se ofrece aquí, que es donde hace falta:
                con la lista vacía delante y sin ganas de escribir veinte
                preguntas otra vez. */}
            {ticketTypeId && otrasBoletas.length > 0 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {otrasBoletas.map(t => (
                  <button key={t.id} onClick={() => copiarDe(t.id, t.nombre)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-2
                               text-xs text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
                    Usar las mismas que «{t.nombre}»
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {visibles.map((c, i) => {
          const grupoAnterior = i > 0 ? visibles[i - 1].grupo : null;
          const abreGrupo = catalogo.agrupacion && c.grupo && c.grupo !== grupoAnterior;
          return (
            <div key={c._key}>
              {abreGrupo && (
                <p className="text-[11px] uppercase tracking-widest text-primary-light font-semibold mb-1.5 mt-4 px-1">
                  {c.grupo}
                </p>
              )}
              {/* Mirando una boleta, distinguir de un vistazo lo suyo de lo
                  que es de todas. Sin esto las dos cosas se ven igual y quien
                  borra una compartida no se entera hasta que ya no está en
                  ninguna. El aviso al borrar es la segunda red; ésta es la
                  primera, y es la que evita el susto. */}
              <div className={`rounded-2xl border bg-surface/40 p-4 space-y-3
                               ${ticketTypeId && !c.ticket_type_id ? 'border-border-2 border-dashed' : 'border-border'}`}>
                {ticketTypeId && !c.ticket_type_id && (
                  <p className="text-[10px] uppercase tracking-widest text-text-3 font-semibold">
                    Se le pide a todas las boletas
                  </p>
                )}
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid sm:grid-cols-2 gap-2">
                    <div className="field">
                      <label className="label text-xs">Enunciado de la pregunta</label>
                      <input value={c.etiqueta} onChange={e => actualizar(c._key, { etiqueta: e.target.value })}
                        className="input rounded-xl py-2.5 text-sm" placeholder="Ej. Número de documento" />
                    </div>
                    <div className="field">
                      <label className="label text-xs">Tipo de respuesta</label>
                      <select value={c.tipo} onChange={e => cambiarTipo(c._key, e.target.value)}
                        className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                        {catalogo.tipos.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pt-6">
                    <button onClick={() => mover(c._key, -1)} disabled={i === 0} aria-label="Subir"
                      className="w-8 h-8 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center disabled:opacity-30">↑</button>
                    <button onClick={() => mover(c._key, 1)} disabled={i === campos.length - 1} aria-label="Bajar"
                      className="w-8 h-8 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center disabled:opacity-30">↓</button>
                    <button onClick={() => quitar(c._key)} aria-label="Quitar"
                      className="w-8 h-8 rounded-lg text-danger-light hover:bg-danger/10 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>

                {catalogo.conOpciones.has(c.tipo) && (
                  <div className="field">
                    <label className="label text-xs">
                      Opciones · una por línea
                      <span className="text-text-3 font-normal"> (puedes pegar una columna de Excel)</span>
                    </label>
                    <textarea
                      value={c.opciones.join('\n')}
                      onChange={e => actualizar(c._key, { opciones: columnaAOpciones(e.target.value) })}
                      rows={Math.min(8, Math.max(3, c.opciones.length + 1))}
                      className="input rounded-xl py-2 text-sm font-mono leading-relaxed"
                      placeholder={'XS\nS\nM\nL\nXL'} />
                    <p className="text-[11px] text-text-3 mt-1">
                      {c.opciones.length} {c.opciones.length === 1 ? 'opción' : 'opciones'}
                      {c.tipo === 'multiple' && ' · la persona podrá marcar varias'}
                    </p>

                    {/* Cómo se va a ver. No se pregunta «¿buscador o lista?»
                        en abstracto: la plataforma ya eligió por el tamaño y
                        aquí sólo se dice qué eligió, con la salida por si el
                        organizador quiere otra cosa. Preguntarlo siempre
                        obligaría a decidir 34 veces algo que casi nunca
                        importa. */}
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <span className="text-[11px] text-text-3">
                        {esBuscable(c)
                          ? 'Se verá como buscador: la persona escribe y se filtra.'
                          : 'Se verá como lista completa.'}
                      </span>
                      <select
                        value={typeof c.buscable === 'boolean' ? String(c.buscable) : 'auto'}
                        onChange={e => actualizar(c._key, {
                          buscable: e.target.value === 'auto' ? null : e.target.value === 'true',
                        })}
                        className="input bg-surface-2 rounded-lg py-1 px-2 text-[11px] w-auto">
                        <option value="auto">Automático</option>
                        <option value="true">Siempre buscador</option>
                        <option value="false">Siempre lista</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-2">
                  {catalogo.agrupacion && catalogo.grupos.length > 0 && (
                    <div className="field">
                      <label className="label text-xs">Grupo</label>
                      <select value={c.grupo || ''} onChange={e => actualizar(c._key, { grupo: e.target.value })}
                        className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                        <option value="">Sin agrupar</option>
                        {catalogo.grupos.map(g => <option key={g} value={g}>{g}</option>)}
                        {c.grupo && !catalogo.grupos.includes(c.grupo) && <option value={c.grupo}>{c.grupo}</option>}
                      </select>
                    </div>
                  )}
                  {tiposBoleta.length > 1 && (
                    <div className="field">
                      <label className="label text-xs">Se pide en</label>
                      <select value={c.ticket_type_id || ''} onChange={e => actualizar(c._key, { ticket_type_id: e.target.value })}
                        className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                        <option value="">Todas las boletas</option>
                        {tiposBoleta.map(t => <option key={t.id} value={t.id}>Sólo «{t.nombre}»</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="field">
                  <label className="label text-xs">Texto de ayuda <span className="text-text-3 font-normal">(opcional)</span></label>
                  <input value={c.ayuda || ''} onChange={e => actualizar(c._key, { ayuda: e.target.value })}
                    className="input rounded-xl py-2 text-xs" maxLength={300}
                    placeholder="Se muestra debajo de la pregunta. Ej. «Sin puntos ni guiones»" />
                </div>

                {c.tipo === 'foto' && (
                  <p className="text-xs text-text-3 bg-surface-2/60 rounded-xl px-3 py-2">
                    La persona podrá subir una foto (JPG, PNG o WEBP) al llenar el formulario. Queda junto a su
                    respuesta y se ve desde el detalle del asistente.
                  </p>
                )}

                <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer w-fit">
                  <input type="checkbox" checked={c.requerido} onChange={e => actualizar(c._key, { requerido: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary" />
                  Pregunta obligatoria
                </label>

                <CondicionEditor campo={c} campos={campos}
                  onChange={(visible_si) => actualizar(c._key, { visible_si })} />
              </div>
            </div>
          );
        })}
        <div ref={finLista} />
      </div>

      {/* Sólo en el formulario del EVENTO. Un sub-evento tiene su propio editor
          de preguntas cortas y no tiene sentido subirle un padrón: quien se
          apunta a un taller ya pasó por el formulario grande. */}
      {!ticketTypeId && <PadronPrevio evento={evento} campos={campos} />}

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => agregar()} disabled={cupo === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border-2 text-sm
                       text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors disabled:opacity-40">
            + Agregar pregunta
          </button>
          <span className="text-xs text-text-3 tabular-nums">
            {campos.length} de {catalogo.max}
          </span>
        </div>
        <button onClick={guardar} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-text-1 text-bg hover:bg-white
                     text-sm font-semibold disabled:opacity-60 transition-all">
          {saving ? <><Spinner size="sm" /> Guardando...</> : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

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
function CondicionEditor({ campo, campos, onChange }) {
  const antecedentes = posiblesAntecedentes(campos, campo._key || campo.id);
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

/* ─────────── Padrón de eventos anteriores ───────────

   Sube la base de asistentes de ediciones pasadas. Al escribir la cédula en el
   formulario público, se rellena solo lo que ya se sabía.

   Dos cosas que conviene no perder de vista al leer esto:

   · El documento NO se guarda. El servidor lo convierte en un hash con la sal
     del evento y guarda sólo eso, así que la tabla no sirve para listar
     cédulas ni aunque alguien la lea entera. Ver la migración 0085.
   · Se avisa de las columnas que ninguna pregunta recoge. Es la mitad útil de
     todo esto: subir un archivo con «Empresa» cuando el formulario no pregunta
     la empresa no sirve de nada, y sin el aviso no hay forma de enterarse. */
function PadronPrevio({ evento, campos }) {
  const { success, error: toastErr } = useToast();
  const [estado, setEstado]   = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [informe, setInforme]   = useState(null);

  useEffect(() => {
    eventosApi.padronEstado(evento.id).then(setEstado).catch(() => setEstado({ filas: 0, disponible: false }));
  }, [evento.id]);

  const tomar = async (file) => {
    if (!file) return;
    setSubiendo(true); setInforme(null);
    try {
      const hoja = await leerHoja(file);
      if (!hoja.filas?.length) throw new Error('La hoja no tiene filas.');
      /* `__fila` es del lector, no del padrón: se quita para no guardar un
         número de fila de un archivo que nadie va a volver a abrir. */
      const filas = hoja.filas.map(({ __fila, ...resto }) => resto);
      const r = await eventosApi.subirPadron(evento.id, filas, file.name);
      setInforme(r);
      setEstado(e => ({ ...(e || {}), filas: r.guardadas, disponible: true }));
      success(`${r.guardadas} personas en el padrón.`);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSubiendo(false); }
  };

  const borrar = async () => {
    if (!(await confirmDialog({ message: '¿Borrar el padrón de este evento? El formulario dejará de prellenarse.', danger: true }))) return;
    try { await eventosApi.borrarPadron(evento.id); setEstado({ filas: 0, disponible: true }); setInforme(null); success('Padrón borrado.'); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-1">Datos de eventos anteriores</p>
          <p className="text-xs text-text-3 mt-0.5 leading-relaxed max-w-xl">
            Sube la base de quienes ya vinieron. Al escribir su documento, el formulario se rellena
            con lo que ya sabías y sólo le pides lo que falta.
            El documento no se guarda: se guarda un código derivado de él.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="btn-secondary btn-sm cursor-pointer">
            {subiendo ? <><Spinner size="sm" /> Subiendo…</> : estado?.filas ? 'Reemplazar' : 'Subir archivo'}
            <input type="file" accept={FORMATOS_ACEPTADOS} className="hidden"
              onChange={e => tomar(e.target.files?.[0])} />
          </label>
          {estado?.filas > 0 && (
            <button onClick={borrar} className="text-xs text-text-3 hover:text-danger transition-colors">Borrar</button>
          )}
        </div>
      </div>

      {estado && (
        <p className="text-[11px] text-text-3">
          {estado.filas > 0
            ? `${estado.filas} personas en el padrón.`
            : 'Todavía no hay padrón. La columna del documento puede llamarse documento, cédula, identificación, NIT o DNI.'}
        </p>
      )}

      {informe?.sin_documento > 0 && (
        <p className="text-[11px] text-warning">
          {informe.sin_documento} fila{informe.sin_documento === 1 ? '' : 's'} sin documento reconocible. Esas no se pueden buscar.
        </p>
      )}

      {informe?.columnas_sin_pregunta?.length > 0 && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5">
          <p className="text-[11px] text-text-2 leading-relaxed">
            <b className="text-text-1">Tu archivo trae datos que nadie pregunta.</b>{' '}
            Para aprovechar {informe.columnas_sin_pregunta.length === 1 ? 'esta columna' : 'estas columnas'},
            añade una pregunta con ese mismo enunciado:{' '}
            <b className="text-text-1">{informe.columnas_sin_pregunta.join(', ')}</b>.
          </p>
        </div>
      )}

      {campos?.length === 0 && (
        <p className="text-[11px] text-warning">
          Este formulario todavía no tiene preguntas, así que no hay nada que prellenar.
        </p>
      )}
    </div>
  );
}
