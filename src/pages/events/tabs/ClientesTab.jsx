import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeCanvas } from 'qrcode.react';
import { clientesApi } from '../../../api/clientes.js';
import { useToast } from '../../../context/ToastContext.jsx';
import ImportarAsistentes from '../workspace/asistentes/ImportarAsistentes.jsx';
import RepartoSinCorreo from '../workspace/asistentes/RepartoSinCorreo.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import { exportar } from '../../../lib/hojaEscribir.js';
import { ymdLocal } from '../../../lib/fechaLocal.js';
import DescargarEntrada from '../../../components/public/DescargarEntrada.jsx';
import EnviarEntrada from '../../../components/public/EnviarEntrada.jsx';

const ESTADO_LABEL = {
  emitido    : 'Emitido',
  pagado     : 'Pagado',
  usado      : 'Asistió',
  reembolsado: 'Reembolsado',
  invalido   : 'Inválido',
};

const ESTADO_CLS = {
  emitido    : 'bg-warning/10 text-warning border-warning/20',
  pagado     : 'bg-success/10 text-success border-success/20',
  usado      : 'bg-text-1/10 text-text-1 border-border-2',
  reembolsado: 'bg-text-3/10 text-text-2 border-border',
  invalido   : 'bg-danger/10 text-danger border-danger/20',
};

export default function ClientesTab({ evento }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [repartoOpen, setRepartoOpen] = useState(false);
  const [detalleCliente, setDetalleCliente] = useState(null);
  const [reembolsando, setReembolsando] = useState(null);
  const [exportando, setExportando] = useState(false);
  const { success, error: toastErr } = useToast();

  /* Exportar de verdad: TODO el evento y CON las respuestas del formulario.

     Lo que había antes exportaba `clientes`, que es sólo la página cargada, con
     ocho columnas fijas y ninguna respuesta. Alguien montaba la ficha de
     caracterización de 22 preguntas, la gente la respondía, y el archivo salía
     sin una sola: los datos por los que se pide el formulario se quedaban
     dentro de la plataforma. Y en un evento de 7.000 personas exportaba las 50
     de la primera página sin decir que faltaban las demás.

     El servidor arma las columnas —una por pregunta, en su orden— porque es
     quien conoce la definición del formulario. */
  const exportarTodo = async () => {
    setExportando(true);
    try {
      const r = await clientesApi.exportar(evento.id);
      if (!r.total) { toastErr('No hay inscritos todavía.'); return; }
      const { formato } = await exportar([r.columnas, ...r.filas], {
        titulo: r.evento,
        base: r.slug || r.evento,
        sufijo: 'inscritos',
      });
      success(
        formato === 'xlsx'
          ? `${r.total} inscritos exportados${r.preguntas ? `, con las ${r.preguntas} preguntas del formulario` : ''}.`
          : `${r.total} inscritos en CSV (tu navegador no permite generar Excel).`,
      );
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally { setExportando(false); }
  };

  const reload = async () => {
    setLoading(true);
    try {
      const d = await clientesApi.list(evento.id, {
        ...(q ? { q } : {}),
        ...(estadoFilter ? { estado: estadoFilter } : {}),
      });
      setData(d);
    } catch (e) { toastErr(e.message); }
    finally    { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(reload, q ? 300 : 0);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [evento.id, q, estadoFilter]);

  const cambiarEstado = async (ticketId, estado) => {
    try {
      await clientesApi.cambiarEstado(evento.id, ticketId, estado);
      success('Estado actualizado.');
      reload();
    } catch (e) { toastErr(e.message); }
  };

  const clientes = data?.clientes || [];
  const stats    = data?.stats    || { total: 0, ingresos: 0 };
  /* Mapa id de campo → etiqueta, para traducir las claves de `respuestas`
     (que se guardan por UUID del campo) a su texto real ("Cédula", "Edad"). */
  const camposFormulario = data?.campos_formulario || [];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Clientes</h2>
          <p className="text-sm text-text-2 mt-1">Personas que han reservado o comprado boletas para este evento.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportarPDF(clientes, evento)}
            disabled={clientes.length === 0}
            className="btn-secondary btn-sm"
            title="Descarga un PDF con la lista de asistentes, listo para imprimir">
            <PdfIcon className="w-3.5 h-3.5" /> Exportar PDF
          </button>
          <button
            onClick={exportarTodo}
            disabled={exportando}
            className="btn-secondary btn-sm"
            title="Todos los inscritos del evento, con las respuestas del formulario, en Excel">
            {exportando
              ? <><Spinner size="sm" /> Exportando…</>
              : <><DownloadIcon className="w-3.5 h-3.5" /> Exportar Excel</>}
          </button>
          <button onClick={() => setImportOpen(true)} className="btn-secondary btn-sm"
            title="Excel o CSV, con mapeo de columnas a las preguntas del formulario">
            <UploadIcon className="w-3.5 h-3.5" /> Importar Excel
          </button>
          {/* La salida si el correo no llega a tiempo: imprimir y repartir a mano. */}
          <button onClick={() => setRepartoOpen(true)} className="btn-secondary btn-sm"
            disabled={clientes.length === 0}
            title="Imprimir invitaciones con QR o mandarlas por WhatsApp, sin depender del correo">
            Reparto sin correo
          </button>
        </div>
      </div>

      {/* Stats compactos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Total"        value={stats.total} />
        <StatBox label="Pagados"      value={stats.pagado || 0} />
        <StatBox label="Asistieron"   value={stats.usado || 0} />
        <StatBox label="Ingresos"     value={`$${Math.round(stats.ingresos).toLocaleString('es-CO')}`} hint={evento.currency} />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre, email o código..."
            className="input rounded-2xl py-2.5 pl-10 text-sm"
          />
        </div>
        <select
          value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}
          className="input bg-surface-2 rounded-2xl py-2.5 text-sm w-auto"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <GLoader message="Cargando clientes..." />
      ) : clientes.length === 0 ? (
        <EmptyState hasFilter={Boolean(q || estadoFilter)} />
      ) : (
        <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
          {clientes.map((c, i) => (
            <ClienteRow
              key={c.id}
              cliente={c}
              currency={evento.currency}
              onCambiarEstado={(e) => cambiarEstado(c.id, e)}
              onReembolsar={() => setReembolsando(c)}
              onVerDetalle={() => setDetalleCliente(c)}
              style={{ animationDelay: `${i * 25}ms` }}
            />
          ))}
        </div>
      )}

      {importOpen && (
        <ImportarAsistentes
          evento={evento}
          onClose={() => setImportOpen(false)}
          onDone={() => { reload(); }}
        />
      )}

      {repartoOpen && (
        <RepartoSinCorreo evento={evento} onClose={() => setRepartoOpen(false)} />
      )}

      {reembolsando && (
        <ReembolsoModal
          evento={evento}
          cliente={reembolsando}
          onClose={() => setReembolsando(null)}
          onHecho={() => { setReembolsando(null); reload(); }}
        />
      )}

      {detalleCliente && (
        <DetalleModal
          cliente={detalleCliente}
          evento={evento}
          currency={evento.currency}
          camposFormulario={camposFormulario}
          onClose={() => setDetalleCliente(null)}
        />
      )}
    </div>
  );
}

function StatBox({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3.5">
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{label}</p>
      <p className="text-2xl font-bold font-display text-text-1 tabular-nums mt-1 leading-none">{value}</p>
      {hint && <p className="text-[10px] text-text-3 mt-1 lowercase">{hint}</p>}
    </div>
  );
}

function ClienteRow({ cliente, currency, onCambiarEstado, onReembolsar, onVerDetalle, style }) {
  const [openMenu, setOpenMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const nombre = cliente.usuario?.nombre || cliente.guest_nombre || cliente.guest_email;
  const email  = cliente.usuario?.email || cliente.guest_email;
  const initials = (nombre || 'U').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  const fecha = new Date(cliente.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

  const toggleMenu = () => {
    if (!openMenu && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuWidth = 176; // w-44
      setMenuPos({
        top : r.bottom + 6,
        left: Math.min(r.right - menuWidth, window.innerWidth - menuWidth - 8),
      });
    }
    setOpenMenu(v => !v);
  };

  return (
    <div
      className="flex items-center gap-3 px-5 py-3.5 border-b border-border last:border-0 hover:bg-surface-2/30 transition-colors animate-[fadeUp_0.3s_ease_both] group"
      style={style}
    >
      <button
        onClick={onVerDetalle}
        className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 hover:opacity-80 transition-opacity"
        title="Ver información completa"
      >
        {cliente.usuario?.avatar_url
          ? <img src={cliente.usuario.avatar_url} alt="" className="w-full h-full object-cover" />
          : initials}
      </button>

      <button onClick={onVerDetalle} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-text-1 truncate hover:text-primary-light transition-colors">{nombre}</p>
        <p className="text-xs text-text-3 truncate">{email}</p>
      </button>

      <div className="hidden md:block text-right">
        <p className="text-xs font-medium text-text-1">{cliente.tipo?.nombre || '—'}</p>
        <p className="text-[11px] text-text-3 tabular-nums">
          {cliente.precio_pagado != null
            ? (Number(cliente.precio_pagado) === 0 ? 'Gratis' : `$${Number(cliente.precio_pagado).toLocaleString('es-CO')} ${currency}`)
            : 'Pendiente'}
        </p>
      </div>

      <div className="hidden lg:block">
        <p className="text-[10px] uppercase tracking-wider text-text-3">Código</p>
        <p className="font-mono text-xs text-text-2 tabular-nums">{cliente.codigo}</p>
      </div>

      <div className="hidden sm:block text-right text-[11px] text-text-3 tabular-nums w-20">{fecha}</div>

      <span className={`text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full border ${ESTADO_CLS[cliente.estado] || ESTADO_CLS.emitido}`}>
        {ESTADO_LABEL[cliente.estado] || cliente.estado}
      </span>

      <button
        onClick={onVerDetalle}
        aria-label="Ver detalle"
        title="Ver información completa"
        className="w-8 h-8 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <EyeIcon className="w-4 h-4" />
      </button>

      <div className="relative">
        <button
          ref={btnRef}
          onClick={toggleMenu}
          aria-label="Acciones"
          className="w-8 h-8 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <DotsIcon className="w-4 h-4" />
        </button>
        {openMenu && createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(false)} />
            <div
              className="fixed z-50 w-44 rounded-2xl border border-border-2 bg-surface shadow-2xl py-1 animate-[scaleIn_0.15s_ease_both] origin-top-right"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              {/* Reembolsar sale del menú de estados y se pone aparte.

                  Estaba ahí dentro, como una opción más entre «marcar como
                  emitido» y «marcar como inválido»: el mismo gesto para cambiar
                  una etiqueta que para devolver un pago. Ahora pide motivo, deja
                  rastro y avisa de lo único que la gente da por hecho —que la
                  plataforma NO mueve el dinero—. */}
              {Object.entries(ESTADO_LABEL)
                .filter(([k]) => k !== 'reembolsado')
                .map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => { onCambiarEstado(k); setOpenMenu(false); }}
                    disabled={cliente.estado === k}
                    className="w-full px-3 py-2 text-left text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 disabled:text-text-3 disabled:bg-surface-2/50 transition-colors"
                  >
                    Marcar como {label.toLowerCase()}
                  </button>
                ))}

              {['pagado', 'usado'].includes(cliente.estado) && (
                <button
                  onClick={() => { setOpenMenu(false); onReembolsar?.(); }}
                  className="w-full px-3 py-2 text-left text-sm text-warning-light hover:bg-surface-2 transition-colors border-t border-border mt-1 pt-2"
                >
                  Reembolsar…
                </button>
              )}
            </div>
          </>,
          document.body
        )}
      </div>
    </div>
  );
}

/* ─────────── Detalle de un asistente (incluye QR + formulario que diligenció) ─────────── */
function DetalleModal({ cliente, evento = {}, currency, camposFormulario, onClose }) {
  const nombre = cliente.usuario?.nombre || cliente.guest_nombre || cliente.guest_email;
  const email  = cliente.usuario?.email || cliente.guest_email;
  const initials = (nombre || 'U').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const qrCanvasRef = useRef(null);
  /* El QR codifica lo mismo que usa el escáner de Check-in: el qr_token
     firmado si existe, o el código de la boleta como respaldo. */
  const qrValue = cliente.qr_token || cliente.codigo;


  /* respuestas se guarda como { "<id_del_campo>": valor }. Usamos el id
     para buscar la etiqueta real en camposFormulario (ej. "Cédula", "Edad")
     en vez de mostrar el UUID crudo. Si algún id ya no existe en la
     definición actual del formulario, mostramos "Pregunta eliminada" como
     respaldo en vez de ocultar la respuesta. */
  const respuestas = cliente.respuestas;
  const mapaCampos = new Map((camposFormulario || []).map(c => [c.id, c]));

  let filas = [];
  if (Array.isArray(respuestas)) {
    filas = respuestas.map(r => ({ etiqueta: r.pregunta || r.label || 'Pregunta', valor: r.respuesta ?? r.value }));
  } else if (respuestas && typeof respuestas === 'object') {
    filas = Object.entries(respuestas)
      .map(([campoId, valor]) => {
        const campo = mapaCampos.get(campoId);
        return { etiqueta: campo?.etiqueta || 'Pregunta eliminada', valor, orden: campo?.orden ?? 999 };
      })
      .sort((a, b) => a.orden - b.orden);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[88vh] overflow-y-auto animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-surface px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {cliente.usuario?.avatar_url
              ? <img src={cliente.usuario.avatar_url} alt="" className="w-full h-full object-cover" />
              : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">Detalle del asistente</p>
            <h2 className="text-lg font-bold font-display tracking-tight text-text-1 truncate">{nombre}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* QR de la boleta + descarga */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div ref={qrCanvasRef} className="bg-white rounded-2xl p-4 inline-block">
              <QRCodeCanvas value={qrValue} size={160} level="M" includeMargin={false} />
            </div>
            <p className="font-mono text-sm font-bold text-text-1 tabular-nums tracking-widest">{cliente.codigo}</p>

            {/* Aquí sólo se podía bajar el QR —una imagen suelta, sin nombre, sin
                evento y sin instrucciones—, mientras el asistente tiene desde
                hace tiempo su tarjeta, su PDF y su QR en `/mi-ticket`. El panel
                se había quedado con la mitad más pobre de lo que ya existía, y
                escrita a mano por cuarta vez.

                Son los mismos componentes que usa el público, así que lo que el
                organizador manda es exactamente lo que la persona recibiría por
                su cuenta —mismo QR incluido, que es lo que evita el papel que no
                abre ninguna puerta—. */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <DescargarEntrada
                evento={evento}
                ticket={cliente}
                qrValue={qrValue}
                respuestas={cliente.respuestas}
                campos={camposFormulario}
                etiqueta="Descargar"
              />
              <EnviarEntrada evento={evento} ticket={cliente} qrValue={qrValue} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-2.5">
            <DetalleRow label="Email" value={email} />
            <DetalleRow label="Código" value={cliente.codigo} mono />
            <DetalleRow label="Tipo de boleta" value={cliente.tipo?.nombre || '—'} />
            <DetalleRow label="Estado" value={ESTADO_LABEL[cliente.estado] || cliente.estado} />
            <DetalleRow
              label="Precio pagado"
              value={cliente.precio_pagado != null
                ? (Number(cliente.precio_pagado) === 0 ? 'Gratis' : `$${Number(cliente.precio_pagado).toLocaleString('es-CO')} ${currency || ''}`)
                : 'Pendiente'}
            />
            <DetalleRow label="Reservado el" value={new Date(cliente.created_at).toLocaleString('es-CO')} />
            {cliente.checked_in_at && (
              <DetalleRow label="Ingresó el" value={new Date(cliente.checked_in_at).toLocaleString('es-CO')} />
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-2">Formulario que diligenció</p>
            {filas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-6 text-center">
                <p className="text-sm text-text-3">Este evento no tiene preguntas personalizadas, o la persona no respondió ninguna.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">
                {filas.map((f, i) => (
                  <div key={i} className="px-4 py-3">
                    <p className="text-xs text-text-3 mb-0.5">{f.etiqueta}</p>
                    {/* Fotos se muestran como imagen (con link de descarga), no como texto/URL crudo */}
                    {typeof f.valor === 'string' && /^https?:\/\/.*\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(f.valor) ? (
                      <div className="mt-1">
                        <img src={f.valor} alt={f.etiqueta} className="w-full max-w-xs rounded-xl border border-border object-cover" />
                        <a href={f.valor} download target="_blank" rel="noreferrer"
                          className="inline-block text-xs text-primary-light hover:underline mt-1.5">
                          Descargar imagen
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-text-1 leading-relaxed">
                        {Array.isArray(f.valor) ? f.valor.join(', ') : (f.valor || f.valor === 0 ? String(f.valor) : '—')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DetalleRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-text-3">{label}</span>
      <span className={`text-sm text-text-1 text-right truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function EmptyState({ hasFilter }) {
  return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface border border-border mb-4">
        <UsersIcon className="w-6 h-6 text-text-2" />
      </div>
      <h2 className="text-lg font-bold font-display text-text-1 tracking-tight mb-1">
        {hasFilter ? 'Sin resultados' : 'Aún no hay clientes'}
      </h2>
      <p className="text-sm text-text-2 leading-relaxed max-w-sm mx-auto">
        {hasFilter
          ? 'Ningún cliente coincide con los filtros. Cambia la búsqueda o el estado.'
          : 'Cuando alguien reserve o compre una boleta, aparecerá aquí. Comparte el link de tu evento para empezar.'}
      </p>
    </div>
  );
}

function exportarPDF(clientes, evento) {
  if (!clientes?.length) return;

  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(15);
  doc.text(evento?.titulo || 'Lista de asistentes', 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-CO')} · ${clientes.length} registro${clientes.length === 1 ? '' : 's'}`, 14, 22);
  doc.setTextColor(0);

  const rows = clientes.map(c => [
    c.usuario?.nombre || c.guest_nombre || '—',
    c.usuario?.email || c.guest_email || '—',
    c.tipo?.nombre || '—',
    c.codigo,
    ESTADO_LABEL[c.estado] || c.estado,
  ]);

  autoTable(doc, {
    startY: 28,
    head: [['Nombre', 'Email', 'Tipo de boleta', 'Código', 'Estado']],
    body: rows,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  const slug = (evento?.slug || 'evento').replace(/[^a-z0-9-]/gi, '-');
  /* Local, no UTC: exportar a las 8 de la noche nombraba el archivo con la
     fecha de mañana, y ese nombre es lo que luego se usa para saber de qué día
     es el corte. */
  const fecha = ymdLocal(new Date());
  doc.save(`asistentes-${slug}-${fecha}.pdf`);
}

function DownloadIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5m0 0l5-5m-5 5V4" /></svg>;
}

function UploadIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>;
}

function PdfIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}

function EyeIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}

function SearchIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
function UsersIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3a4 4 0 11-8 0 4 4 0 018 0zm5-1a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function DotsIcon({ className }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>;
}

/* Reembolsar, con el aviso que la gente da por hecho al revés.
 *
 * ── Lo que hay que decir, y decirlo antes ────────────────────────────────
 *
 * Quien pulsa «reembolsar» en un panel supone que el panel devuelve el dinero.
 * No lo hace, y no puede: el dinero está en Mercado Pago o en Wompi, con sus
 * credenciales y sus plazos. Lo que hace la plataforma es dejar constancia —la
 * boleta deja de servir, el cupo se libera y se le ofrece a quien espera, y
 * queda escrito quién y por qué—.
 *
 * Ese aviso va ARRIBA y no en letra pequeña al final: si se lee después de
 * pulsar, ya no sirve de nada.
 *
 * ── Y por qué pide motivo ────────────────────────────────────────────────
 *
 * Porque un reembolso se pregunta un mes después —«¿por qué se le devolvió a
 * éste?»— y el estado solo no lo contesta. Es opcional a propósito: obligar a
 * escribir con alguien esperando produce «asd», que es peor que el vacío.
 */
function ReembolsoModal({ evento, cliente, onClose, onHecho }) {
  const [motivo, setMotivo] = useState('');
  const [working, setWorking] = useState(false);
  const { success, error: toastErr } = useToast();

  const nombre = cliente.usuario?.nombre || cliente.guest_nombre || cliente.guest_email || 'esta persona';
  const monto = Number(cliente.precio_pagado) || 0;

  const confirmar = async () => {
    setWorking(true);
    try {
      const r = await clientesApi.reembolsar(evento.id, cliente.id, motivo);
      success(r.aviso || 'Reembolso registrado.');
      onHecho();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally { setWorking(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-1">Reembolsar la boleta de {nombre}</h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3">
            <p className="text-sm text-text-1 font-medium">Esto no devuelve el dinero.</p>
            <p className="text-xs text-text-2 mt-1 leading-relaxed">
              El dinero se devuelve desde Mercado Pago o Wompi, con sus plazos. Aquí queda
              registrado: la boleta deja de servir en la puerta y su cupo se libera para quien
              esté en lista de espera.
            </p>
          </div>

          {monto > 0 && (
            <p className="text-sm text-text-2">
              Se cobraron <b className="text-text-1 tabular-nums">${monto.toLocaleString('es-CO')}</b>.
            </p>
          )}

          <div className="field">
            <label className="label">Motivo <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
            <input value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Pidió cancelar, cobro duplicado…" className="input" />
            <p className="text-[11px] text-text-3 mt-1.5">
              Dentro de un mes, «¿por qué se le devolvió a éste?» no lo contesta el estado.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost btn-sm">Cancelar</button>
          <button onClick={confirmar} disabled={working} className="btn-primary btn-sm">
            {working ? 'Registrando…' : 'Registrar el reembolso'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
