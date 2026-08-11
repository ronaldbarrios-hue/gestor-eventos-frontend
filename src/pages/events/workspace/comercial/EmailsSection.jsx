import { useState, useEffect, useRef, useCallback } from 'react';
import { ticketsApi } from '../../../../api/tickets.js';
import { emailsApi } from '../../../../api/emails.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import ImagePicker from '../../../../components/ui/ImagePicker.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';

/* Event Experience · Emails — editor de las plantillas de correo del evento.

   El catálogo de tipos y variables lo manda el backend
   (lib/emailPlantillas.js), que es el mismo módulo que renderiza los envíos
   automáticos. Antes esta pantalla tenía su propia lista de cinco tipos
   —confirmacion, bienvenida, recordatorio, cancelacion, personalizado— que
   ningún envío del servidor leía: se diseñaba un correo y llegaba otro.

   La vista previa también era un dibujo aparte hecho con clases de Tailwind,
   con un botón azul y violeta que el correo real no tenía. Ahora se pide el
   HTML al backend y se pinta dentro de un iframe: es exactamente lo que sale
   por SMTP, con la marca del evento. */

const AUTOGUARDADO_MS = 700;

export default function EmailsSection({ evento }) {
  const { success, error } = useToast();

  const [cargando, setCargando]   = useState(true);
  const [tipos, setTipos]         = useState([]);
  const [variables, setVariables] = useState([]);
  const [plantillas, setPlantillas] = useState({});
  const [diagnostico, setDiagnostico] = useState(null);
  const [almacenamientoListo, setAlmacenamientoListo] = useState(true);

  const [tipo, setTipo]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [segmento, setSegmento] = useState('todos');
  const [tiposBoleta, setTiposBoleta] = useState([]);

  const [preview, setPreview] = useState({ html: '', asunto: '', cargando: false });
  const [envios, setEnvios]   = useState(null);

  const cuerpoRef = useRef(null);

  /* ── Carga inicial ── */
  useEffect(() => {
    let vivo = true;
    setCargando(true);
    emailsApi.catalogo(evento.id)
      .then(d => {
        if (!vivo) return;
        setTipos(d.tipos || []);
        setVariables(d.variables || []);
        setPlantillas(d.plantillas || {});
        setDiagnostico(d.diagnostico || null);
        setAlmacenamientoListo(d.almacenamiento_listo !== false);
        setTipo(t => t || d.tipos?.[0]?.id || null);
      })
      .catch(e => error(e.response?.data?.error || 'No se pudo cargar el catálogo de correos.'))
      .finally(() => { if (vivo) setCargando(false); });

    ticketsApi.list(evento.id)
      .then(d => setTiposBoleta((d.tickets || []).filter(t => (t.descripcion || '') !== 'GESTEK_INVITACION')))
      .catch(() => {});

    return () => { vivo = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [evento.id]);

  const meta = tipos.find(t => t.id === tipo) || null;
  const plantilla = plantillas[tipo] || {};

  /* Solo las variables que este tipo declara: ofrecer {{tarea}} en el correo de
     una boleta era invitar a escribir algo que sale vacío. */
  const variablesDelTipo = variables.filter(v => !meta || meta.variables.includes(v.id));

  const setP = (patch) => setPlantillas(p => ({ ...p, [tipo]: { ...(p[tipo] || {}), ...patch } }));

  /* ── Vista previa, con el HTML real ──
     Se pide con retardo para no lanzar una petición por tecla. */
  const pedirPreview = useCallback(() => {
    if (!tipo) return;
    setPreview(p => ({ ...p, cargando: true }));
    emailsApi.previsualizar(evento.id, { tipo, plantilla: plantillas[tipo] || {} })
      .then(d => setPreview({ html: d.html || '', asunto: d.asunto || '', cargando: false }))
      .catch(() => setPreview(p => ({ ...p, cargando: false })));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [evento.id, tipo, plantillas]);

  useEffect(() => {
    if (!tipo) return;
    const t = setTimeout(pedirPreview, AUTOGUARDADO_MS);
    return () => clearTimeout(t);
  }, [tipo, plantillas, pedirPreview]);

  /* ── Acciones ── */
  const guardar = async () => {
    if (!tipo) return;
    setSaving(true);
    try {
      const r = await emailsApi.guardar(evento.id, tipo, plantilla);
      setPlantillas(p => ({ ...p, [tipo]: r.plantilla }));
      success('Plantilla guardada.');
    } catch (e) {
      error(e.response?.data?.error || e.message);
    } finally { setSaving(false); }
  };

  const restablecer = async () => {
    if (!tipo) return;
    setSaving(true);
    try {
      await emailsApi.restablecer(evento.id, tipo);
      setPlantillas(p => { const n = { ...p }; delete n[tipo]; return n; });
      success('Volvió al texto por defecto.');
    } catch (e) {
      error(e.response?.data?.error || e.message);
    } finally { setSaving(false); }
  };

  const enviarPrueba = async () => {
    setEnviando(true);
    try {
      /* Se guarda antes: el backend lee la plantilla de la base, no del body. */
      if (almacenamientoListo) await emailsApi.guardar(evento.id, tipo, plantilla).catch(() => {});
      const r = await emailsApi.prueba(evento.id, tipo);
      success(`Correo de prueba enviado a ${r.enviado_a}.`);
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setEnviando(false); }
  };

  const enviarCampana = async () => {
    setEnviando(true);
    try {
      if (almacenamientoListo) await emailsApi.guardar(evento.id, tipo, plantilla).catch(() => {});
      const r = await emailsApi.enviar(evento.id, { tipo, audiencia: segmento });
      if (r.fallidos > 0) error(`Enviados ${r.enviados} de ${r.total}. Fallaron ${r.fallidos}.`);
      else success(`Enviado a ${r.enviados} destinatario${r.enviados !== 1 ? 's' : ''}.`);
      if (envios !== null) verEnvios();
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setEnviando(false); }
  };

  const probarConexion = async () => {
    try {
      const d = await emailsApi.diagnostico(evento.id);
      setDiagnostico(d);
      if (d.configurado) success(`Proveedor activo: ${ETIQUETA_PROVEEDOR[d.proveedor] || d.proveedor}.`);
      else error(d.aviso);
    } catch (e) { error(e.response?.data?.error || e.message); }
  };

  const verEnvios = async () => {
    try {
      const d = await emailsApi.envios(evento.id, { limit: 50 });
      setEnvios(d.envios || []);
      if (d.almacenamiento_listo === false) setAlmacenamientoListo(false);
    } catch (e) { error(e.response?.data?.error || e.message); }
  };

  /* Inserta la variable donde está el cursor, no al final del texto. */
  const insertarVar = (id) => {
    const marca = `{{${id}}}`;
    const el = cuerpoRef.current;
    const actual = plantilla.cuerpo ?? meta?.defaults?.cuerpo ?? '';
    if (!el) { setP({ cuerpo: `${actual}${marca}` }); return; }
    const ini = el.selectionStart ?? actual.length;
    const fin = el.selectionEnd ?? ini;
    setP({ cuerpo: actual.slice(0, ini) + marca + actual.slice(fin) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(ini + marca.length, ini + marca.length);
    });
  };

  if (cargando) return <div className="card p-8"><Spinner size="md" /></div>;
  if (!meta) return <div className="card p-6"><p className="text-sm text-text-2">No se pudo cargar el catálogo de correos.</p></div>;

  /* El valor que se muestra: lo guardado, o el texto por defecto del tipo como
     placeholder para que se vea qué va a salir sin tocar nada. */
  const val = (k) => plantilla[k] ?? '';
  const ph  = (k) => meta.defaults?.[k] || '';

  return (
    <div className="space-y-4">
      {/* Estado del proveedor y de la migración */}
      <Avisos
        diagnostico={diagnostico}
        almacenamientoListo={almacenamientoListo}
        onProbar={probarConexion}
      />

      <div className="grid lg:grid-cols-[248px_1fr_360px] gap-5 items-start">
        {/* Tipos */}
        <aside className="rounded-2xl border border-border bg-surface/60 overflow-hidden">
          <p className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-3 border-b border-border">
            Tipos de correo
          </p>
          <ul className="p-2 space-y-0.5 max-h-[520px] overflow-y-auto">
            {tipos.map(t => {
              const personalizada = Boolean(plantillas[t.id]);
              return (
                <li key={t.id}>
                  <button onClick={() => setTipo(t.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${tipo === t.id ? 'bg-accent/10 border border-accent/40' : 'hover:bg-surface-2 border border-transparent'}`}>
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-medium flex-1 min-w-0 ${tipo === t.id ? 'text-text-1' : 'text-text-2'}`}>{t.label}</p>
                      {personalizada && <span title="Tiene texto propio" className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-text-3 leading-snug mt-0.5">{t.descripcion}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Editor */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-text-1 flex-1 min-w-0">{meta.label}</h3>
              {meta.automatico
                ? <span className="badge badge-green text-[10px]">Lo envía el sistema</span>
                : <span className="badge badge-purple text-[10px]">Lo envías tú</span>}
            </div>
            <div className="card-body space-y-4">
              <p className="text-xs text-text-3 leading-relaxed">
                Lo que dejes vacío usa el texto por defecto que se muestra en gris.
              </p>

              <div>
                <label className="label">Asunto</label>
                <input className="input" value={val('asunto')} placeholder={ph('asunto')}
                  onChange={e => setP({ asunto: e.target.value })} />
              </div>

              <div>
                <label className="label">Encabezado</label>
                <input className="input" value={val('encabezado')} placeholder={ph('encabezado')}
                  onChange={e => setP({ encabezado: e.target.value })} />
              </div>

              <div>
                <label className="label">Cuerpo</label>
                <textarea ref={cuerpoRef} rows={6} className="input !h-auto resize-y"
                  value={val('cuerpo')} placeholder={ph('cuerpo')}
                  onChange={e => setP({ cuerpo: e.target.value })} />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {variablesDelTipo.map(v => (
                    <button key={v.id} onClick={() => insertarVar(v.id)}
                      title={`${v.label} — ej. ${v.ejemplo}`}
                      className="px-2 py-1 rounded-md bg-surface-2 text-[11px] font-mono text-text-2 hover:text-text-1 transition-colors">
                      {`{{${v.id}}}`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-text-3 mt-1.5">
                  Se insertan donde tengas el cursor. Solo se ofrecen las que este correo puede rellenar.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Texto del botón <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
                  <input className="input" value={val('boton_texto')} placeholder={ph('boton_texto') || 'Ver mi boleta'}
                    onChange={e => setP({ boton_texto: e.target.value })} />
                </div>
                <div>
                  <label className="label">Enlace del botón</label>
                  <input className="input font-mono text-xs" value={val('boton_url')}
                    placeholder="Si lo dejas vacío usa el enlace del evento"
                    onChange={e => setP({ boton_url: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label">Imagen / banner <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
                <ImagePicker value={val('imagen')} onChange={v => setP({ imagen: v })} ownerId={evento.id} placeholder="Banner del correo" />
                <p className="text-[11px] text-text-3 mt-1.5">Sin imagen se usa la portada del evento.</p>
              </div>

              <div>
                <label className="label">Pie de página <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
                <input className="input" value={val('footer')} placeholder={`Enviado por ${evento.titulo || 'tu evento'}.`}
                  onChange={e => setP({ footer: e.target.value })} />
              </div>

              {/* El QR no es una casilla: lo lleva el tipo que lo necesita. Antes
                  había un "Incluir QR de la boleta" que no cambiaba nada. */}
              {meta.conQr && (
                <p className="text-xs text-text-3 border-l-2 border-border pl-3 leading-relaxed">
                  Este correo lleva siempre el QR y el código de la boleta: es lo que se
                  escanea en la entrada.
                </p>
              )}

              {meta.automatico && (
                <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
                  <input type="checkbox" checked={plantilla.activo !== false}
                    onChange={e => setP({ activo: e.target.checked })} className="accent-accent" />
                  Enviar este correo automáticamente
                </label>
              )}
            </div>
          </div>

          {/* Destinatarios: solo para los que manda el organizador */}
          {!meta.automatico && (
            <div className="card">
              <div className="card-header"><h3 className="text-base font-semibold text-text-1">Destinatarios</h3></div>
              <div className="card-body space-y-3">
                <select className="input" value={segmento} onChange={e => setSegmento(e.target.value)}>
                  <option value="todos">Todos los asistentes</option>
                  <option value="equipo">Colaboradores (equipo del evento)</option>
                  {tiposBoleta.map(t => <option key={t.id} value={`tipo:${t.id}`}>Asistentes con boleta: {t.nombre}</option>)}
                </select>
                <button onClick={enviarCampana} disabled={enviando || !diagnostico?.configurado} className="btn-primary btn-sm">
                  {enviando ? 'Enviando…' : 'Enviar'}
                </button>
                <p className="text-xs text-text-3">Máximo 500 destinatarios por envío.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 flex-wrap">
            <button onClick={verEnvios} className="btn-ghost btn-sm">Ver últimos envíos</button>
            {plantillas[tipo] && (
              <button onClick={restablecer} disabled={saving} className="btn-ghost btn-sm">Volver al texto por defecto</button>
            )}
            <button onClick={enviarPrueba} disabled={enviando || saving || !diagnostico?.configurado} className="btn-secondary">
              {enviando ? 'Enviando…' : 'Enviarme una prueba'}
            </button>
            <button onClick={guardar} disabled={saving} className="btn-primary">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>

          {envios !== null && <TablaEnvios envios={envios} />}
        </div>

        {/* Vista previa: el HTML real, en un iframe */}
        <div className="lg:sticky lg:top-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Vista previa</p>
            {preview.cargando && <span className="text-[11px] text-text-3">actualizando…</span>}
          </div>
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-2/60 border-b border-border">
              <p className="text-[11px] text-text-3">Asunto</p>
              <p className="text-sm text-text-1 truncate">{preview.asunto || '(sin asunto)'}</p>
            </div>
            {preview.html ? (
              <iframe
                title="Vista previa del correo"
                /* sandbox sin allow-scripts: es HTML de correo, no debe ejecutar
                   nada, y así un banner con script tampoco corre aquí. */
                sandbox=""
                srcDoc={preview.html}
                className="w-full bg-white"
                style={{ height: '620px', border: 0 }}
              />
            ) : (
              <div className="p-8 text-center"><Spinner size="sm" /></div>
            )}
          </div>
          <p className="text-[11px] text-text-3 leading-relaxed">
            Es el HTML que sale por correo, con la marca del evento y datos de ejemplo.
            La marca se cambia en el editor de la página pública.
          </p>
        </div>
      </div>
    </div>
  );
}

const ETIQUETA_PROVEEDOR = {
  cpanel_smtp: 'SMTP de cPanel',
  gmail_oauth: 'Gmail con OAuth2',
  resend     : 'Resend',
};

function Avisos({ diagnostico, almacenamientoListo, onProbar }) {
  return (
    <div className="space-y-2">
      {!almacenamientoListo && (
        <div className="rounded-2xl bg-warning/10 border border-warning/25 px-4 py-3">
          <p className="text-sm text-text-1 font-medium">Falta aplicar la migración 0052</p>
          <p className="text-xs text-text-2 mt-0.5 leading-relaxed">
            Puedes ver y probar los correos, pero no guardar cambios: la tabla de
            plantillas todavía no existe. Aplica
            <code className="mx-1 font-mono text-[11px]">db/migrations/0052_email_plantillas.sql</code>
            en la base de datos.
          </p>
        </div>
      )}

      {diagnostico && !diagnostico.configurado && (
        <div className="rounded-2xl bg-danger/10 border border-danger/25 px-4 py-3">
          <p className="text-sm text-text-1 font-medium">No hay proveedor de correo configurado</p>
          <p className="text-xs text-text-2 mt-0.5 leading-relaxed">
            Los envíos se descartan en silencio: una boleta se compra bien y el correo
            no sale. Rellena en el servidor las variables de cPanel, el OAuth de Gmail o
            <code className="mx-1 font-mono text-[11px]">RESEND_API_KEY</code>.
          </p>
        </div>
      )}

      {diagnostico?.configurado && (
        <div className="rounded-2xl border border-border bg-surface/40 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-text-2">
            Enviando por <strong className="text-text-1">{ETIQUETA_PROVEEDOR[diagnostico.proveedor] || diagnostico.proveedor}</strong>
            {diagnostico.remitente && <> como <span className="font-mono text-[11px]">{diagnostico.remitente}</span></>}
            {!diagnostico.frontend_url && (
              <span className="text-warning"> · falta FRONTEND_URL: los enlaces de los correos apuntarán al dominio por defecto</span>
            )}
          </p>
          <button onClick={onProbar} className="btn-ghost btn-sm flex-shrink-0">Probar conexión</button>
        </div>
      )}
    </div>
  );
}

function TablaEnvios({ envios }) {
  if (envios.length === 0) {
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-text-3">Todavía no se ha registrado ningún envío.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[520px]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-text-3 border-b border-border bg-surface/60">
            <th className="px-4 py-2.5 font-semibold">Destinatario</th>
            <th className="px-4 py-2.5 font-semibold">Tipo</th>
            <th className="px-4 py-2.5 font-semibold">Resultado</th>
            <th className="px-4 py-2.5 font-semibold">Cuándo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {envios.map(e => (
            <tr key={e.id}>
              <td className="px-4 py-2.5 text-text-2 font-mono text-xs">{e.destinatario}</td>
              <td className="px-4 py-2.5 text-text-3 text-xs">{e.tipo}</td>
              <td className="px-4 py-2.5">
                {e.ok
                  ? <span className="text-success text-xs">Enviado</span>
                  : <span className="text-danger text-xs" title={e.motivo || ''}>Falló{e.motivo ? ` · ${e.motivo}` : ''}</span>}
              </td>
              <td className="px-4 py-2.5 text-text-3 text-xs">
                {new Date(e.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
