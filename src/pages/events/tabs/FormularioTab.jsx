import { useEffect, useMemo, useRef, useState } from 'react';
import { eventosApi } from '../../../api/eventos.js';
import { ticketsApi } from '../../../api/tickets.js';
import { useToast } from '../../../context/ToastContext.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import {
  leerHoja, columnaAOpciones, emparejarColumna, esAfirmativo, clave, FORMATOS_ACEPTADOS,
} from '../../../lib/hojaCalculo.js';

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

function nuevoCampo(preset = {}) {
  return {
    _key: preset.id || `n${Math.random().toString(36).slice(2)}`,
    id: preset.id || null,
    tipo: preset.tipo || 'texto',
    etiqueta: preset.etiqueta || '',
    opciones: preset.opciones || [],
    requerido: preset.requerido ?? true,
    grupo: preset.grupo || '',
    ayuda: preset.ayuda || '',
    ticket_type_id: preset.ticket_type_id || '',   // '' = todas las boletas
  };
}

/* ── Importar la batería desde una hoja ──────────────────────────────── */

const COLUMNAS_DEF = {
  etiqueta : ['pregunta', 'enunciado', 'etiqueta', 'campo', 'nombre del campo', 'nombre'],
  tipo     : ['tipo', 'tipo de respuesta', 'tipo de campo', 'formato'],
  opciones : ['opciones', 'opcion', 'valores', 'lista', 'respuestas posibles'],
  grupo    : ['grupo', 'seccion', 'categoria', 'bloque', 'modulo'],
  requerido: ['obligatorio', 'requerido', 'obligatoria', 'obligatorio si no'],
  ayuda    : ['ayuda', 'descripcion', 'nota', 'aclaracion', 'instruccion'],
};

/* Sinónimos de tipo. Se resuelven contra el catálogo del servidor, así que si
   mañana aparece un tipo nuevo basta añadirlo allí y aquí sólo se le suman
   sinónimos si hacen falta.

   Cuidado con «opción múltiple»: en castellano corriente significa elegir UNA
   de varias, no varias a la vez. Mapearlo a `multiple` convertiría media
   batería en casillas por un giro del idioma. */
const SINONIMOS_TIPO = {
  texto    : ['texto', 'texto corto', 'abierta', 'abierto', 'libre', 'string', 'caracter'],
  parrafo  : ['parrafo', 'texto largo', 'textarea', 'abierta larga', 'comentario'],
  numero   : ['numero', 'entero', 'cantidad', 'numerico', 'edad'],
  fecha    : ['fecha', 'date', 'dia'],
  email    : ['email', 'correo', 'correo electronico', 'mail'],
  telefono : ['telefono', 'celular', 'movil', 'contacto telefonico'],
  documento: ['documento', 'cedula', 'identificacion', 'nit', 'numero de documento', 'dni'],
  seleccion: ['seleccion', 'select', 'lista', 'lista desplegable', 'unica', 'una opcion',
              'opcion multiple', 'seleccion unica', 'desplegable'],
  multiple : ['multiple', 'seleccion multiple', 'varias', 'varias opciones', 'casillas',
              'multiseleccion', 'multi'],
  checkbox : ['checkbox', 'casilla', 'si no', 'si o no', 'booleano', 'boolean', 'verdadero falso'],
  foto     : ['foto', 'imagen', 'archivo', 'adjunto', 'fotografia'],
};

/* Devuelve el id de tipo del catálogo, o null si no se reconoce. */
function resolverTipo(valor, tiposCatalogo) {
  const k = clave(valor);
  if (!k) return null;
  const idsValidos = new Set(tiposCatalogo.map(t => t.id));

  if (idsValidos.has(k)) return k;
  const porEtiqueta = tiposCatalogo.find(t => clave(t.label) === k);
  if (porEtiqueta) return porEtiqueta.id;

  /* Los sinónimos se prueban del más largo al más corto: «seleccion multiple»
     tiene que ganarle a «seleccion», que también encaja por contenido. */
  const pares = [];
  for (const [id, lista] of Object.entries(SINONIMOS_TIPO)) {
    if (!idsValidos.has(id)) continue;
    for (const s of lista) pares.push([clave(s), id]);
  }
  pares.sort((a, b) => b[0].length - a[0].length);

  for (const [s, id] of pares) if (k === s) return id;
  for (const [s, id] of pares) if (k.includes(s)) return id;
  return null;
}

function ImportarDefinicion({ catalogo, onAgregar, onCerrar, cupo }) {
  const [hoja, setHoja]   = useState(null);
  const [mapa, setMapa]   = useState({});
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const tomarArchivo = async (file) => {
    if (!file) return;
    setError(''); setCargando(true);
    try {
      const h = await leerHoja(file);
      setHoja(h);
      const auto = {};
      for (const [campo, sinonimos] of Object.entries(COLUMNAS_DEF)) {
        auto[campo] = emparejarColumna(h.columnas, sinonimos);
      }
      /* Sin columna de enunciado no hay nada que importar; si la hoja trae una
         sola columna, es ella. */
      if (!auto.etiqueta && h.columnas.length === 1) auto.etiqueta = h.columnas[0];
      setMapa(auto);
    } catch (e) { setError(e.message); setHoja(null); }
    finally { setCargando(false); }
  };

  /* Se calcula en vivo para que la vista previa reaccione al mapeo. */
  const preparadas = useMemo(() => {
    if (!hoja || !mapa.etiqueta) return [];
    return hoja.filas.map(f => {
      const etiqueta = (f[mapa.etiqueta] || '').trim();
      if (!etiqueta) return null;

      const crudoTipo = mapa.tipo ? f[mapa.tipo] : '';
      const opciones  = mapa.opciones ? columnaAOpciones(f[mapa.opciones]) : [];
      let tipo = resolverTipo(crudoTipo, catalogo.tipos);
      let adivinado = false;
      if (!tipo) { tipo = opciones.length ? 'seleccion' : 'texto'; adivinado = Boolean(crudoTipo) || opciones.length > 0; }

      return {
        etiqueta,
        tipo,
        adivinado,
        opciones: catalogo.conOpciones.has(tipo) ? opciones : [],
        grupo    : mapa.grupo ? (f[mapa.grupo] || '').slice(0, 80) : '',
        ayuda    : mapa.ayuda ? (f[mapa.ayuda] || '').slice(0, 300) : '',
        requerido: mapa.requerido ? esAfirmativo(f[mapa.requerido]) : false,
        fila: f.__fila,
      };
    }).filter(Boolean);
  }, [hoja, mapa, catalogo]);

  const sinOpciones = preparadas.filter(p => catalogo.conOpciones.has(p.tipo) && p.opciones.length === 0);
  const adivinadas  = preparadas.filter(p => p.adivinado);
  const caben = Math.min(preparadas.length, cupo);

  return (
    <div className="rounded-2xl border border-primary/40 bg-surface/60 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-1">Cargar preguntas desde una hoja</p>
          <p className="text-xs text-text-3 mt-0.5">
            Excel (.xlsx) o CSV. Una fila por pregunta. Se lee la primera hoja del archivo.
          </p>
        </div>
        <button onClick={onCerrar} className="text-text-3 hover:text-text-1 text-sm px-2">Cerrar</button>
      </div>

      <input type="file" accept={FORMATOS_ACEPTADOS}
        onChange={e => tomarArchivo(e.target.files?.[0])}
        className="block w-full text-xs text-text-2 file:mr-3 file:py-2 file:px-4 file:rounded-full
                   file:border file:border-border-2 file:bg-surface-2 file:text-text-2 file:text-xs
                   file:cursor-pointer hover:file:text-text-1" />

      {cargando && <p className="text-xs text-text-3 flex items-center gap-2"><Spinner size="sm" /> Leyendo…</p>}
      {error && <p className="text-xs text-danger-light bg-danger/10 rounded-xl px-3 py-2">{error}</p>}

      {hoja && (
        <>
          <p className="text-xs text-text-3">
            Hoja «{hoja.hoja}» · {hoja.filas.length} filas · {hoja.columnas.length} columnas
            {hoja.recortado > 0 && <span className="text-warning-light"> · se leyeron sólo las primeras {hoja.recortado}</span>}
          </p>

          <div className="grid sm:grid-cols-2 gap-2">
            {Object.keys(COLUMNAS_DEF).map(campo => (
              <div className="field" key={campo}>
                <label className="label text-xs capitalize">
                  {campo === 'etiqueta' ? 'Enunciado de la pregunta *' : campo}
                </label>
                <select value={mapa[campo] || ''} onChange={e => setMapa(m => ({ ...m, [campo]: e.target.value }))}
                  className="input bg-surface-2 rounded-xl py-2 text-xs">
                  <option value="">— ninguna —</option>
                  {hoja.columnas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>

          {!mapa.etiqueta && (
            <p className="text-xs text-warning-light">Elige qué columna trae el enunciado de la pregunta.</p>
          )}

          {preparadas.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">
                Vista previa · {preparadas.length} preguntas
              </p>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {preparadas.slice(0, 40).map((p, i) => (
                  <div key={i} className="px-3 py-2 text-xs flex items-baseline gap-2">
                    <span className="text-text-3 tabular-nums w-8 shrink-0">f{p.fila}</span>
                    <span className="text-text-1 flex-1 truncate">{p.etiqueta}</span>
                    <span className={`shrink-0 ${p.adivinado ? 'text-warning-light' : 'text-text-3'}`}>
                      {catalogo.tipos.find(t => t.id === p.tipo)?.label || p.tipo}
                      {p.opciones.length > 0 && ` (${p.opciones.length})`}
                    </span>
                    {p.requerido && <span className="text-primary-light shrink-0">obligatoria</span>}
                  </div>
                ))}
              </div>

              {adivinadas.length > 0 && (
                <p className="text-xs text-warning-light">
                  {adivinadas.length} {adivinadas.length === 1 ? 'pregunta no traía' : 'preguntas no traían'} un tipo
                  reconocible; {adivinadas.length === 1 ? 'quedó' : 'quedaron'} como texto o selección. Revísalas después de agregarlas.
                </p>
              )}
              {sinOpciones.length > 0 && (
                <p className="text-xs text-danger-light">
                  {sinOpciones.length} de selección se quedaron sin opciones. El servidor no deja guardar
                  una selección vacía: ponles opciones o cámbialas a texto.
                </p>
              )}
              {preparadas.length > cupo && (
                <p className="text-xs text-danger-light">
                  Sólo caben {cupo} más (el tope del formulario). Se agregarán las primeras {cupo}.
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => { onAgregar(preparadas.slice(0, cupo)); onCerrar(); }}
            disabled={caben === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-text-1 text-bg
                       hover:bg-white text-sm font-semibold disabled:opacity-40 transition-all">
            Agregar {caben} {caben === 1 ? 'pregunta' : 'preguntas'}
          </button>
        </>
      )}
    </div>
  );
}

/* ── Editor ──────────────────────────────────────────────────────────── */

export default function FormularioTab({ evento }) {
  const [campos, setCampos] = useState([]);
  const [tiposBoleta, setTiposBoleta] = useState([]);
  const [catalogo, setCatalogo] = useState({
    tipos: [], grupos: [], fichas: [], conOpciones: new Set(), max: 60, agrupacion: false,
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
        });
        setCampos((d.campos || []).map(c => nuevoCampo({ ...c, opciones: c.opciones || [] })));
        setTiposBoleta(tt.tickets || tt.ticket_types || []);
      })
      .catch(e => toastErr(e.message))
      .finally(() => setLoading(false));
    /* eslint-disable-next-line */
  }, [evento.id]);

  const cupo = Math.max(0, catalogo.max - campos.length);

  const agregar = (preset) => {
    if (cupo === 0) { toastErr(`El formulario ya tiene el máximo de ${catalogo.max} preguntas.`); return; }
    setCampos(list => [...list, nuevoCampo(preset)]);
    setTimeout(() => finLista.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60);
  };
  const agregarVarios = (presets) => {
    if (!presets.length) return;
    setCampos(list => [...list, ...presets.map(nuevoCampo)]);
    success(`${presets.length} ${presets.length === 1 ? 'pregunta agregada' : 'preguntas agregadas'}. Revisa y guarda.`);
  };

  /* Una ficha se agrega entera pero sin repetir lo que ya está: agregar dos
     veces la de caracterización dejaría 44 preguntas duplicadas. */
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

  const quitar = (key) => setCampos(list => list.filter(c => c._key !== key));
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
          {catalogo.fichas.map(f => (
            <button key={f.id} onClick={() => agregarFicha(f)} title={f.descripcion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-2
                         text-xs text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
              <span className="text-primary-light">+</span> {f.nombre}
              <span className="text-text-3">· {f.campos.length}</span>
            </button>
          ))}
          <button onClick={() => setImportando(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-2
                       text-xs text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
            <span className="text-primary-light">↑</span> Desde Excel o CSV
          </button>
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
          cupo={cupo}
          onAgregar={agregarVarios}
          onCerrar={() => setImportando(false)}
        />
      )}

      <div className="space-y-3">
        {campos.length === 0 && (
          <div className="rounded-3xl border border-border bg-surface/40 px-6 py-12 text-center">
            <p className="text-sm text-text-3">Aún no agregas preguntas.</p>
          </div>
        )}

        {campos.map((c, i) => {
          const grupoAnterior = i > 0 ? campos[i - 1].grupo : null;
          const abreGrupo = catalogo.agrupacion && c.grupo && c.grupo !== grupoAnterior;
          return (
            <div key={c._key}>
              {abreGrupo && (
                <p className="text-[11px] uppercase tracking-widest text-primary-light font-semibold mb-1.5 mt-4 px-1">
                  {c.grupo}
                </p>
              )}
              <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
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
              </div>
            </div>
          );
        })}
        <div ref={finLista} />
      </div>

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
