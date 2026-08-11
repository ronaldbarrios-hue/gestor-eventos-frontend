import { useState, useEffect, useMemo } from 'react';
import { clientesApi } from '../../../../api/clientes.js';

/* Comercial · Facturación — historial real de ventas + exportación CSV.

   El endpoint /eventos/:id/clientes devuelve filas de `tickets` con dos joins:
   `usuario` (profiles) y `tipo` (ticket_types, el objeto completo con nombre,
   precio y currency). No hay campos planos `nombre`, `email`, `precio` ni un
   `tipo` de texto — de ahí venía el React #31: se pintaba el objeto `tipo`
   como hijo. Los estados son los de la tabla: emitido, pagado, usado,
   reembolsado, invalido. */

const LIMITE = 1000;

/* Estados que no cuentan como ingreso. */
const NO_FACTURA = new Set(['reembolsado', 'invalido']);

const ESTADO_LABEL = {
  emitido    : 'Emitida',
  pagado     : 'Pagada',
  usado      : 'Usada',
  reembolsado: 'Reembolsada',
  invalido   : 'Anulada',
};

const dinero = (v, currency) => {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: currency || 'COP', maximumFractionDigits: 0,
    }).format(v || 0);
  } catch {
    return `$${Number(v || 0).toLocaleString('es-CO')}`;
  }
};

export default function FacturacionSection({ evento }) {
  const [clientes, setClientes] = useState([]);
  const [totalReal, setTotalReal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    setError('');
    clientesApi.list(evento.id, { limit: LIMITE })
      .then(r => {
        if (!vivo) return;
        setClientes(Array.isArray(r?.clientes) ? r.clientes : []);
        setTotalReal(Number(r?.total) || 0);
      })
      .catch(e => { if (vivo) setError(e?.response?.data?.error || 'No se pudo cargar el historial.'); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [evento.id]);

  const filas = useMemo(() => clientes.map(c => ({
    id      : c.id,
    nombre  : c.usuario?.nombre || c.guest_nombre || '—',
    email   : c.usuario?.email  || c.guest_email  || '—',
    /* `tipo` es el objeto del join: aquí nos quedamos solo con su nombre. */
    tipo    : c.tipo?.nombre || 'General',
    estado  : c.estado || 'emitido',
    /* precio_pagado es lo realmente cobrado; si está en null (reserva sin
       pagar todavía) caemos al precio de lista del tipo. */
    precio  : Number(c.precio_pagado ?? c.tipo?.precio ?? 0),
    moneda  : c.tipo?.currency || 'COP',
    fecha   : c.pagado_at || c.created_at || null,
    codigo  : c.codigo || '',
  })), [clientes]);

  const moneda = filas[0]?.moneda || 'COP';
  const total = filas.reduce((s, f) => s + (NO_FACTURA.has(f.estado) ? 0 : f.precio), 0);
  const parcial = totalReal > filas.length;

  const exportarCSV = () => {
    const enc = ['Nombre', 'Email', 'Tipo de boleta', 'Estado', 'Valor', 'Moneda', 'Fecha', 'Código'];
    const cuerpo = filas.map(f => [
      f.nombre, f.email, f.tipo, ESTADO_LABEL[f.estado] || f.estado, f.precio, f.moneda,
      f.fecha ? new Date(f.fecha).toLocaleString('es-CO') : '', f.codigo,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    const csv = '﻿' + [enc.join(';'), ...cuerpo].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `facturacion-${evento.slug || evento.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return <p className="text-sm text-text-3 py-8">Cargando historial…</p>;
  if (error) return <div className="card p-6"><p className="text-sm text-danger">{error}</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-6">
          <Kpi label="Boletas emitidas" v={totalReal || filas.length} />
          <Kpi label={parcial ? `Ingresos (primeras ${filas.length})` : 'Ingresos registrados'} v={dinero(total, moneda)} />
        </div>
        <button onClick={exportarCSV} disabled={filas.length === 0} className="btn-secondary btn-sm">
          Exportar CSV (contabilidad)
        </button>
      </div>

      {parcial && (
        <p className="text-xs text-text-3">
          Se listan las {filas.length} boletas más recientes de {totalReal}. El CSV exporta lo listado.
        </p>
      )}

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
              {filas.map(f => (
                <tr key={f.id} className="hover:bg-surface-2/40">
                  <td className="px-4 py-2.5">
                    <p className="text-text-1">{f.nombre}</p>
                    <p className="text-xs text-text-3">{f.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-text-2">
                    <p>{f.tipo}</p>
                    {f.codigo && <p className="text-xs text-text-3 font-mono">{f.codigo}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-text-2 ${NO_FACTURA.has(f.estado) ? 'line-through opacity-60' : ''}`}>
                      {ESTADO_LABEL[f.estado] || f.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-1">{dinero(f.precio, f.moneda)}</td>
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
