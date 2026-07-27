import { useEffect, useState } from 'react';
import { analyticsApi } from '../../../api/analytics.js';
import { tareasApi } from '../../../api/tareas.js';
import { interaccionesApi } from '../../../api/interacciones.js';
import { vacantesApi } from '../../../api/vacantes.js';
import { useAsistenciaEnVivo } from '../../../hooks/useAsistenciaEnVivo.js';
import GLoader from '../../../components/ui/GLoader.jsx';

/* Reporte post-evento — consolida en una sola hoja (imprimible / PDF) lo que
   quedó repartido por el workspace: ventas, asistencia, gamificación,
   expositores, tareas y contrataciones. */

const money = (n, cur = 'COP') => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}${cur && cur !== 'COP' ? ' ' + cur : ''}`;

export default function ReporteTab({ evento }) {
  const [data, setData] = useState(null);
  const { ingresados } = useAsistenciaEnVivo(evento.id);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      analyticsApi.get(evento.id, 3650).catch(() => null),
      tareasApi.list(evento.id).catch(() => ({ tareas: [] })),
      interaccionesApi.rankingExpositores(evento.id).catch(() => ({ ranking: [] })),
      vacantesApi.listar(evento.id).catch(() => ({ vacantes: [] })),
    ]).then(([an, ta, rk, va]) => {
      if (!vivo) return;
      setData({ an, tareas: ta.tareas || [], ranking: rk.ranking || [], vacantes: va.vacantes || [] });
    });
    return () => { vivo = false; };
  }, [evento.id]);

  if (!data) return <GLoader message="Reuniendo el reporte…" />;

  const r = data.an?.resumen || {};
  const ventas = data.an?.ventas || [];
  const pctAforo = evento.aforo_total > 0 ? Math.round((evento.aforo_vendido || 0) / evento.aforo_total * 100) : null;
  const tareasHechas = data.tareas.filter(t => t.estado === 'hecho').length;
  const puntosExpo = data.ranking.reduce((a, e) => a + (e.puntos || 0), 0);
  const contratados = data.vacantes.reduce((a, v) => a + (v.postulaciones?.aceptado || 0), 0);
  const postulaciones = data.vacantes.reduce((a, v) => a + (v.postulaciones?.total || 0), 0);
  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  const KPIS = [
    { label: 'Boletas vendidas', v: (evento.aforo_vendido || 0).toLocaleString('es-CO') },
    { label: 'Aforo', v: pctAforo != null ? `${pctAforo}%` : '—', sub: evento.aforo_total ? `${evento.aforo_vendido || 0}/${evento.aforo_total}` : null },
    { label: 'Ingresos', v: money(r.ingresos, evento.currency) },
    { label: 'Asistieron (check-in)', v: (ingresados ?? 0).toLocaleString('es-CO') },
    { label: 'Puntos en stands', v: puntosExpo.toLocaleString('es-CO') },
    { label: 'Contrataciones', v: contratados, sub: `${postulaciones} postulaciones` },
  ];

  return (
    <div className="space-y-5">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #reporte-print, #reporte-print * { visibility: visible !important; }
        #reporte-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
        .no-print { display: none !important; }
      }`}</style>

      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Reporte del evento</h2>
          <p className="text-sm text-text-2 mt-1">Un resumen consolidado, listo para imprimir o guardar como PDF.</p>
        </div>
        <button onClick={() => window.print()} className="btn-primary btn-sm flex-shrink-0">Imprimir / Guardar PDF</button>
      </div>

      <div id="reporte-print" className="space-y-5">
        <div className="border-b border-border pb-3">
          <h1 className="text-xl font-bold font-display text-text-1">{evento.titulo}</h1>
          <p className="text-xs text-text-3">Reporte generado el {hoy}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {KPIS.map(k => (
            <div key={k.label} className="rounded-2xl border border-border bg-surface/40 px-4 py-3">
              <p className="text-2xl font-bold font-display text-text-1 tabular-nums leading-none">{k.v}</p>
              {k.sub && <p className="text-[11px] text-text-3 mt-0.5">{k.sub}</p>}
              <p className="text-[11px] text-text-3 mt-1 uppercase tracking-wide">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Ventas por tipo */}
        {ventas.length > 0 && (
          <Bloque titulo="Ventas por tipo de boleta">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {ventas.map((t, i) => (
                  <tr key={i}>
                    <td className="py-2 text-text-2">{t.nombre || t.tipo || 'Boleta'}</td>
                    <td className="py-2 text-right text-text-3 tabular-nums">{t.vendidos} vend.</td>
                    <td className="py-2 text-right text-text-1 font-semibold tabular-nums">{money(t.ingresos, evento.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Bloque>
        )}

        {/* Expositores top */}
        {data.ranking.length > 0 && (
          <Bloque titulo="Expositores más activos">
            <ul className="divide-y divide-border">
              {data.ranking.slice(0, 8).map((e, i) => (
                <li key={e.expositor_id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-6 text-text-3">{i + 1}.</span>
                  <span className="flex-1 text-text-1 truncate">{e.nombre}{e.stand ? ` · ${e.stand}` : ''}</span>
                  <span className="text-text-3 text-xs">{e.interacciones} interacc.</span>
                  <span className="text-text-1 font-semibold tabular-nums w-16 text-right">{e.puntos}</span>
                </li>
              ))}
            </ul>
          </Bloque>
        )}

        {/* Operación */}
        <Bloque titulo="Operación">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Dato k="Tareas completadas" v={`${tareasHechas} / ${data.tareas.length}`} />
            <Dato k="Vacantes publicadas" v={data.vacantes.length} />
          </div>
        </Bloque>

        <p className="text-[11px] text-text-3 pt-2">GESTEK · reporte de {evento.titulo}</p>
      </div>
    </div>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4">
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">{titulo}</p>
      {children}
    </div>
  );
}
function Dato({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-text-3">{k}</span>
      <span className="text-text-1 font-semibold tabular-nums">{v}</span>
    </div>
  );
}
