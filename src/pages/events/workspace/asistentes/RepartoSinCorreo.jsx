import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { clientesApi } from '../../../../api/clientes.js';
import { eventosApi } from '../../../../api/eventos.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';

/* Reparto sin correo — la red de seguridad.

   El correo de este evento depende de credenciales que todavía no están, y del
   tope de cPanel (200/hora de fábrica: 7.000 boletas son 28 horas y pasarse
   bloquea la cuenta). Si el día del evento el correo no salió, la boleta ya
   está emitida y con su QR firmado en la base: lo único que falta es que
   llegue a manos de la persona.

   Tres caminos que no tocan el SMTP:

     1. IMPRIMIR — hojas con el QR de cada asistente, para recortar y entregar
        en la puerta o repartir antes. El QR es `qr_token`, el mismo que valida
        el control de ingreso; no es una URL bonita, es la credencial.
     2. WHATSAPP — un enlace `wa.me` por persona con el mensaje ya escrito. No
        necesita API de WhatsApp ni conectar nada: abre el chat y el staff pulsa
        enviar. Es lento pero funciona con dos personas y una tarde.
     3. LISTA — CSV con el enlace de cada boleta, para combinar correspondencia
        o pasarlo a quien tenga otro canal.

   Nada de esto reemplaza al correo. Es lo que permite que el evento ocurra si
   el correo no llega a tiempo. */

const POR_BLOQUE = 100;

export default function RepartoSinCorreo({ evento, onClose }) {
  const { error: toastErr } = useToast();
  const [cargando, setCargando] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [campos, setCampos] = useState([]);
  const [desde, setDesde] = useState(0);
  const hojaRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const form = await eventosApi.getFormulario(evento.id).catch(() => ({ campos: [] }));
        if (vivo) setCampos(form.campos || []);

        /* Se paginan de 500 en 500: el endpoint trae 100 por defecto y con
           7.000 asistentes pedirlos de uno en uno no termina nunca. */
        const todos = [];
        for (let page = 1; page <= 40; page++) {
          const r = await clientesApi.list(evento.id, { limit: 500, page });
          const lote = r.clientes || r.tickets || r.data || [];
          todos.push(...lote);
          if (lote.length < 500) break;
        }
        if (vivo) setTickets(todos);
      } catch (e) {
        if (vivo) toastErr(e.response?.data?.error || e.message);
      } finally { if (vivo) setCargando(false); }
    })();
    return () => { vivo = false; };
    /* eslint-disable-next-line */
  }, [evento.id]);

  const campoTelefono = campos.find(c => c.tipo === 'telefono');

  /* El teléfono vive en las respuestas del formulario: `tickets` no tiene
     columna propia para él. */
  const telefonoDe = (t) => {
    if (!campoTelefono) return '';
    const v = t.respuestas?.[campoTelefono.id];
    return v ? String(v).replace(/[^\d+]/g, '') : '';
  };

  const enlaceDe = (t) => `${window.location.origin}/mi-ticket/${t.codigo}`;

  const cuando = useMemo(() => {
    if (!evento.fecha_inicio) return '';
    const d = new Date(evento.fecha_inicio);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    });
  }, [evento.fecha_inicio]);

  const mensajeDe = (t) =>
    `Hola ${t.guest_nombre || ''}, tu entrada para *${evento.titulo}* está lista.\n` +
    (cuando ? `📅 ${cuando}\n` : '') +
    `\nAquí está tu boleta con el código QR para entrar:\n${enlaceDe(t)}\n\n` +
    `Código: ${t.codigo}`;

  const conCorreo  = tickets.filter(t => t.guest_email).length;
  const conTelefono = tickets.filter(t => telefonoDe(t)).length;
  const conQR      = tickets.filter(t => t.qr_token).length;

  const bloque = tickets.slice(desde, desde + POR_BLOQUE);

  /* Se imprime en una ventana aparte con su propio CSS: intentar imprimir
     dentro del panel obliga a pelear con los estilos de toda la aplicación, y
     el resultado depende de cosas que no controlamos. Los QR ya están pintados
     como SVG aquí, así que se copian tal cual. */
  const imprimir = () => {
    const hoja = hojaRef.current;
    if (!hoja) return;
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) { toastErr('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes.'); return; }
    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Invitaciones · ${evento.titulo}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin:0; font-family: "Segoe UI", system-ui, sans-serif; color:#111; background:#fff; }
  .rejilla { display:grid; grid-template-columns:1fr 1fr; gap:6mm; }
  .tarjeta {
    border:1px dashed #999; border-radius:3mm; padding:6mm;
    display:flex; gap:5mm; align-items:center; break-inside:avoid; min-height:45mm;
  }
  .qr { flex:none; }
  .qr svg { display:block; width:32mm; height:32mm; }
  .datos { min-width:0; }
  .evento { font-size:8pt; text-transform:uppercase; letter-spacing:.08em; color:#666; margin:0 0 1mm; }
  .nombre { font-size:13pt; font-weight:700; margin:0 0 1.5mm; line-height:1.15; word-break:break-word; }
  .linea  { font-size:8.5pt; color:#444; margin:0 0 .8mm; }
  .codigo { font-family:Consolas,monospace; font-size:11pt; font-weight:700; letter-spacing:.06em; margin-top:2mm; }
  .pie { font-size:7pt; color:#777; margin-top:2mm; }
  @media print { .noimprimir { display:none; } }
</style></head><body>
<p class="noimprimir" style="font:13px sans-serif;padding:8px 0">
  Se abrió el diálogo de impresión. Si no salió, usa Ctrl+P. Para PDF, elige «Guardar como PDF».
</p>
${hoja.innerHTML}
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const descargarCSV = () => {
    const cab = ['nombre', 'correo', 'telefono', 'codigo', 'enlace', 'whatsapp'];
    const filas = tickets.map(t => {
      const tel = telefonoDe(t);
      const wa = tel ? `https://wa.me/${tel.replace(/^\+/, '')}?text=${encodeURIComponent(mensajeDe(t))}` : '';
      return [t.guest_nombre || '', t.guest_email || '', tel, t.codigo || '', enlaceDe(t), wa]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '﻿' + cab.join(',') + '\n' + filas.join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `reparto-${evento.slug || 'evento'}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md" onClick={onClose}>
      <div className="relative w-full max-w-3xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 z-10 bg-surface px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-1">Reparto sin correo</h3>
            <p className="text-xs text-text-3 mt-0.5">Entregar las boletas sin depender del SMTP.</p>
          </div>
          <button onClick={onClose} className="text-text-3 hover:text-text-1 text-xl leading-none px-2">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {cargando ? (
            <p className="text-sm text-text-3 flex items-center gap-2"><Spinner size="sm" /> Cargando asistentes…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Dato n={tickets.length} etiqueta="boletas" />
                <Dato n={conQR} etiqueta="con QR" alerta={conQR < tickets.length} />
                <Dato n={conCorreo} etiqueta="con correo" />
                <Dato n={conTelefono} etiqueta="con teléfono" alerta={!campoTelefono} />
              </div>

              {conQR < tickets.length && (
                <p className="text-xs text-danger-light bg-danger/10 rounded-xl px-3 py-2">
                  {tickets.length - conQR} boletas no tienen QR firmado. Esas no sirven en la puerta
                  aunque se impriman: hay que revisar por qué se emitieron sin token.
                </p>
              )}
              {!campoTelefono && (
                <p className="text-xs text-warning-light bg-warning/10 rounded-xl px-3 py-2">
                  El formulario no tiene una pregunta de tipo <strong>Teléfono</strong>, así que no hay
                  números a los que escribir por WhatsApp. Agrégala en Formulario y vuelve a pedir el dato,
                  o usa la impresión.
                </p>
              )}

              {/* Acciones */}
              <div className="grid sm:grid-cols-3 gap-3">
                <Accion titulo="Imprimir invitaciones"
                  texto={`Hojas A4 con el QR de cada persona, de ${POR_BLOQUE} en ${POR_BLOQUE}. Para recortar y entregar.`}
                  onClick={imprimir} disabled={bloque.length === 0} />
                <Accion titulo="Descargar la lista"
                  texto="CSV con el enlace de cada boleta y su enlace de WhatsApp, para mandarlas por otro canal."
                  onClick={descargarCSV} disabled={tickets.length === 0} />
                <div className="rounded-2xl border border-border bg-surface/40 p-3">
                  <p className="text-sm font-semibold text-text-1 mb-1">Enviar por WhatsApp</p>
                  <p className="text-xs text-text-3 leading-relaxed">
                    Uno a uno, con el mensaje ya escrito. Abajo, en la lista.
                  </p>
                </div>
              </div>

              {/* Selector de bloque para imprimir */}
              {tickets.length > POR_BLOQUE && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-text-3">Bloque a imprimir:</span>
                  <select value={desde} onChange={e => setDesde(Number(e.target.value))}
                    className="input bg-surface-2 rounded-xl py-1.5 text-xs w-auto">
                    {Array.from({ length: Math.ceil(tickets.length / POR_BLOQUE) }, (_, i) => (
                      <option key={i} value={i * POR_BLOQUE}>
                        {i * POR_BLOQUE + 1} – {Math.min((i + 1) * POR_BLOQUE, tickets.length)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lista con WhatsApp uno a uno */}
              <div className="rounded-2xl border border-border divide-y divide-border max-h-72 overflow-y-auto">
                {bloque.map(t => {
                  const tel = telefonoDe(t);
                  return (
                    <div key={t.id} className="px-3 py-2 flex items-center gap-3 text-xs">
                      <span className="text-text-1 flex-1 truncate">{t.guest_nombre || '—'}</span>
                      <span className="text-text-3 font-mono">{t.codigo}</span>
                      {tel ? (
                        <a href={`https://wa.me/${tel.replace(/^\+/, '')}?text=${encodeURIComponent(mensajeDe(t))}`}
                          target="_blank" rel="noreferrer noopener"
                          className="px-2.5 py-1 rounded-full border border-border-2 text-text-2 hover:text-text-1 hover:bg-surface-2 shrink-0">
                          WhatsApp
                        </a>
                      ) : (
                        <span className="text-text-3 shrink-0">sin teléfono</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hoja imprimible, fuera de la vista. Se copia su HTML a la ventana de
          impresión: los QR ya están renderizados como SVG. */}
      <div ref={hojaRef} style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden="true">
        <div className="rejilla">
          {bloque.map(t => (
            <div className="tarjeta" key={t.id}>
              <div className="qr">
                {t.qr_token
                  ? <QRCodeSVG value={t.qr_token} size={128} level="M" />
                  : <div style={{ width: '32mm', height: '32mm', border: '1px solid #ccc' }} />}
              </div>
              <div className="datos">
                <p className="evento">{evento.titulo}</p>
                <p className="nombre">{t.guest_nombre || 'Invitado'}</p>
                {cuando && <p className="linea">{cuando}</p>}
                {evento.direccion && <p className="linea">{evento.direccion}</p>}
                {t.tipo?.nombre && <p className="linea">{t.tipo.nombre}</p>}
                <p className="codigo">{t.codigo}</p>
                <p className="pie">Presenta este código en la entrada.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dato({ n, etiqueta, alerta }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 px-3 py-2">
      <p className={`text-lg font-bold tabular-nums ${alerta ? 'text-warning-light' : 'text-text-1'}`}>{n}</p>
      <p className="text-[11px] text-text-3">{etiqueta}</p>
    </div>
  );
}

function Accion({ titulo, texto, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="text-left rounded-2xl border border-border bg-surface/40 p-3 hover:bg-surface-2
                 transition-colors disabled:opacity-40 disabled:hover:bg-surface/40">
      <p className="text-sm font-semibold text-text-1 mb-1">{titulo}</p>
      <p className="text-xs text-text-3 leading-relaxed">{texto}</p>
    </button>
  );
}
