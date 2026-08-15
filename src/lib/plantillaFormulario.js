import { construirLibro, descargar, nombreArchivo } from './hojaEscribir.js';

/* GESTEK — La plantilla única para cargar un formulario.

   ── Qué cambió y por qué ─────────────────────────────────────────────
   Antes esto aceptaba cualquier hoja y adivinaba las columnas por sinónimos:
   «pregunta», «enunciado», «campo», «nombre»… Suena servicial y es lo
   contrario. Adivinar falla EN SILENCIO: una columna llamada «Tipo» que
   contiene el tipo de boleta se toma como tipo de pregunta, el archivo se
   importa «bien», y el error aparece en la página pública cuando ya hay gente
   comprando.

   Ahora hay una plantilla y la hoja se adapta a ella. El evento se adapta a la
   plataforma, no al revés. El precio es que hay que descargarla; la ganancia es
   que cuando algo no encaja se dice cuál fila y cuál columna, en vez de dejar
   pasar una interpretación equivocada.

   La definición NO vive aquí: viene del servidor con el catálogo
   (`plantilla` en GET /eventos/:id/formulario). Si viviera en los dos lados,
   el archivo que se descarga y el que se acepta al subir acabarían siendo
   distintos, que es la peor versión de este problema. */

const norma = (v) => String(v ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

/* ── La hoja que se descarga ──────────────────────────────────────────── */

/* Tres pestañas, y cada una existe por un motivo:

   · Formulario   — lo único que se lee al importar. Va con las filas de
                    ejemplo dentro: una plantilla vacía se rellena mal, una con
                    un ejemplo de cada tipo se copia bien.
   · Instrucciones— porque nadie lee documentación aparte, pero sí la pestaña
                    de al lado. No puede ir en la misma hoja que los datos: se
                    subiría como si fueran preguntas.
   · Valores      — la lista exacta de lo que se acepta en las dos columnas de
                    tipo. Es lo que evita el viaje de ida y vuelta de subir,
                    que lo rechacen, y adivinar cómo se escribía. */
export async function descargarPlantilla(plantilla, nombreEvento = 'evento') {
  const columnas = plantilla.columnas.map(c => c.titulo);

  const instrucciones = [
    ['Cómo llenar esta plantilla'],
    [''],
    ['Una fila por pregunta, en la pestaña «Formulario».'],
    ['No cambies los títulos de las columnas ni el orden: es lo que se lee al importar.'],
    ['Borra las filas de ejemplo antes de subirla, o se importarán como preguntas tuyas.'],
    [''],
    ['Qué significa cada columna'],
    ...plantilla.columnas.map(c => [
      c.titulo + (c.obligatoria ? '  (obligatoria)' : ''),
      c.ayuda || '',
    ]),
    [''],
    ['Sobre las dos columnas de tipo'],
    ['«Tipo de pregunta» es CÓMO se responde: una línea, un párrafo, elegir de una lista…'],
    ['«Tipo de dato» es QUÉ tiene que ser: un correo, un teléfono, un documento.'],
    ['Ejemplo: «Correo del asistente» es Texto corto + Correo electrónico. Así la plataforma'],
    ['verifica que lleve arroba y avisa a quien se registra, en vez de guardar cualquier cosa.'],
    [''],
    ['Si eliges «Elegir una opción» o «Elegir varias opciones», la columna Opciones es obligatoria.'],
    ['Se separan con punto y coma:  La Candelaria; Modelia; Chapinero'],
    ['Con más de 8 opciones el campo se convierte solo en un buscador.'],
  ];

  const valores = [
    ['Tipo de pregunta', '¿Necesita opciones?'],
    ...plantilla.tipos_pregunta.map(t => [t.titulo, t.exigeOpciones ? 'Sí' : 'No']),
    [''],
    ['Tipo de dato', 'Qué verifica'],
    ...plantilla.tipos_dato.map(t => [t.titulo, t.id === 'texto' ? 'Nada, texto libre' : `Que sea ${t.titulo.toLowerCase()}`]),
  ];

  const libro = await construirLibro([
    { titulo: 'Formulario',    filas: [columnas, ...plantilla.ejemplo] },
    { titulo: 'Instrucciones', filas: instrucciones },
    { titulo: 'Valores',       filas: valores },
  ]);

  descargar(libro, nombreArchivo(`plantilla-formulario-${nombreEvento}`, 'xlsx'));
}

/* ── Leer una hoja subida ─────────────────────────────────────────────── */

/* Devuelve { error } si la hoja entera no sirve, o { campos, errores } con el
   detalle fila por fila. Se separan a propósito: que falte una columna es un
   problema del archivo y no tiene sentido listar 300 filas malas; que falle una
   fila concreta sí se lista, porque las demás se pueden importar igual. */
export function leerPlantilla(hoja, plantilla) {
  const porTitulo = new Map(hoja.columnas.map(c => [norma(c), c]));

  /* Se acepta cualquier mayúscula o tilde en el título —quien llena la hoja no
     tiene por qué respetarlas—, pero NO un título distinto. Ahí está la línea
     entre ser tolerante y volver a adivinar. */
  const mapa = {};
  const faltan = [];
  for (const col of plantilla.columnas) {
    const encontrada = porTitulo.get(norma(col.titulo));
    if (encontrada) mapa[col.id] = encontrada;
    else if (col.obligatoria) faltan.push(col.titulo);
  }

  if (faltan.length) {
    return {
      error: `A la hoja le faltan columnas: ${faltan.join(', ')}. Descarga la plantilla y copia tus preguntas dentro — los títulos tienen que ser los mismos.`,
    };
  }

  const val = (fila, id) => (mapa[id] ? String(fila[mapa[id]] ?? '').trim() : '');

  const campos = [];
  const errores = [];

  hoja.filas.forEach((fila) => {
    const nFila = fila.__fila;
    const pregunta = val(fila, 'pregunta');

    /* Una fila del todo vacía no es un error: son las que deja Excel al final
       de una hoja donde alguien borró contenido. Quejarse de ellas haría que
       toda importación pareciera rota. */
    const algo = plantilla.columnas.some(c => val(fila, c.id));
    if (!algo) return;

    if (!pregunta) {
      errores.push({ fila: nFila, motivo: 'La fila tiene datos pero no tiene pregunta.' });
      return;
    }

    const r = resolver(val(fila, 'tipo_pregunta'), val(fila, 'tipo_dato'), plantilla);
    if (r.error) { errores.push({ fila: nFila, motivo: r.error, pregunta }); return; }

    const opciones = partirOpciones(val(fila, 'opciones'));
    if (r.exigeOpciones && opciones.length === 0) {
      errores.push({
        fila: nFila, pregunta,
        motivo: 'Es una pregunta de elegir, así que necesita opciones en la columna «Opciones», separadas por punto y coma.',
      });
      return;
    }

    const ordenCrudo = val(fila, 'orden');
    const orden = Number(ordenCrudo);

    campos.push({
      etiqueta : pregunta.slice(0, 200),
      tipo     : r.tipo,
      opciones : r.exigeOpciones ? opciones : [],
      requerido: esSi(val(fila, 'obligatoria')),
      grupo    : val(fila, 'grupo').slice(0, 80),
      ayuda    : val(fila, 'ayuda').slice(0, 300),
      /* Si la columna Orden viene vacía o con basura, manda el orden de las
         filas. Nadie debería perder una importación por no numerar. */
      _orden   : Number.isFinite(orden) && ordenCrudo !== '' ? orden : nFila,
      _fila    : nFila,
    });
  });

  campos.sort((a, b) => a._orden - b._orden);
  return { campos, errores };
}

/* Espejo de `resolverTipoPlantilla` del servidor. Vive aquí para poder avisar
   ANTES de subir; el servidor sigue siendo el que decide. */
function resolver(tipoPregunta, tipoDato, plantilla) {
  const p = plantilla.tipos_pregunta.find(t => norma(t.titulo) === norma(tipoPregunta) || t.id === norma(tipoPregunta));
  if (!p) {
    return {
      error: tipoPregunta
        ? `«${tipoPregunta}» no es un tipo de pregunta válido.`
        : 'Falta el tipo de pregunta.',
      opcionesValidas: plantilla.tipos_pregunta.map(t => t.titulo),
    };
  }

  const d = tipoDato
    ? plantilla.tipos_dato.find(t => norma(t.titulo) === norma(tipoDato) || t.id === norma(tipoDato))
    : null;
  if (tipoDato && !d) {
    return {
      error: `«${tipoDato}» no es un tipo de dato válido.`,
      opcionesValidas: plantilla.tipos_dato.map(t => t.titulo),
    };
  }

  /* El `tipo` de cada entrada lo manda el servidor con el catálogo: aquí no se
     mantiene una tabla de equivalencias, que es lo que ya se separó una vez
     entre el editor de correos y el backend.

     La regla de combinación sí está aquí, y es de tres líneas:

       · elegir una o varias manda siempre — una lista de opciones no puede ser
         un correo por mucho que lo diga la columna de dato, o el campo
         perdería sus opciones;
       · si el dato aporta verificación, gana sobre el texto corto: es lo que
         convierte «Texto corto» + «Correo» en un campo que exige arroba;
       · si no, se queda con el tipo de la pregunta.

     El servidor la reevalúa al guardar, así que una divergencia se rechaza en
     vez de colarse. */
  if (p.exigeOpciones) return { tipo: p.tipo, exigeOpciones: true };
  return { tipo: (d && d.tipo) ? d.tipo : p.tipo, exigeOpciones: false };
}

/* Punto y coma primero, porque es lo que dice la plantilla. Los saltos de
   línea también valen: es lo que sale al pegar una columna de Excel. */
export function partirOpciones(texto) {
  return String(texto ?? '')
    .split(/[;\n\r]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

const esSi = (v) => /^(si|sí|s|x|1|true|verdadero|obligator)/i.test(String(v ?? '').trim());
