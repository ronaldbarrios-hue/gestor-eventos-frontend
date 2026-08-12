import { useState, useEffect, useCallback } from 'react';
import { sesionesApi } from '../../../api/sesiones.js';
import { useToast } from '../../../context/ToastContext.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import Icono from '../../../components/ui/Icono.jsx';

/* Participación — la pregunta que antes no se podía responder.

   La boleta daba acceso al evento entero y no quedaba registro de a qué
   actividad entró cada quien. Así que se sabía cuánta gente compró entrada, y
   nada más: para reportar hacía falta saber cuántos pasaron por cada taller,
   charla o competencia, y eso no existía en ningún sitio.

   Aquí se ve de un tiro, y se puede marcar asistencia escaneando el código que
   la persona ya tiene en su boleta.

   Ojo con la diferencia entre las dos columnas: «inscritos» es quién se apuntó y
   «asistieron» es quién apareció. No son lo mismo y confundirlas es lo que hace
   que un reporte no cuadre. */

export default function ParticipacionTab({ evento, soyOwner }) {
  const { success, error: toastErr } = useToast();
  const [datos, setDatos] = useState(null);
  const [listo, setListo] = useState(true);
  const [abierta, setAbierta] = useState(null);   // session_id desplegado

  const cargar = useCallback(async () => {
    try {
      const d = await sesionesApi.participacion(evento.id);
      setDatos(d);
      setListo(d.almacenamiento_listo !== false);
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
      setDatos({ participacion: [], totales: null });
    }
  }, [evento.id, toastErr]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!datos) return <GLoader message="Contando participación..." />;

  if (!listo) return (
    <div className="rounded-2xl bg-warning/10 border border-warning/25 px-4 py-3">
      <p className="text-sm text-text-1 font-medium">Falta aplicar la migración 0055</p>
      <p className="text-xs text-text-2 mt-0.5">El registro por sub-evento necesita las tablas nuevas.</p>
    </div>
  );

  const t = datos.totales;
  const filas = datos.participacion || [];
  const conInscripcion = filas.filter(f => Number(f.inscritos) > 0 || f.cupo != null);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold font-display text-text-1 tracking-tight">Participación</h2>
        <p className="text-sm text-text-3 mt-1 leading-relaxed max-w-2xl">
          Cuánta gente entró al evento y cuánta pasó por cada actividad. Una boleta
          da acceso al evento; la inscripción es a una actividad concreta.
        </p>
      </div>

      {/* Los totales del evento */}
      {t && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Dato v={t.boletas_emitidas} l="boletas emitidas" />
          <Dato v={t.entraron_al_evento} l="entraron al evento" ayuda="Boletas marcadas como usadas en la puerta." />
          <Dato v={t.sub_eventos} l="sub-eventos" />
          <Dato v={t.inscripciones} l="inscripciones a actividades" />
        </div>
      )}

      {filas.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-12 text-center">
          <p className="text-sm text-text-2">Este evento todavía no tiene sub-eventos.</p>
          <p className="text-xs text-text-3 mt-1">Créalos en la pestaña de Agenda.</p>
        </div>
      ) : (
        <>
          {conInscripcion.length === 0 && (
            <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3">
              <p className="text-sm text-text-2">Ningún sub-evento pide inscripción todavía.</p>
              <p className="text-xs text-text-3 mt-0.5 leading-relaxed">
                Actívalo en Agenda, en el sub-evento que quieras contar aparte. Sin eso, la
                boleta da entrada a todo y no queda rastro de a qué actividad fue cada quien.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-3 border-b border-border bg-surface/60">
                  <th className="px-4 py-2.5 font-semibold">Actividad</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Inscritos</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Asistieron</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Sin boleta</th>
                  <th className="px-4 py-2.5 font-semibold">Cupo</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filas.map(f => {
                  const inscritos = Number(f.inscritos || 0);
                  const asistieron = Number(f.asistentes || 0);
                  const lleno = f.cupo != null && inscritos >= f.cupo;
                  return (
                    <RowSesion
                      key={f.session_id}
                      f={f}
                      inscritos={inscritos}
                      asistieron={asistieron}
                      lleno={lleno}
                      abierta={abierta === f.session_id}
                      onAbrir={() => setAbierta(a => a === f.session_id ? null : f.session_id)}
                      eventoId={evento.id}
                      soyOwner={soyOwner}
                      onCambio={cargar}
                      success={success}
                      toastErr={toastErr}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Dato({ v, l, ayuda }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3" title={ayuda || undefined}>
      <p className="text-2xl font-bold font-display text-text-1 tabular-nums leading-none">{v ?? 0}</p>
      <p className="text-[11px] text-text-3 mt-1 leading-snug">{l}</p>
    </div>
  );
}

function RowSesion({ f, inscritos, asistieron, lleno, abierta, onAbrir, eventoId, soyOwner, onCambio, success, toastErr }) {
  const cuando = f.inicio
    ? new Date(f.inicio).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <>
      <tr className="hover:bg-surface-2/30">
        <td className="px-4 py-2.5">
          <p className="text-text-1">{f.titulo}</p>
          <p className="text-[11px] text-text-3">{cuando}</p>
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums text-text-1">{inscritos}</td>
        <td className="px-4 py-2.5 text-right tabular-nums">
          <span className={asistieron > 0 ? 'text-success' : 'text-text-3'}>{asistieron}</span>
          {inscritos > 0 && (
            <span className="text-[11px] text-text-3 ml-1">
              ({Math.round((asistieron / inscritos) * 100)}%)
            </span>
          )}
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums text-text-3" title="Se inscribieron sin tener boleta del evento">
          {Number(f.sin_boleta || 0)}
        </td>
        <td className="px-4 py-2.5">
          {f.cupo == null
            ? <span className="text-text-3 text-xs">sin límite</span>
            : <span className={lleno ? 'text-danger text-xs' : 'text-text-2 text-xs'}>
                {inscritos}/{f.cupo}{lleno ? ' · lleno' : ''}
              </span>}
        </td>
        <td className="px-4 py-2.5 text-right">
          {inscritos > 0 && (
            <button onClick={onAbrir} className="btn-ghost btn-sm">
              {abierta ? 'Cerrar' : 'Ver quién'}
            </button>
          )}
        </td>
      </tr>

      {abierta && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-surface-2/20">
            <Inscritos
              eventoId={eventoId}
              sesionId={f.session_id}
              titulo={f.titulo}
              soyOwner={soyOwner}
              onCambio={onCambio}
              success={success}
              toastErr={toastErr}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function Inscritos({ eventoId, sesionId, titulo, soyOwner, onCambio, success, toastErr }) {
  const [lista, setLista] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [marcando, setMarcando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const d = await sesionesApi.inscripciones(eventoId, sesionId);
      setLista(d.inscripciones || []);
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
      setLista([]);
    }
  }, [eventoId, sesionId, toastErr]);

  useEffect(() => { cargar(); }, [cargar]);

  /* Marcar asistencia con el código de la boleta que la persona ya tiene: es lo
     que se puede escanear en la puerta del taller sin emitir nada nuevo. */
  const marcarPorCodigo = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    setMarcando(true);
    try {
      const r = await sesionesApi.marcarAsistencia(eventoId, sesionId, { codigo: codigo.trim() });
      success(r.ya_marcada
        ? 'Ya estaba marcada como asistente.'
        : `Asistencia registrada${r.inscripcion?.nombre ? `: ${r.inscripcion.nombre}` : ''}.`);
      setCodigo('');
      await cargar();
      onCambio?.();
    } catch (e2) {
      toastErr(e2.response?.data?.error || e2.message);
    } finally { setMarcando(false); }
  };

  const cambiar = async (insc, estado) => {
    try {
      await sesionesApi.cambiarEstado(eventoId, sesionId, insc.id, estado);
      await cargar();
      onCambio?.();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  /* CSV con las respuestas de la ficha: es lo que se pide para reportar, y sin
     esto había que sacarlo de la base a mano. */
  const exportar = () => {
    if (!lista?.length) return;
    const claves = [...new Set(lista.flatMap(i => Object.keys(i.respuestas || {})))];
    const enc = ['Nombre', 'Correo', 'Teléfono', 'Boleta', 'Estado', 'Inscrito', 'Asistió', ...claves];
    const fila = (i) => [
      i.nombre_mostrar, i.email_mostrar, i.telefono || '', i.codigo_boleta || 'sin boleta',
      i.estado,
      i.created_at ? new Date(i.created_at).toLocaleString('es-CO') : '',
      i.asistio_at ? new Date(i.asistio_at).toLocaleString('es-CO') : '',
      ...claves.map(k => {
        const v = (i.respuestas || {})[k];
        return Array.isArray(v) ? v.join(' | ') : (v ?? '');
      }),
    ];
    const csv = '﻿' + [enc, ...lista.map(fila)]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `participacion-${titulo.replace(/[^\w\s-]/g, '').trim().slice(0, 40) || 'sub-evento'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (lista === null) return <Spinner size="sm" />;

  return (
    <div className="space-y-3">
      {soyOwner && (
        <form onSubmit={marcarPorCodigo} className="flex items-end gap-2 flex-wrap">
          <div className="field flex-1 min-w-[200px] max-w-xs">
            <label className="label text-xs">Marcar asistencia con el código de la boleta</label>
            <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder="GTK-XXXXXX" className="input rounded-xl py-2 text-sm font-mono" />
          </div>
          <button type="submit" disabled={marcando || !codigo.trim()} className="btn-primary btn-sm">
            {marcando ? <Spinner size="sm" /> : 'Marcar'}
          </button>
          <button type="button" onClick={exportar} disabled={!lista.length} className="btn-secondary btn-sm ml-auto">
            Exportar CSV
          </button>
        </form>
      )}

      {lista.length === 0 ? (
        <p className="text-sm text-text-3">Nadie inscrito todavía.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {lista.map(i => (
            <li key={i.id} className="flex items-center gap-3 px-3 py-2 bg-surface/40">
              <Icono
                name={i.estado === 'asistio' ? 'check' : i.estado === 'cancelada' ? 'cerrar' : 'chincheta'}
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  i.estado === 'asistio' ? 'text-success'
                    : i.estado === 'cancelada' ? 'text-danger' : 'text-text-3'}`}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${i.estado === 'cancelada' ? 'text-text-3 line-through' : 'text-text-1'}`}>
                  {i.nombre_mostrar}
                </p>
                <p className="text-[11px] text-text-3 truncate">
                  {i.email_mostrar}
                  {i.codigo_boleta
                    ? <span className="font-mono"> · {i.codigo_boleta}</span>
                    : <span className="text-warning"> · sin boleta del evento</span>}
                </p>
              </div>
              {soyOwner && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {i.estado !== 'asistio' && (
                    <button onClick={() => cambiar(i, 'asistio')} className="btn-ghost btn-sm">Asistió</button>
                  )}
                  {i.estado !== 'cancelada'
                    ? <button onClick={() => cambiar(i, 'cancelada')} className="btn-ghost btn-sm text-danger/80 hover:text-danger">Cancelar</button>
                    : <button onClick={() => cambiar(i, 'inscrito')} className="btn-ghost btn-sm">Reactivar</button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
