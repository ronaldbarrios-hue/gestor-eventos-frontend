import { useEffect, useMemo, useState } from 'react';
import { clientesApi } from '../../../../api/clientes.js';
import { eventosApi } from '../../../../api/eventos.js';
import { ticketsApi } from '../../../../api/tickets.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';
import { fallaCampo } from '../../../../components/ui/CampoFormulario.jsx';
import {
  leerHoja, columnaAOpciones, emparejarColumna, clave, FORMATOS_ACEPTADOS,
} from '../../../../lib/hojaCalculo.js';

/* Carga de inscritos en masa desde Excel.

   Lo que había antes: un CSV con tres columnas fijas (nombre, email, telefono),
   sin mapeo, tope de 1.000 filas y el correo OBLIGATORIO. Para una lista de
   7.000 que llega en el formato de la entidad —con sus columnas, en su orden—
   no servía; y exigir correo dejaba fuera justo el caso que ahora importa: la
   gente a la que hay que entregarle la boleta impresa porque el correo no está
   saliendo.

   Ahora: Excel o CSV, se detectan las columnas, se mapean a mano si hace falta
   —incluidas las preguntas del formulario del evento— y se valida cada fila con
   la misma regla que el servidor antes de mandar nada. */

const SIN_MAPEAR = '';

/* Sinónimos para adivinar el mapeo. Van del más específico al más general por
   la misma razón que en el editor: «correo del acudiente» no debe ganarle a
   «correo». */
const SINONIMOS = {
  nombre: ['nombre completo', 'nombres y apellidos', 'nombre y apellido', 'nombre', 'nombres', 'asistente', 'participante'],
  email : ['correo electronico', 'correo', 'email', 'e mail', 'mail'],
};

const LOTE = 400;

export default function ImportarAsistentes({ evento, onClose, onDone }) {
  const eventoId = evento.id;
  const { success, error: toastErr } = useToast();

  const [tipos, setTipos]   = useState([]);
  const [tipoId, setTipoId] = useState('');
  const [marcarPagado, setMarcarPagado] = useState(false);
  const [campos, setCampos] = useState([]);

  const [hoja, setHoja]   = useState(null);
  const [mapa, setMapa]   = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 });
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    Promise.all([
      ticketsApi.list(eventoId).catch(() => ({ tickets: [] })),
      eventosApi.getFormulario(eventoId).catch(() => ({ campos: [] })),
    ]).then(([tt, form]) => {
      const list = tt.tickets || tt.ticket_types || [];
      setTipos(list);
      if (list.length === 1) setTipoId(list[0].id);
      setCampos(form.campos || []);
    }).catch(e => toastErr(e.message));
    /* eslint-disable-next-line */
  }, [eventoId]);

  /* ¿Hay una pregunta de tipo teléfono? De eso depende poder repartir por
     WhatsApp después, así que si no la hay conviene decirlo aquí y no al final. */
  const campoTelefono = campos.find(c => c.tipo === 'telefono');

  const tomarArchivo = async (file) => {
    if (!file) return;
    setError(''); setCargando(true); setResultado(null);
    try {
      const h = await leerHoja(file);
      setHoja(h);
      const auto = {
        nombre: emparejarColumna(h.columnas, SINONIMOS.nombre),
        email : emparejarColumna(h.columnas, SINONIMOS.email),
      };
      /* Cada pregunta del formulario se busca por su propio enunciado. */
      for (const c of campos) {
        auto[`campo:${c.id}`] = emparejarColumna(h.columnas, [c.etiqueta]);
      }
      setMapa(auto);
    } catch (e) { setError(e.message); setHoja(null); }
    finally { setCargando(false); }
  };

  /* Convierte una celda al valor que espera cada tipo de pregunta. */
  const valorDeCelda = (campo, celda) => {
    const bruto = (celda ?? '').toString().trim();
    if (!bruto) return campo.tipo === 'multiple' ? [] : '';
    if (campo.tipo === 'multiple') {
      /* En un Excel las respuestas múltiples vienen en una sola celda separadas
         por coma o por salto de línea. Se cruzan contra las opciones reales
         para no guardar texto que la validación va a rechazar. */
      const partes = columnaAOpciones(bruto);
      const ops = campo.opciones || [];
      return ops.length ? ops.filter(o => partes.some(p => clave(p) === clave(o))) : partes;
    }
    if (campo.tipo === 'checkbox') {
      return ['si', 'sí', 'x', 'true', '1', 'verdadero'].includes(clave(bruto));
    }
    if (campo.tipo === 'seleccion') {
      const ops = campo.opciones || [];
      const igual = ops.find(o => clave(o) === clave(bruto));
      return igual || bruto;   // si no cuadra, se deja y la validación lo señala
    }
    return bruto;
  };

  const preparadas = useMemo(() => {
    if (!hoja || !mapa.nombre) return [];
    return hoja.filas.map(f => {
      const nombre = (f[mapa.nombre] || '').trim();
      const email  = mapa.email ? (f[mapa.email] || '').trim() : '';

      const respuestas = {};
      for (const c of campos) {
        const col = mapa[`campo:${c.id}`];
        if (!col) continue;
        respuestas[c.id] = valorDeCelda(c, f[col]);
      }

      /* Mismo motor que el formulario público. */
      let fallo = null;
      if (!nombre) fallo = 'Sin nombre.';
      else if (email && !email.includes('@')) fallo = 'Correo inválido.';
      else {
        for (const c of campos) {
          if (!(c.id in respuestas)) continue;
          const f2 = fallaCampo(c, respuestas[c.id]);
          if (f2) { fallo = f2; break; }
        }
      }

      return { __fila: f.__fila, nombre, email, respuestas, fallo };
    });
  }, [hoja, mapa, campos]);

  const validas = preparadas.filter(p => !p.fallo);
  const malas   = preparadas.filter(p => p.fallo);
  const sinCorreo = validas.filter(p => !p.email).length;

  /* Correos repetidos DENTRO del archivo: el servidor sólo ve los que ya
     existían en la base, no los que el propio Excel trae dos veces. */
  const repetidosEnArchivo = useMemo(() => {
    const vistos = new Set(); const rep = new Set();
    for (const p of validas) {
      if (!p.email) continue;
      const k = p.email.toLowerCase();
      if (vistos.has(k)) rep.add(k); else vistos.add(k);
    }
    return rep;
  }, [validas]);

  const importar = async () => {
    if (!tipoId) { toastErr('Elige el tipo de boleta.'); return; }
    if (validas.length === 0) { toastErr('No hay filas válidas para importar.'); return; }

    setEnviando(true);
    setProgreso({ hechas: 0, total: validas.length });
    const acumulado = { creados: 0, errores: [], sin_correo: 0 };

    try {
      /* Por lotes: 7.000 filas en una sola petición es un cuerpo enorme y un
         timeout casi seguro. Además así el progreso avanza a la vista. */
      for (let i = 0; i < validas.length; i += LOTE) {
        const trozo = validas.slice(i, i + LOTE).map(p => ({
          __fila: p.__fila, nombre: p.nombre, email: p.email || null,
          respuestas: Object.keys(p.respuestas).length ? p.respuestas : undefined,
        }));
        const r = await clientesApi.importar(eventoId, {
          ticket_type_id: tipoId,
          marcar_pagado : marcarPagado,
          rows          : trozo,
        });
        acumulado.creados += r.creados || 0;
        acumulado.sin_correo += r.sin_correo || 0;
        acumulado.errores.push(...(r.errores || []));
        setProgreso({ hechas: Math.min(i + LOTE, validas.length), total: validas.length });
      }

      /* Las que ni se intentaron, para que el informe cuadre con el archivo. */
      acumulado.errores.push(...malas.map(m => ({ fila: m.__fila, motivo: m.fallo })));
      setResultado(acumulado);
      if (acumulado.creados > 0) {
        success(`${acumulado.creados} boletas creadas.`);
        onDone?.({ creados: acumulado.creados });
      }
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally { setEnviando(false); }
  };

  const descargarErrores = () => {
    const filas = (resultado?.errores || []).map(e => [e.fila, (e.motivo || '').replace(/"/g, "'")]);
    const csv = '﻿' + 'fila,motivo\n' + filas.map(f => `${f[0]},"${f[1]}"`).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `errores-import-${evento.slug || 'evento'}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md" onClick={onClose}>
      <div className="relative w-full max-w-3xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 z-10 bg-surface px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-1">Cargar asistentes desde Excel</h3>
            <p className="text-xs text-text-3 mt-0.5">Excel (.xlsx) o CSV. Se lee la primera hoja.</p>
          </div>
          <button onClick={onClose} className="text-text-3 hover:text-text-1 text-xl leading-none px-2">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Resultado */}
          {resultado && (
            <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-2">
              <p className="text-sm text-text-1 font-semibold">
                {resultado.creados} boletas creadas
                {resultado.errores.length > 0 && <span className="text-danger-light"> · {resultado.errores.length} sin crear</span>}
              </p>
              {resultado.sin_correo > 0 && (
                <p className="text-xs text-warning-light">
                  {resultado.sin_correo} quedaron <strong>sin correo</strong>. No se les puede escribir:
                  hay que entregarles la boleta impresa o por WhatsApp desde «Reparto sin correo».
                </p>
              )}
              {resultado.errores.length > 0 && (
                <button onClick={descargarErrores} className="text-xs text-primary-light hover:underline">
                  Descargar el detalle de los errores (CSV)
                </button>
              )}
            </div>
          )}

          {/* 1 · destino */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="field">
              <label className="label text-xs">Tipo de boleta *</label>
              <select value={tipoId} onChange={e => setTipoId(e.target.value)}
                className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                <option value="">Elige…</option>
                {tipos.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.precio ? `· $${Number(t.precio).toLocaleString('es-CO')}` : '· Gratis'}
                  </option>
                ))}
              </select>
              {tipos.length === 0 && <p className="text-xs text-warning mt-1">Primero crea tipos de boleta.</p>}
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer pt-6">
              <input type="checkbox" checked={marcarPagado} onChange={e => setMarcarPagado(e.target.checked)}
                className="w-4 h-4 rounded mt-0.5 accent-primary" />
              <div>
                <p className="text-sm text-text-1 font-medium">Marcar como pagadas</p>
                <p className="text-xs text-text-3">Si no, quedan como emitidas.</p>
              </div>
            </label>
          </div>

          {/* 2 · archivo */}
          <div className="field">
            <label className="label text-xs">Archivo</label>
            <input type="file" accept={FORMATOS_ACEPTADOS} onChange={e => tomarArchivo(e.target.files?.[0])}
              className="block w-full text-sm text-text-2 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0
                         file:text-sm file:font-medium file:bg-primary/10 file:text-primary-light
                         hover:file:bg-primary/20 file:cursor-pointer" />
          </div>

          {cargando && <p className="text-sm text-text-3 flex items-center gap-2"><Spinner size="sm" /> Leyendo…</p>}
          {error && <p className="text-sm text-danger-light bg-danger/10 rounded-xl px-3 py-2">{error}</p>}

          {hoja && (
            <>
              <p className="text-xs text-text-3">
                Hoja «{hoja.hoja}» · {hoja.filas.length} filas · {hoja.columnas.length} columnas
                {hoja.recortado > 0 && <span className="text-warning-light"> · sólo se leyeron las primeras {hoja.recortado}</span>}
              </p>

              {/* 3 · mapeo */}
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">Qué columna es cada cosa</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Selector etiqueta="Nombre *" valor={mapa.nombre} columnas={hoja.columnas}
                    onChange={v => setMapa(m => ({ ...m, nombre: v }))} />
                  <Selector etiqueta="Correo (opcional)" valor={mapa.email} columnas={hoja.columnas}
                    onChange={v => setMapa(m => ({ ...m, email: v }))} />
                </div>

                {campos.length > 0 && (
                  <>
                    <p className="text-xs uppercase tracking-widest text-text-3 font-semibold pt-1">
                      Preguntas del formulario
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {campos.map(c => (
                        <Selector key={c.id} etiqueta={`${c.etiqueta}${c.requerido ? ' *' : ''}`}
                          valor={mapa[`campo:${c.id}`]} columnas={hoja.columnas}
                          onChange={v => setMapa(m => ({ ...m, [`campo:${c.id}`]: v }))} />
                      ))}
                    </div>
                  </>
                )}

                {!campoTelefono && (
                  <p className="text-xs text-warning-light bg-warning/10 rounded-xl px-3 py-2">
                    Este formulario no tiene ninguna pregunta de tipo <strong>Teléfono</strong>. Sin teléfono no se
                    puede repartir por WhatsApp si el correo falla. Si vas a necesitarlo, agrégala en
                    Formulario antes de importar.
                  </p>
                )}
              </div>

              {/* 4 · vista previa */}
              {!mapa.nombre ? (
                <p className="text-sm text-warning-light">Elige al menos qué columna trae el nombre.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">Vista previa</p>
                    <span className="text-xs text-text-2">{validas.length} listas</span>
                    {malas.length > 0 && <span className="text-xs text-danger-light">{malas.length} con problema</span>}
                    {sinCorreo > 0 && <span className="text-xs text-warning-light">{sinCorreo} sin correo</span>}
                    {repetidosEnArchivo.size > 0 && (
                      <span className="text-xs text-warning-light">{repetidosEnArchivo.size} correos repetidos en el archivo</span>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {preparadas.slice(0, 50).map((p, i) => (
                      <div key={i} className="px-3 py-2 text-xs flex items-baseline gap-2">
                        <span className="text-text-3 tabular-nums w-9 shrink-0">f{p.__fila}</span>
                        <span className="text-text-1 flex-1 truncate">{p.nombre || <em className="text-text-3">sin nombre</em>}</span>
                        <span className="text-text-2 flex-1 truncate">{p.email || <em className="text-text-3">sin correo</em>}</span>
                        {p.fallo && <span className="text-danger-light shrink-0 max-w-[45%] truncate" title={p.fallo}>{p.fallo}</span>}
                      </div>
                    ))}
                    {preparadas.length > 50 && (
                      <div className="px-3 py-2 text-xs text-text-3 text-center">+{preparadas.length - 50} más</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {enviando && (
            <div className="space-y-1.5">
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-primary transition-all"
                  style={{ width: `${Math.round((progreso.hechas / Math.max(1, progreso.total)) * 100)}%` }} />
              </div>
              <p className="text-xs text-text-3 tabular-nums">{progreso.hechas} de {progreso.total}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-surface px-5 py-4 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-full text-sm text-text-2 hover:text-text-1">Cerrar</button>
          <button onClick={importar} disabled={enviando || !tipoId || validas.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-text-1 text-bg hover:bg-white
                       text-sm font-semibold disabled:opacity-40 transition-all">
            {enviando ? <><Spinner size="sm" /> Importando…</> : `Importar ${validas.length || ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Selector({ etiqueta, valor, columnas, onChange }) {
  return (
    <div className="field">
      <label className="label text-xs">{etiqueta}</label>
      <select value={valor || SIN_MAPEAR} onChange={e => onChange(e.target.value)}
        className="input bg-surface-2 rounded-xl py-2 text-xs">
        <option value={SIN_MAPEAR}>— ninguna —</option>
        {columnas.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}
