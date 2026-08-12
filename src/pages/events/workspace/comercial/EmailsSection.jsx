import { useState, useEffect } from 'react';
import { eventosApi } from '../../../../api/eventos.js';
import { ticketsApi } from '../../../../api/tickets.js';
import { emailsApi } from '../../../../api/emails.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import ImagePicker from '../../../../components/ui/ImagePicker.jsx';

/* Event Experience · Emails — editor de las plantillas de correo por tipo,
   con variables y segmentación de destinatarios. Se guarda en
   page_json.emails (sin migración). El ENVÍO usa el servicio de correo del
   backend (routes/emails.js): /emails/prueba y /emails/enviar. */

const TIPOS = [
  { id: 'confirmacion', label: 'Confirmación de compra', desc: 'Al comprar/reservar. Incluye QR y código.', auto: true },
  { id: 'bienvenida',   label: 'Bienvenida',              desc: 'Primer correo al inscribirse.',           auto: true },
  { id: 'recordatorio', label: 'Recordatorio',            desc: 'Antes del evento.',                       auto: true },
  { id: 'cancelacion',  label: 'Cancelación',             desc: 'Si se cancela una boleta o el evento.',   auto: true },
  { id: 'personalizado',label: 'Campaña personalizada',   desc: 'Envío manual a un segmento que elijas.',  auto: false },
];

const VARIABLES = ['{{nombre}}', '{{evento}}', '{{fecha}}', '{{lugar}}', '{{tipo_boleta}}', '{{codigo}}'];

function plantillaDefecto(tipo) {
  const base = {
    asunto: '', encabezado: '', cuerpo: '',
    boton_texto: '', boton_url: '', mostrar_qr: false, imagen: '', footer: '',
  };
  if (tipo === 'confirmacion') return { ...base, asunto: 'Tu boleta para {{evento}}', encabezado: '¡Listo, {{nombre}}!', cuerpo: 'Tu inscripción a {{evento}} quedó confirmada. Muestra este QR en la entrada.', mostrar_qr: true };
  if (tipo === 'bienvenida')   return { ...base, asunto: 'Bienvenido a {{evento}}', encabezado: 'Hola {{nombre}}', cuerpo: 'Gracias por sumarte a {{evento}}. Pronto te enviaremos más detalles.' };
  if (tipo === 'recordatorio') return { ...base, asunto: '{{evento}} es {{fecha}}', encabezado: '¡Ya casi, {{nombre}}!', cuerpo: 'Te recordamos que {{evento}} es {{fecha}} en {{lugar}}. ¡Te esperamos!' };
  if (tipo === 'cancelacion')  return { ...base, asunto: 'Cancelación · {{evento}}', encabezado: 'Hola {{nombre}}', cuerpo: 'Tu boleta de {{tipo_boleta}} para {{evento}} fue cancelada. Si tienes dudas, respóndenos.' };
  return { ...base, asunto: '', encabezado: 'Hola {{nombre}}', cuerpo: '' };
}

export default function EmailsSection({ evento }) {
  const { success, error } = useToast();
  const [tipo, setTipo] = useState('confirmacion');
  const [data, setData] = useState({});
  const [tipos, setTipos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [segmento, setSegmento] = useState('todos');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setData(evento.page_json?.emails || {});
    ticketsApi.list(evento.id).then(d => setTipos((d.tickets || d.tipos || []).filter(t => (t.descripcion || '') !== 'GESTEK_INVITACION'))).catch(() => {});
  }, [evento.id]);

  const plantilla = { ...plantillaDefecto(tipo), ...(data[tipo] || {}) };
  const setP = (patch) => setData(d => ({ ...d, [tipo]: { ...plantilla, ...patch } }));

  const persistir = async () => {
    await eventosApi.update(evento.id, { page_json: { emails: data } });
  };

  const guardar = async () => {
    setSaving(true);
    try { await persistir(); success('Plantillas de correo guardadas.'); }
    catch (e) { error(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  /* Prueba: guarda primero (el backend lee la plantilla del evento) y envía. */
  const enviarPrueba = async () => {
    setEnviando(true);
    try {
      await persistir();
      const r = await emailsApi.prueba(evento.id, tipo);
      success(`Correo de prueba enviado a ${r.enviado_a}.`);
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setEnviando(false); }
  };

  const insertarVar = (v) => setP({ cuerpo: (plantilla.cuerpo || '') + ' ' + v });

  const enviarCampana = async () => {
    setEnviando(true);
    try {
      await persistir();
      const r = await emailsApi.enviar(evento.id, { tipo, audiencia: segmento });
      if (r.fallidos > 0) error(`Enviados ${r.enviados} de ${r.total}. Fallaron ${r.fallidos}.`);
      else success(`Campaña enviada a ${r.enviados} destinatario${r.enviados !== 1 ? 's' : ''}.`);
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setEnviando(false); }
  };

  const meta = TIPOS.find(t => t.id === tipo);

  return (
    <div className="grid lg:grid-cols-[240px_1fr_340px] gap-5 items-start">
      {/* Tipos de correo */}
      <aside className="rounded-2xl border border-border bg-surface/60 overflow-hidden">
        <p className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-3 border-b border-border">Tipos de correo</p>
        <ul className="p-2 space-y-0.5">
          {TIPOS.map(t => (
            <li key={t.id}>
              <button onClick={() => setTipo(t.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${tipo === t.id ? 'bg-accent/10 border border-accent/40' : 'hover:bg-surface-2 border border-transparent'}`}>
                <p className={`text-sm font-medium ${tipo === t.id ? 'text-text-1' : 'text-text-2'}`}>{t.label}</p>
                <p className="text-[11px] text-text-3 leading-snug mt-0.5">{t.desc}</p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Editor de la plantilla */}
      <div className="space-y-4">
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-text-1">{meta?.label}</h3>
            {meta?.auto ? <span className="badge badge-green text-[10px]">Automático</span> : <span className="badge badge-purple text-[10px]">Manual</span>}
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="label">Asunto</label>
              <input className="input" value={plantilla.asunto} onChange={e => setP({ asunto: e.target.value })} placeholder="Asunto del correo" />
            </div>
            <div>
              <label className="label">Encabezado</label>
              <input className="input" value={plantilla.encabezado} onChange={e => setP({ encabezado: e.target.value })} placeholder="Título grande dentro del correo" />
            </div>
            <div>
              <label className="label">Cuerpo</label>
              <textarea rows={4} className="input !h-auto resize-none" value={plantilla.cuerpo} onChange={e => setP({ cuerpo: e.target.value })} placeholder="Contenido del correo…" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {VARIABLES.map(v => (
                  <button key={v} onClick={() => insertarVar(v)} className="px-2 py-1 rounded-md bg-surface-2 text-[11px] font-mono text-text-2 hover:text-text-1 transition-colors">{v}</button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Texto del botón <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
                <input className="input" value={plantilla.boton_texto} onChange={e => setP({ boton_texto: e.target.value })} placeholder="Ver mi boleta" />
              </div>
              <div>
                <label className="label">Enlace del botón</label>
                <input className="input font-mono text-xs" value={plantilla.boton_url} onChange={e => setP({ boton_url: e.target.value })} placeholder="https://…" />
              </div>
            </div>
            <div>
              <label className="label">Imagen / banner <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
              <ImagePicker value={plantilla.imagen} onChange={v => setP({ imagen: v })} ownerId={evento.id} placeholder="Banner del correo" />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
                <input type="checkbox" checked={plantilla.mostrar_qr} onChange={e => setP({ mostrar_qr: e.target.checked })} className="accent-[#8B5CF6]" /> Incluir QR de la boleta
              </label>
              <input className="input !h-9 flex-1 min-w-[180px]" value={plantilla.footer} onChange={e => setP({ footer: e.target.value })} placeholder="Pie de página (opcional)" />
            </div>
          </div>
        </div>

        {/* Segmentación (solo campaña personalizada) */}
        {tipo === 'personalizado' && (
          <div className="card">
            <div className="card-header"><h3 className="text-base font-semibold text-text-1">Destinatarios</h3></div>
            <div className="card-body space-y-3">
              <select className="input" value={segmento} onChange={e => setSegmento(e.target.value)}>
                <option value="todos">Todos los asistentes</option>
                <option value="equipo">Colaboradores (equipo del evento)</option>
                {tipos.map(t => <option key={t.id} value={`tipo:${t.id}`}>Asistentes con boleta: {t.nombre}</option>)}
              </select>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={enviarCampana} disabled={enviando} className="btn-primary btn-sm">{enviando ? 'Enviando…' : 'Enviar campaña'}</button>
                <button onClick={enviarPrueba} disabled={enviando} className="btn-secondary btn-sm">Enviarme una prueba</button>
              </div>
              <p className="text-xs text-text-3">Segmenta por tipo de boleta (VIP, stand, general…) o al equipo. El envío se habilita al desplegar el servicio de correo.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={enviarPrueba} disabled={enviando || saving} className="btn-secondary">{enviando ? 'Enviando…' : 'Enviarme una prueba'}</button>
          <button onClick={guardar} disabled={saving} className="btn-primary">{saving ? 'Guardando…' : 'Guardar plantillas'}</button>
        </div>
      </div>

      {/* Vista previa del correo */}
      <div className="lg:sticky lg:top-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Vista previa</p>
        <div className="rounded-2xl border border-border overflow-hidden bg-white text-slate-900">
          <div className="px-5 py-3 text-xs text-slate-500 border-b border-slate-200 truncate">{muestra(plantilla.asunto, evento) || '(sin asunto)'}</div>
          {plantilla.imagen && <img src={plantilla.imagen} alt="" className="w-full max-h-40 object-cover" />}
          <div className="p-6 text-center">
            {plantilla.encabezado && <h2 className="text-xl font-bold mb-3">{muestra(plantilla.encabezado, evento)}</h2>}
            {plantilla.cuerpo && <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{muestra(plantilla.cuerpo, evento)}</p>}
            {plantilla.mostrar_qr && <div className="my-4 mx-auto w-24 h-24 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">QR</div>}
            {plantilla.boton_texto && (
              <div className="mt-5"><span className="inline-block px-5 py-2.5 rounded-full text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>{plantilla.boton_texto}</span></div>
            )}
          </div>
          <div className="px-6 py-3 text-center text-[11px] text-slate-400 border-t border-slate-200">{muestra(plantilla.footer, evento) || `${evento.titulo}`}</div>
        </div>
      </div>
    </div>
  );
}

function muestra(txt, evento) {
  if (!txt) return txt;
  return txt
    .replace(/\{\{nombre\}\}/g, 'María')
    .replace(/\{\{evento\}\}/g, evento.titulo || 'tu evento')
    .replace(/\{\{fecha\}\}/g, evento.fecha_inicio ? new Date(evento.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) : 'la fecha')
    .replace(/\{\{lugar\}\}/g, evento.location_nombre || 'el lugar')
    .replace(/\{\{tipo_boleta\}\}/g, 'General')
    .replace(/\{\{codigo\}\}/g, 'ABC123');
}
