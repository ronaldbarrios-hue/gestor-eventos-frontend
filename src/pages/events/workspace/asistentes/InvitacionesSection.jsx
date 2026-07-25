import { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ticketsApi } from '../../../../api/tickets.js';
import { clientesApi } from '../../../../api/clientes.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../../components/ui/Confirm.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';

/* Asistentes · Invitaciones — invitados especiales (VIP, prensa, speakers,
   patrocinadores, cortesías). Cada invitación EMITE un ticket real de cortesía
   (precio 0) usando el flujo existente, así el invitado aparece en Clientes,
   Check-in y Credenciales con su QR — sin duplicar sistemas.

   Los "tipos" de invitación son ticket_types gratuitos e INACTIVOS (no salen
   al checkout público, pero sí se pueden emitir internamente). Se distinguen
   por el marcador en `descripcion`. */

const MARCADOR = 'GESTEK_INVITACION';
const CATEGORIAS = [
  { id: 'VIP',           label: 'VIP',            color: 'badge-purple' },
  { id: 'Prensa',        label: 'Prensa',         color: 'badge-blue' },
  { id: 'Speaker',       label: 'Speaker',        color: 'badge-green' },
  { id: 'Patrocinador',  label: 'Patrocinador',   color: 'badge-gray' },
  { id: 'Cortesía',      label: 'Cortesía',       color: 'badge-gray' },
];

export default function InvitacionesSection({ evento }) {
  const { success, error } = useToast();
  const [tipos, setTipos]       = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [creando, setCreando]   = useState(false);
  const [f, setF] = useState({ nombre: '', email: '', categoria: 'VIP' });

  const cargar = async () => {
    const [t, c] = await Promise.allSettled([
      ticketsApi.list(evento.id),
      clientesApi.list(evento.id, { limit: 1000 }),
    ]);
    if (t.status === 'fulfilled') setTipos(t.value.tickets || t.value.tipos || []);
    if (c.status === 'fulfilled') setClientes(c.value.clientes || c.value.tickets || []);
    setLoading(false);
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [evento.id]);

  /* ids de los ticket_types que son "de invitación" */
  const tiposInvitacion = useMemo(
    () => tipos.filter(t => (t.descripcion || '') === MARCADOR),
    [tipos],
  );
  const idsInvitacion = useMemo(
    () => new Set(tiposInvitacion.map(t => t.id)),
    [tiposInvitacion],
  );

  /* invitados = clientes cuyo tipo es de invitación */
  const invitados = useMemo(
    () => clientes.filter(c => idsInvitacion.has(c.tipo?.id)),
    [clientes, idsInvitacion],
  );

  const porCategoria = useMemo(() => {
    const map = {};
    for (const cat of CATEGORIAS) map[cat.id] = [];
    for (const inv of invitados) {
      const cat = inv.tipo?.nombre || 'Cortesía';
      (map[cat] = map[cat] || []).push(inv);
    }
    return map;
  }, [invitados]);

  /* Encuentra (o crea) el ticket_type inactivo de esta categoría */
  const asegurarTipo = async (categoria) => {
    const existente = tiposInvitacion.find(t => t.nombre === categoria);
    if (existente) return existente.id;
    const r = await ticketsApi.crear(evento.id, {
      nombre: categoria, precio: 0, activo: false, descripcion: MARCADOR,
    });
    const nuevo = r.ticket || r;
    setTipos(prev => [...prev, nuevo]);
    return nuevo.id;
  };

  const crear = async (e) => {
    e.preventDefault();
    const nombre = f.nombre.trim();
    const email = f.email.trim().toLowerCase();
    if (!nombre) { error('Ponle nombre al invitado.'); return; }
    if (!email.includes('@')) { error('Email inválido.'); return; }
    setCreando(true);
    try {
      const ticket_type_id = await asegurarTipo(f.categoria);
      const r = await clientesApi.importar(evento.id, {
        ticket_type_id, marcar_pagado: false, rows: [{ nombre, email }],
      });
      if (r.creados > 0) {
        success(`Invitación creada para ${nombre}. Ya tiene su credencial con QR.`);
        setF({ nombre: '', email: '', categoria: f.categoria });
        await cargar();
      } else {
        error(r.errores?.[0]?.motivo || 'No se pudo crear la invitación.');
      }
    } catch (x) { error(x.response?.data?.error || x.message); }
    finally { setCreando(false); }
  };

  const anular = async (inv) => {
    if (!(await confirmDialog({ title: 'Anular invitación', message: `¿Anular la invitación de ${inv.guest_nombre || 'este invitado'}? Su credencial dejará de ser válida.`, confirmLabel: 'Anular', danger: true }))) return;
    try {
      await clientesApi.cambiarEstado(evento.id, inv.id, 'invalido');
      success('Invitación anulada.');
      await cargar();
    } catch (x) { error(x.response?.data?.error || x.message); }
  };

  if (loading) return <p className="text-sm text-text-3 py-8">Cargando invitaciones…</p>;

  const activos = invitados.filter(i => i.estado !== 'invalido');

  return (
    <div className="space-y-5">
      {/* KPIs por categoría */}
      <div className="flex items-center gap-6 flex-wrap">
        <Kpi label="Invitados activos" v={activos.length} />
        {CATEGORIAS.map(cat => porCategoria[cat.id]?.filter(i => i.estado !== 'invalido').length > 0 && (
          <Kpi key={cat.id} label={cat.label} v={porCategoria[cat.id].filter(i => i.estado !== 'invalido').length} />
        ))}
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-5 items-start">
        {/* Crear invitación */}
        <form onSubmit={crear} className="card">
          <div className="card-header"><h3 className="text-base font-semibold text-text-1">Nueva invitación</h3></div>
          <div className="card-body space-y-3.5">
            <div>
              <label className="label">Nombre del invitado</label>
              <input className="input" value={f.nombre} onChange={e => setF(x => ({ ...x, nombre: e.target.value }))} placeholder="Nombre y apellido" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={f.email} onChange={e => setF(x => ({ ...x, email: e.target.value }))} placeholder="invitado@correo.com" required />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={f.categoria} onChange={e => setF(x => ({ ...x, categoria: e.target.value }))}>
                {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <button disabled={creando} className="btn-primary w-full justify-center">
              {creando ? <><Spinner size="sm" /> Creando…</> : 'Crear invitación'}
            </button>
            <p className="text-xs text-text-3 leading-relaxed">
              Se emite una cortesía (gratis) con QR. El invitado aparece en Clientes y Check-in, y su carnet imprimible sale en <strong className="text-text-2">Asistentes → Credenciales</strong>.
            </p>
          </div>
        </form>

        {/* Lista de invitados */}
        <div className="space-y-5">
          {activos.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm text-text-2">Aún no hay invitados especiales. Crea la primera invitación: VIP, prensa, un speaker o un patrocinador.</p>
            </div>
          ) : CATEGORIAS.map(cat => {
            const lista = (porCategoria[cat.id] || []).filter(i => i.estado !== 'invalido');
            if (lista.length === 0) return null;
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`badge ${cat.color}`}>{cat.label}</span>
                  <span className="text-xs text-text-3">{lista.length} invitado{lista.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {lista.map(inv => (
                    <div key={inv.id} className="rounded-2xl border border-border bg-surface/50 p-3 flex items-center gap-3">
                      <div className="bg-white rounded-lg p-1.5 flex-shrink-0">
                        <QRCodeSVG value={`${window.location.origin}/mi-ticket/${inv.codigo}`} size={56} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-1 truncate">{inv.guest_nombre || 'Invitado'}</p>
                        <p className="text-xs text-text-3 truncate">{inv.guest_email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[11px] text-text-2">{inv.codigo}</span>
                          {inv.checked_in_at && <span className="badge badge-green text-[10px]">Ingresó</span>}
                        </div>
                      </div>
                      <button onClick={() => anular(inv)} className="btn-ghost btn-sm text-danger/80 hover:text-danger flex-shrink-0" title="Anular invitación">Anular</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
