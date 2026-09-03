import { useState, useEffect } from 'react';
import { eventosApi } from '../../../../api/eventos.js';
import { ticketsApi } from '../../../../api/tickets.js';
import { emailsApi } from '../../../../api/emails.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import ImagePicker from '../../../../components/ui/ImagePicker.jsx';
import BuzonPropio from './BuzonPropio.jsx';
import EstadoCola from './EstadoCola.jsx';

/* Event Experience · Emails — editor de las plantillas de correo por tipo,
   con variables y segmentación de destinatarios. Se guarda en
   page_json.emails (sin migración). El ENVÍO usa el servicio de correo del
   backend (routes/emails.js): /emails/prueba y /emails/enviar.

   Los `id` de abajo deben coincidir EXACTO con IDS_TIPOS de
   lib/emailPlantillas.js en el backend — si no, /emails/prueba y
   /emails/enviar responden 400 "Tipo de correo desconocido." (bug real que
   hubo aquí: esta pantalla usaba 'confirmacion' y 'recordatorio', que no
   existen en el catálogo del backend; ahí son 'ticket' y
   'recordatorio_7d'/'1d'/'1h'). 'bienvenida' y 'cancelacion' no tienen
   ningún id equivalente en el backend todavía — no hay disparador para
   ellos — así que se dejan solo como borrador (sin botón de prueba/envío)
   hasta que el backend los soporte. */

const TIPOS = [
  { id: 'ticket',        label: 'Confirmación de compra', desc: 'Al comprar/reservar. Incluye QR y código.',            auto: true,  soportado: true },
  { id: 'bienvenida',    label: 'Bienvenida',              desc: 'Primer correo al inscribirse. Aún sin disparador en el backend — solo puedes guardar el borrador.', auto: true,  soportado: false },
  { id: 'recordatorio_1d', label: 'Recordatorio (1 día antes)', desc: 'Antes del evento. El backend también manda uno a 7 días y otro a 1 hora, con su propio texto por defecto.', auto: true, soportado: true },
  { id: 'cancelacion',   label: 'Cancelación',             desc: 'Si se cancela una boleta o el evento. Aún sin disparador en el backend — solo puedes guardar el borrador.', auto: true,  soportado: false },
  { id: 'personalizado',label: 'Campaña personalizada',   desc: 'Envío manual a un segmento que elijas.',  auto: false, soportado: true },
];

const VARIABLES = ['{{nombre}}', '{{evento}}', '{{fecha}}', '{{lugar}}', '{{tipo_boleta}}', '{{codigo}}'];

function plantillaDefecto(tipo) {
  const base = {
    asunto: '', encabezado: '', cuerpo: '',
    boton_texto: '', boton_url: '', mostrar_qr: false, imagen: '', footer: '',
    /* El diseño del organizador: cabecera arriba, pie abajo, y el color del
       centro. Viajan en page_json.emails, así que no hizo falta migración. */
    pie_imagen: '', fondo: '',
  };
  if (tipo === 'ticket')          return { ...base, asunto: 'Tu boleta para {{evento}}', encabezado: '¡Listo, {{nombre}}!', cuerpo: 'Tu inscripción a {{evento}} quedó confirmada. Muestra este QR en la entrada.', mostrar_qr: true };
  if (tipo === 'bienvenida')      return { ...base, asunto: 'Bienvenido a {{evento}}', encabezado: 'Hola {{nombre}}', cuerpo: 'Gracias por sumarte a {{evento}}. Pronto te enviaremos más detalles.' };
  if (tipo === 'recordatorio_1d') return { ...base, asunto: '{{evento}} es {{fecha}}', encabezado: '¡Ya casi, {{nombre}}!', cuerpo: 'Te recordamos que {{evento}} es {{fecha}} en {{lugar}}. ¡Te esperamos!' };
  if (tipo === 'cancelacion')     return { ...base, asunto: 'Cancelación · {{evento}}', encabezado: 'Hola {{nombre}}', cuerpo: 'Tu boleta de {{tipo_boleta}} para {{evento}} fue cancelada. Si tienes dudas, respóndenos.' };
  return { ...base, asunto: '', encabezado: 'Hola {{nombre}}', cuerpo: '' };
}

export default function EmailsSection({ evento, reload }) {
  const { success, error } = useToast();
  const [tipo, setTipo] = useState('ticket');
  const [data, setData] = useState({});
  const [tipos, setTipos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [segmento, setSegmento] = useState('todos');
  const [enviando, setEnviando] = useState(false);

  /* `null` mientras no se sepa; `false` avisa de que la 0052 no está aplicada
     y de que lo que se guarde se queda en el sitio viejo. */
  const [almacenListo, setAlmacenListo] = useState(null);

  useEffect(() => {
    /* De la TABLA, no de `page_json`. El GET hereda lo que quedara en el sitio
       viejo, así que lo ya escrito sigue apareciendo. */
    emailsApi.plantillas(evento.id)
      .then((d) => {
        setData(d.plantillas || {});
        setAlmacenListo(d.almacenamiento_listo !== false);
      })
      .catch(() => {
        /* Si la petición falla del todo, se vuelve a lo que trae el evento:
           mejor enseñar lo que hay que una pantalla vacía. */
        setData(evento.page_json?.emails || {});
        setAlmacenListo(false);
      });
    ticketsApi.list(evento.id).then(d => setTipos((d.tickets || d.tipos || []).filter(t => (t.descripcion || '') !== 'GESTEK_INVITACION'))).catch(() => {});
  }, [evento.id, evento.page_json]);

  const plantilla = { ...plantillaDefecto(tipo), ...(data[tipo] || {}) };
  const setP = (patch) => setData(d => ({ ...d, [tipo]: { ...plantilla, ...patch } }));

  const persistir = async () => {
    if (almacenListo) {
      /* Sólo el tipo que se está editando: la tabla guarda una fila por tipo, y
         mandar las diez pisaría plantillas que nadie tocó. */
      const { tipo: _t, updated_at: _u, origen: _o, ...limpia } = plantilla;
      await emailsApi.guardarPlantilla(evento.id, tipo, limpia);
      return;
    }
    /* Sin la 0052 aplicada, el sitio viejo sigue siendo el único que hay. */
    await eventosApi.update(evento.id, { page_json: { emails: data } });
    /* Sin esto, el `evento` que tiene el padre (EventWorkspace) se queda con
       el page_json de ANTES de guardar. Si el usuario cambia de pestaña y
       vuelve, este componente se vuelve a montar y relee
       `evento.page_json.emails` desde esa copia vieja — "borrando" en
       pantalla lo que sí quedó guardado en el servidor. */
    await reload?.();
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
      if (r.modo === 'cola') {
        success(`Se encolaron ${r.encolados} de ${r.total} destinatarios — se van a enviar de a poco (hasta ${r.por_hora}/hora).`);
      } else if (r.fallidos > 0) {
        error(`Enviados ${r.enviados} de ${r.total}. Fallaron ${r.fallidos}.`);
      } else {
        success(`Campaña enviada a ${r.enviados} destinatario${r.enviados !== 1 ? 's' : ''}.`);
      }
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setEnviando(false); }
  };

  const meta = TIPOS.find(t => t.id === tipo);

  /* Colores de la previa. El texto se decide por contraste contra el fondo
     elegido, no a ojo: con un centro oscuro, el gris de siempre se vuelve
     ilegible y el organizador aprobaría un correo que nadie puede leer. */
  const fondoPrevia  = /^#[0-9a-f]{6}$/i.test(plantilla.fondo || '') ? plantilla.fondo : '#FFFFFF';
  const claro        = esClaro(fondoPrevia);
  const textoPrevia  = claro ? '#0F172A' : '#F5F3EE';
  const suavePrevia  = claro ? '#475569' : '#CFC9BE';
  const tenuePrevia  = claro ? '#94A3B8' : '#8D8578';
  const filetePrevia = claro ? '#E2E8F0' : 'rgba(255,255,255,0.14)';

  return (
    <div className="space-y-5">
    {/* Desde que correo salen: va arriba porque decide si los correos de este
        evento llevan la direccion del organizador o la de la plataforma. */}
    <BuzonPropio evento={evento} />

    {/* Justo debajo del buzón: quien viene aquí porque «a fulano no le llegó»
        encuentra la respuesta antes de ponerse a revisar plantillas. */}
    <EstadoCola evento={evento} />

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
            {!meta?.soportado && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-200">
                Este tipo de correo todavía no tiene disparador automático en el backend. Puedes escribir y guardar el borrador, pero "Enviarme una prueba" y "Enviar campaña" no están disponibles para él.
              </div>
            )}
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
            {/* Tu diseño, partido en dos.

                Lo que se pide siempre es subir la plantilla entera y escribir
                el texto encima. No se puede: una imagen de fondo bajo el
                texto se cae en Outlook de escritorio y Gmail la recorta en el
                móvil, y un QR sobre una foto pierde lectura el día del
                evento, que es justo cuando no puede fallar.

                Partida en cabecera y pie sí funciona en todos los clientes, y
                el centro sigue siendo texto de verdad: se selecciona, se
                traduce y lo lee un lector de pantalla. */}
            <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Tu plantilla</p>
                <p className="text-[11px] text-text-3 mt-1 leading-relaxed">
                  Sube tu diseño partido en dos: lo de arriba y lo de abajo. El texto y el QR van en medio,
                  sobre el color que elijas. Ancho recomendado: 560&nbsp;px.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Cabecera <span className="lowercase tracking-normal font-normal text-text-3">(arriba)</span></label>
                  <ImagePicker value={plantilla.imagen} onChange={v => setP({ imagen: v })} ownerId={evento.id} placeholder="Cabecera del correo" />
                </div>
                <div>
                  <label className="label">Pie <span className="lowercase tracking-normal font-normal text-text-3">(abajo)</span></label>
                  <ImagePicker value={plantilla.pie_imagen} onChange={v => setP({ pie_imagen: v })} ownerId={evento.id} placeholder="Pie del correo" />
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="label !mb-0">Color del centro</label>
                <input type="color" value={plantilla.fondo || '#12100B'} onChange={e => setP({ fondo: e.target.value })}
                  className="h-9 w-14 rounded-lg border border-border bg-transparent cursor-pointer" />
                <input className="input !h-9 w-32 font-mono text-xs" value={plantilla.fondo || ''}
                  onChange={e => setP({ fondo: e.target.value })} placeholder="#12100B" />
                {plantilla.fondo && (
                  <button type="button" onClick={() => setP({ fondo: '' })}
                    className="text-[11px] text-text-3 hover:text-text-1">Usar el de la marca</button>
                )}
              </div>
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
          {meta?.soportado && (
            <button onClick={enviarPrueba} disabled={enviando || saving} className="btn-secondary">{enviando ? 'Enviando…' : 'Enviarme una prueba'}</button>
          )}
          <button onClick={guardar} disabled={saving} className="btn-primary">{saving ? 'Guardando…' : 'Guardar plantillas'}</button>
        </div>
      </div>

      {/* Vista previa del correo */}
      <div className="lg:sticky lg:top-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Vista previa</p>
        {/* La previa sigue a lo que se sube y al color elegido. Si se quedara
            en blanco fijo diría una cosa y el correo saldría otra — que es
            exactamente lo que hacía la previa del checkout antes de atarla. */}
        <div className="rounded-2xl border border-border overflow-hidden" style={{ background: fondoPrevia, color: textoPrevia }}>
          <div className="px-5 py-3 text-xs border-b truncate"
               style={{ color: tenuePrevia, borderColor: filetePrevia }}>
            {muestra(plantilla.asunto, evento) || '(sin asunto)'}
          </div>
          {/* La cabecera del organizador entera, sin recortar: cortarle el logo
              a la mitad es lo que hace que un correo parezca roto. */}
          {plantilla.imagen && <img src={plantilla.imagen} alt="" className="w-full block" />}
          <div className="p-6 text-center">
            {plantilla.encabezado && <h2 className="text-xl font-bold mb-3">{muestra(plantilla.encabezado, evento)}</h2>}
            {plantilla.cuerpo && <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: suavePrevia }}>{muestra(plantilla.cuerpo, evento)}</p>}
            {/* El QR siempre sobre blanco: es lo único que un lector no perdona. */}
            {plantilla.mostrar_qr && <div className="my-4 mx-auto w-24 h-24 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">QR</div>}
            {plantilla.boton_texto && (
              <div className="mt-5"><span className="inline-block px-5 py-2.5 rounded-full text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>{plantilla.boton_texto}</span></div>
            )}
          </div>
          {plantilla.pie_imagen && <img src={plantilla.pie_imagen} alt="" className="w-full block" />}
          <div className="px-6 py-3 text-center text-[11px]"
               style={{ color: tenuePrevia, borderTop: plantilla.pie_imagen ? 'none' : `1px solid ${filetePrevia}` }}>
            {muestra(plantilla.footer, evento) || `${evento.titulo}`}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

/* Mismo criterio que `esClaro` del servidor (lib/emailPlantillas.js):
   luminancia percibida, no el promedio de los tres canales. El verde pesa seis
   veces más que el azul para el ojo, y promediar da blanco sobre amarillo. */
function esClaro(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return true;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
}

function muestra(txt, evento) {
  if (!txt) return txt;
  return txt
    .replace(/\{\{nombre\}\}/g, 'María')
    .replace(/\{\{evento\}\}/g, evento.titulo || 'tu evento')
    .replace(/\{\{fecha\}\}/g, evento.fecha_inicio ? new Date(evento.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) : 'la fecha')
    .replace(/\{\{tipo_boleta\}\}/g, 'General')
    .replace(/\{\{codigo\}\}/g, 'ABC123');
}
