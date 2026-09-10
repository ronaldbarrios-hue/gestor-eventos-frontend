import { useState } from 'react';
import Spinner from '../ui/Spinner.jsx';
import { leerHoja, FORMATOS_ACEPTADOS } from '../../lib/hojaCalculo.js';
import { descargarPlantilla, leerPlantilla, HOJA_DATOS } from '../../lib/plantillaFormulario.js';

/* La importacion desde la hoja, para CUALQUIERA de los tres formularios.

   Vivia dentro de `FormularioTab`, o sea que existia solo para el formulario
   del evento. Las preguntas de un sub-evento y las de un torneo habia que
   escribirlas a mano, una a una, aunque son las que mas suelen serlo: describir
   una startup para una batalla de pitch pide veintiuna preguntas, y comprar una
   entrada pide cuatro. La pantalla que las importaba estaba a un clic, en la
   pestana de al lado, y no habia forma de llegar a ella desde aqui.

   No fallaba nada. Sencillamente la funcion existia para el formulario que
   menos la necesitaba, y quien buscaba importar las suyas concluia que la
   plataforma no lo hacia.

   Se saca tal cual: ya estaba escrita sin saber de quien era el formulario
   —recibe el catalogo, el cupo que queda y a quien entregarle lo leido—, que es
   justo lo que hacia falta para que sirva a los tres. */

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

export default function ImportarDefinicion({ catalogo, onAgregar, onCerrar, cupo, nombreEvento }) {
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


