import { useState, useEffect, useMemo } from 'react';
import { clientesApi } from '../../../../api/clientes.js';
import { ticketsApi } from '../../../../api/tickets.js';

/* Comercial · Facturación — historial real de ventas + exportación CSV. */
export default function FacturacionSection({ evento }) {
  const [clientes, setClientes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([clientesApi.list(evento.id, { limit: 1000 }), ticketsApi.list(evento.id)])
      .then(([c, t]) => {
        if (c.status === 'fulfilled') setClientes(c.value.clientes || c.value.tickets || []);
        if (t.status === 'fulfilled') setTipos(t.value.tickets || t.value.tipos || []);
      })
      .finally(() => setLoading(false));
  }, [evento.id]);

  const filas = useMemo(() => (Array.isArray(clientes) ? clientes : []).map(c => {
    const lista = Array.isArray(tipos) ? tipos : [];
    const tipo = lista.find(t => t.id === c.ticket_id || t.id === c.tipo_id || t.nombre === c.tipo);
    return {
      nombre : c.nombre || c.cliente_nombre || '—',
      email  : c.email || c.cliente_email || '—',
      tipo   : c.tipo || c.ticket_nombre || tipo?.nombre || 'General',
      estado : c.estado || 'confirmada',
      precio : Number(c.precio ?? tipo?.precio ?? 0),
      fecha  : c.created_at || c.fecha || null,
      codigo : c.codigo || c.qr || '',
    };
  }), [clientes, tipos]);

  const total = filas.reduce((s, f) => s + (f.estado !== 'cancelada' ? f.precio : 0), 0);

  const exportarCSV = () => {
    const enc = ['Nombre', 'Email', 'Tipo de boleta', 'Estado', 'Valor', 'Fecha', 'Código'];
    const cuerpo = filas.map(f => [f.nombre, f.email, f.tipo, f.estado, f.precio, f.fecha ? new Date(f.fecha).toLocaleString('es-CO') : '', f.codigo]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    const csv = '﻿' + [enc.join(';'), ...cuerpo].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `facturacion-${evento.slug || evento.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return <p className="text-sm text-text-3 py-8">Cargando historial…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-6">
          <Kpi label="Boletas emitidas" v={filas.length} />
          <Kpi label="Ingresos registrados" v={`$${total.toLocaleString('es-CO')}`} />
        </div>
        <button onClick={exportarCSV} disabled={filas.length === 0} className="btn-secondary btn-sm">
          Exportar CSV (contabilidad)
        </button>
      </div>

      {filas.length === 0 ? (
        <div className="card p-10 text-center"><p className="text-sm text-text-2">Aún no hay ventas ni inscripciones registradas.</p></div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-3 border-b border-border bg-surface/60">
                <th className="px-4 py-2.5 font-semibold">Asistente</th>
                <th className="px-4 py-2.5 font-semibold">Boleta</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
                <th className="px-4 py-2.5 font-semibold text-right">Valor</th>
                <th className="px-4 py-2.5 font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((f, i) => (
                <tr key={i} className="hover:bg-surface-2/40">
                  <td className="px-4 py-2.5">
                    <p className="text-text-1">{f.nombre}</p>
                    <p className="text-xs text-text-3">{f.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-text-2">{f.tipo}</td>
                  <td className="px-4 py-2.5"><span className="capitalize text-text-2">{f.estado}</span></td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-1">${f.precio.toLocaleString('es-CO')}</td>
                  <td className="px-4 py-2.5 text-text-3 text-xs">{f.fecha ? new Date(f.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
function Kpi({ label, v }) {
  return (
    <div>
      <p className="text-xl font-bold font-display text-text-1 tabular-nums">{v}</p>
      <p className="text-[11px] text-text-3">{label}</p>
    </div>
  );
}
