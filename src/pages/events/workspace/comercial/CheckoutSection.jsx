import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventosApi } from '../../../../api/eventos.js';
import { ticketsApi } from '../../../../api/tickets.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import FormularioTab from '../../tabs/FormularioTab.jsx';
import TerminosEvento from './TerminosEvento.jsx';
import { dividirEnModulos, convienePaginar } from '../../../../lib/modulosFormulario.js';

/* Event Experience · Proceso de compra — configura el PASO A PASO:
   1) Datos del comprador (formulario embebido)
   2) Pago (→ Comercial → Pagos)
   3) Confirmación (mensajes + redirección)
   + Términos/consentimiento y validaciones.
   A la derecha, VISTA PREVIA en vivo de lo que ve el comprador.
   Todo se guarda en evento.page_json.checkout. Sin migración. */

const DEFECTO = {
  confirmacion_titulo: '',
  confirmacion_texto : '',
  redirect_url       : '',
  redirect_auto      : false,
  terminos_activo    : false,
  terminos_texto     : 'He leído y acepto los términos y condiciones.',
  terminos_url       : '',
  requiere_telefono  : false,
  edad_minima        : '',
  limite_por_compra  : '',
};

export default function CheckoutSection({ evento }) {
  const { success, error } = useToast();
  const [f, setF] = useState({ ...DEFECTO, ...(evento.page_json?.checkout || {}) });
  const [saving, setSaving] = useState(false);
  const [verForm, setVerForm] = useState(false);
  const [vista, setVista] = useState('compra'); // compra | confirmacion

  const set = (patch) => setF(x => ({ ...x, ...patch }));

  const guardar = async () => {
    setSaving(true);
    try {
      const checkout = {
        ...f,
        edad_minima      : f.edad_minima === '' ? null : Number(f.edad_minima),
        limite_por_compra: f.limite_por_compra === '' ? null : Number(f.limite_por_compra),
      };
      await eventosApi.update(evento.id, { page_json: { checkout } });
      success('Proceso de compra guardado. Ya aplica en la compra pública.');
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  /* La vista previa enseñaba una boleta «General» de $50.000 escrita a mano y
     sólo nombre, correo y teléfono. No era una previsualización: era un dibujo.
     Con una boleta gratis en pantalla decía cincuenta mil pesos, y con veinte
     preguntas configuradas no mostraba ninguna — que es justo lo que se quiere
     revisar antes de abrir la venta.

     `evento.campos_formulario` tampoco venía en el objeto del panel, así que el
     contador del paso 1 decía siempre «sin campos extra». Se piden las dos
     cosas al servidor, que es el que sabe. */
  const [campos, setCampos] = useState([]);
  const [tipos, setTipos] = useState([]);
  /* null = todas las boletas. Es el estado por defecto a propósito. */
  const [tipoSel, setTipoSel] = useState(null);

  /* Si el evento tiene términos propios (evento_legal). La previa los enseñaba
     mirando `f.terminos_activo`, que es la bandera VIEJA que se retiró — o sea
     que nunca los mostraba, justo en la pantalla donde se revisa el registro
     antes de abrir la venta. */
  const [tieneTerminos, setTieneTerminos] = useState(false);

  useEffect(() => {
    let vivo = true;
    if (evento.slug) {
      eventosApi.legalPublico(evento.slug)
        .then(d => { if (vivo) setTieneTerminos(Boolean(d?.tiene_terminos)); })
        .catch(() => {});
    }
    eventosApi.getFormulario(evento.id)
      .then(d => { if (vivo) setCampos(d.campos || []); })
      .catch(() => { /* la previa cae a lo básico, no vale romper la pantalla */ });
    ticketsApi.list(evento.id)
      .then(d => { if (vivo) setTipos((d.tickets || d.ticket_types || []).filter(t => t.activo !== false)); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [evento.id]);

  const nCampos = campos.length;
  const tienePago = Boolean(evento.pago_llave || evento.pago_qr_url);

  return (
    <div className="grid xl:grid-cols-[1fr_minmax(340px,400px)] gap-6 items-start w-full">
      {/* ── Configuración ── */}
      <div className="space-y-5 min-w-0">
        {/* Paso a paso */}
        <div className="grid sm:grid-cols-3 gap-3">
          <Paso n={1} titulo="Datos del comprador"
            desc={nCampos > 0 ? `${nCampos} campo${nCampos !== 1 ? 's' : ''} personalizado${nCampos !== 1 ? 's' : ''} + nombre, email y teléfono` : 'Nombre, email y teléfono (sin campos extra)'}
            accion={<button onClick={() => setVerForm(v => !v)} className="btn-secondary btn-sm">{verForm ? 'Ocultar formulario' : 'Editar formulario'}</button>}
            activo={verForm} />
          <Paso n={2} titulo="Pago"
            desc={tienePago ? 'Bre-B / Mercado Pago configurado' : 'Aún sin método de cobro'}
            accion={<Link to="?s=comercial&t=pagos" className="btn-secondary btn-sm">Configurar pagos</Link>} />
          <Paso n={3} titulo="Confirmación" desc="Mensaje y redirección tras comprar" activo />
        </div>

        {/* Formulario de compra embebido (paso 1) */}
        {verForm && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-base font-semibold text-text-1">Formulario de compra · datos que se piden al comprador</h3>
            </div>
            <div className="card-body space-y-4">
              {/* Elegir la boleta ANTES de editar.

                  Registrar a una persona no es lo mismo que registrar a un
                  miembro del staff o a una empresa que viene con su stand: se
                  les pregunta otra cosa. La base lo soportaba desde siempre
                  —cada pregunta puede ser de una boleta o de todas— pero no
                  había por dónde elegir, así que en la práctica el formulario
                  era uno solo para todos.

                  «Todas» es lo primero y es el caso normal: la mayoría de
                  eventos pregunta lo mismo a todo el mundo, y obligarlos a
                  elegir boleta para escribir dos preguntas sería peor. */}
              {tipos.length > 1 && (
                <div className="rounded-2xl border border-border bg-surface/40 p-3">
                  <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">
                    ¿A quién le estás editando el registro?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <BotonBoleta activo={!tipoSel} onClick={() => setTipoSel(null)}
                      etiqueta="Todas las boletas" n={campos.filter(c => !c.ticket_type_id).length} />
                    {tipos.map(t => (
                      <BotonBoleta key={t.id} activo={tipoSel === t.id} onClick={() => setTipoSel(t.id)}
                        etiqueta={t.nombre}
                        n={campos.filter(c => !c.ticket_type_id || c.ticket_type_id === t.id).length} />
                    ))}
                  </div>
                  <p className="text-[11px] text-text-3 mt-2 leading-relaxed">
                    {tipoSel
                      ? 'Ves lo que se le pide a esta boleta: lo suyo y lo que vale para todas. Lo que agregues aquí será sólo suyo.'
                      : 'Las preguntas que agregues valen para todas las boletas.'}
                  </p>
                </div>
              )}

              <FormularioTab evento={evento} ticketTypeId={tipoSel}
                requiereTelefono={f.requiere_telefono}
                onRequiereTelefono={v => set({ requiere_telefono: v })} />
            </div>
          </div>
        )}

        {/* Reglas de la COMPRA, no del formulario.

            Aquí vivía además «Teléfono obligatorio», y era la duplicación más
            confusa de esta pantalla: preguntaba por un campo que se pide en el
            paso 1 del registro y que desde aquí no se veía. Ese interruptor se
            movió encima de la fila del teléfono, dentro del editor.

            Lo que queda son las dos cosas que sí son reglas de compra y no
            preguntas: hasta qué edad se puede comprar y cuántas boletas por
            compra. */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-text-1">Reglas de la compra</h3>
          </div>
          <div className="card-body space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 max-w-md">
              <div>
                <label className="label">Edad mínima</label>
                <input type="number" min={0} className="input" value={f.edad_minima} onChange={e => set({ edad_minima: e.target.value })} placeholder="Sin límite" />
              </div>
              <div>
                <label className="label">Máx. por compra</label>
                <input type="number" min={1} className="input" value={f.limite_por_compra} onChange={e => set({ limite_por_compra: e.target.value })} placeholder="Sin límite" />
              </div>
            </div>
            <p className="text-xs text-text-3">La edad mínima pide una confirmación al comprador. El máximo por compra se aplicará cuando el checkout permita elegir cantidad.</p>
          </div>
        </div>

        {/* Términos del evento.

            Va aquí, entre los datos que se piden y la confirmación, porque es
            el orden real: se pide información personal, se dice bajo qué
            condiciones, y sólo entonces se confirma. Estaba construido en el
            servidor desde la migración 0059 y el formulario público ya
            enlazaba a él; lo que faltaba era dónde escribirlo, y por eso había
            cero eventos con términos. */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-text-1">Términos y datos personales</h3>
          </div>
          <div className="card-body">
            <TerminosEvento evento={evento} />
          </div>
        </div>

        {/* Confirmación */}
        <div className="card">
          <div className="card-header"><h3 className="text-base font-semibold text-text-1">Confirmación post-compra</h3></div>
          <div className="card-body space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="label">Título de confirmación</label>
                <input className="input" value={f.confirmacion_titulo} onChange={e => set({ confirmacion_titulo: e.target.value })} placeholder="¡Reserva confirmada!" />
              </div>
              <div>
                <label className="label">Redirección tras comprar <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
                <input className="input" value={f.redirect_url} onChange={e => set({ redirect_url: e.target.value })} placeholder="https://tu-sitio.com/gracias" />
              </div>
            </div>
            <div>
              <label className="label">Mensaje de confirmación</label>
              <textarea rows={2} className="input !h-auto resize-none" value={f.confirmacion_texto} onChange={e => set({ confirmacion_texto: e.target.value })}
                placeholder="Muestra este QR en la entrada del evento. También puedes mostrar el código." />
            </div>
            {f.redirect_url && (
              <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
                <input type="checkbox" checked={f.redirect_auto} onChange={e => set({ redirect_auto: e.target.checked })} className="accent-[#8B5CF6]" />
                Redirigir automáticamente tras unos segundos
              </label>
            )}
          </div>
        </div>

        {/* El bloque «Términos y consentimiento» vivía aquí y se retiró.

            Era el mecanismo de antes de la migración 0059: una casilla, un
            texto y una URL externa, guardados en `page_json.checkout`. La 0059
            trajo `evento_legal` —documentos propios, con versión y constancia
            de aceptación— y el checkout público ya lo prefiere. Tener los dos
            en la misma pantalla obligaba a adivinar cuál manda, y hacía que se
            escribieran términos en el sitio que no guarda constancia.

            Se comprobó antes de quitarlo: CERO de los 31 eventos tenían el
            viejo activo, así que nadie pierde su casilla. El respaldo sigue en
            `AceptarTerminos` para el evento que llegara importado con la
            bandera puesta; lo que desaparece es el segundo sitio donde
            escribirlo. */}

        <div className="flex justify-end">
          <button onClick={guardar} disabled={saving} className="btn-primary">{saving ? 'Guardando…' : 'Guardar proceso de compra'}</button>
        </div>
      </div>

      {/* ── Vista previa en vivo ── */}
      <div className="xl:sticky xl:top-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Vista previa</p>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {[['compra', 'Compra'], ['confirmacion', 'Confirmación']].map(([v, l]) => (
              <button key={v} onClick={() => setVista(v)}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${vista === v ? 'bg-accent text-white' : 'text-text-3 hover:text-text-1'}`}>{l}</button>
            ))}
          </div>
        </div>
        <PreviewCompra evento={evento} f={f} vista={vista} tienePago={tienePago} campos={campos} tipos={tipos} tipoSel={tipoSel} tieneTerminos={tieneTerminos} />
        <p className="text-xs text-text-3">Así lo ve el comprador en el sitio público.</p>
      </div>
    </div>
  );
}

/* Maqueta viva del modal de compra / confirmación */
function PreviewCompra({ evento, f, vista, tienePago, campos = [], tipos = [], tipoSel = null, tieneTerminos = false }) {
  /* La previa sigue a la boleta que se está editando. Si no hay ninguna
     elegida, la primera activa — que es la que el comprador ve arriba.

     Si no hay boletas se dice, en vez de inventar una: un evento sin boletas
     no vende, y esconderlo detrás de una maqueta bonita es lo que hizo que
     nadie lo notara. */
  const tipo = (tipoSel && tipos.find(t => t.id === tipoSel)) || tipos[0] || null;
  const precio = Number(tipo?.precio || 0);
  const moneda = tipo?.currency || evento.currency || 'COP';

  /* Las preguntas que le tocan a ESA boleta, con la misma regla que aplica el
     checkout público: las suyas más las que valen para todas. Si aquí se
     mostraran todas, la previa enseñaría al comprador de «General» preguntas
     que son del staff. */
  const suyos = tipo
    ? campos.filter(c => !c.ticket_type_id || c.ticket_type_id === tipo.id)
    : campos;

  /* Mismos módulos que la página pública, calculados con el mismo código. */
  const modulos = dividirEnModulos(suyos);
  const paginado = convienePaginar(modulos, suyos.length);
  const [paso, setPaso] = useState(0);
  const pasos = paginado ? ['Tus datos', ...modulos.map(m => m.titulo)] : [];
  const enUltimo = !paginado || paso >= pasos.length - 1;
  const delPaso = paginado ? (modulos[paso - 1]?.campos || []) : suyos;

  if (vista === 'confirmacion') {
    return (
      <div className="rounded-2xl border border-border-2 bg-surface p-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-success/15 border border-success/30 mx-auto mb-3 flex items-center justify-center text-success text-xl">✓</div>
        <p className="text-lg font-bold font-display text-text-1">{f.confirmacion_titulo?.trim() || '¡Reserva confirmada!'}</p>
        <p className="text-sm text-text-2 mt-2 leading-relaxed">{f.confirmacion_texto?.trim() || 'Muestra este QR en la entrada del evento. También puedes mostrar el código.'}</p>
        <div className="bg-white rounded-xl w-28 h-28 mx-auto my-4 flex items-center justify-center text-[10px] text-slate-400">QR</div>
        <div className="rounded-xl border border-border-2 bg-surface-2 px-3 py-2 mb-3">
          <p className="text-[9px] uppercase tracking-widest text-text-3">Código</p>
          <p className="font-mono text-base font-bold text-text-1 tracking-widest">ABC123</p>
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="px-4 py-2 rounded-full bg-text-1 text-bg text-xs font-semibold">Listo</span>
          {f.redirect_url && <span className="px-4 py-2 rounded-full border border-border-2 text-xs font-semibold text-text-1">Continuar →</span>}
        </div>
        {f.redirect_url && f.redirect_auto && <p className="text-[10px] text-text-3 mt-2">Te redirigiremos automáticamente…</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-2 bg-surface p-5 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-3 font-semibold">
          {precio === 0 ? 'Reserva tu cupo' : 'Compra tu boleta'}
        </p>
        <p className="text-lg font-bold font-display text-text-1">{tipo?.nombre || 'Sin boletas creadas'}</p>
        <p className="text-xl font-bold font-display text-text-1 tabular-nums">
          {!tipo ? '—' : precio === 0 ? 'Gratis' : `$${precio.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
        </p>
        {!tipo && <p className="text-[11px] text-warning-light mt-1">Crea una boleta en Comercial → Boletas o nadie podrá registrarse.</p>}
        {tipos.length > 1 && <p className="text-[10px] text-text-3 mt-0.5">y {tipos.length - 1} tipo{tipos.length > 2 ? 's' : ''} más</p>}
      </div>

      {paginado && (
        <div>
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <p className="text-xs font-semibold text-text-1 truncate">{pasos[paso]}</p>
            {/* Adelante y atrás: revisar un registro de seis pasos dando la
                vuelta entera para volver al anterior es peor que no revisarlo. */}
            <span className="flex items-center gap-1 flex-shrink-0">
              <button type="button" onClick={() => setPaso(p => Math.max(0, p - 1))} disabled={paso === 0}
                aria-label="Paso anterior"
                className="w-5 h-5 rounded border border-border text-text-3 hover:text-text-1 disabled:opacity-30 leading-none">←</button>
              <span className="text-[10px] text-text-3 tabular-nums whitespace-nowrap">{paso + 1}/{pasos.length}</span>
              <button type="button" onClick={() => setPaso(p => Math.min(pasos.length - 1, p + 1))} disabled={paso >= pasos.length - 1}
                aria-label="Paso siguiente"
                className="w-5 h-5 rounded border border-border text-text-3 hover:text-text-1 disabled:opacity-30 leading-none">→</button>
            </span>
          </div>
          <div className="flex gap-1">
            {pasos.map((t, i) => (
              <span key={t + i} className={`h-1 flex-1 rounded-full ${i <= paso ? 'bg-primary' : 'bg-surface-2'}`} />
            ))}
          </div>
        </div>
      )}

      {(!paginado || paso === 0) && <>
        <CampoFake label="Nombre completo *" />
        <CampoFake label="Email *" />
        <CampoFake label={`Teléfono ${f.requiere_telefono ? '*' : '(opcional)'}`} />
      </>}
      {delPaso.map(c => <CampoFake key={c.id} label={`${c.etiqueta}${c.requerido ? ' *' : ''}`} />)}

      {enUltimo && <>
        {Number(f.edad_minima) > 0 && <CheckFake label={`Confirmo que tengo al menos ${f.edad_minima} años.`} />}
        {/* El consentimiento REAL, el de evento_legal. Es obligatorio cuando el
            organizador publicó sus términos, y es lo último que ve el
            comprador antes de confirmar — así que aquí va, y no en una tarjeta
            aparte tres bloques más abajo. */}
        {tieneTerminos
          ? <CheckFake label="He leído y acepto los términos y condiciones y la política de tratamiento de datos de este evento. *" />
          : <p className="text-[10px] text-text-3 leading-relaxed">Al continuar aceptas los términos de GESTEK. Escribe los tuyos abajo y esta casilla pasa a ser obligatoria.</p>}
        {f.terminos_activo && <CheckFake label={f.terminos_texto || 'He leído y acepto los términos y condiciones.'} link={f.terminos_url} />}
        {tienePago && precio > 0 && (
          <div className="rounded-xl bg-warning/10 border border-warning/25 px-3 py-2 text-[11px] text-text-2 leading-relaxed">
            Pago manual · transfiere a <span className="font-mono text-text-1">{evento.pago_llave || 'tu llave'}</span>
          </div>
        )}
      </>}

      <div className="pt-1 text-right">
        <span className="inline-block px-4 py-2 rounded-full bg-text-1 text-bg text-xs font-semibold">
          {!enUltimo ? 'Continuar' : precio === 0 ? 'Confirmar reserva' : 'Ir a pagar'}
        </span>
      </div>
      <p className="text-[10px] text-text-3">
        {moneda !== 'COP' && precio > 0 ? `Precios en ${moneda}. ` : ''}
        {suyos.length === 0 ? 'Sin preguntas propias: sólo se piden nombre, correo y teléfono.' : `${suyos.length} pregunta${suyos.length !== 1 ? 's' : ''} para esta boleta.`}
      </p>
    </div>
  );
}

function CampoFake({ label }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-text-3 font-semibold mb-1">{label}</p>
      <div className="h-9 rounded-xl border border-border bg-surface-2" />
    </div>
  );
}
function CheckFake({ label, link }) {
  return (
    <div className="flex items-start gap-2 text-[11px] text-text-2 leading-snug">
      <span className="w-3.5 h-3.5 rounded border border-border-2 flex-shrink-0 mt-0.5" />
      <span>{label}{link && <span className="text-primary-light"> Ver términos</span>}</span>
    </div>
  );
}

/* Píldora de boleta, con el número de preguntas que le tocan. El conteo va
   dentro porque es la única forma de ver de un vistazo cuál está sin armar:
   «Staff · 0» es un problema que se lee sin abrir nada. */
function BotonBoleta({ activo, onClick, etiqueta, n }) {
  return (
    <button onClick={onClick} aria-pressed={activo}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors
                  ${activo
                    ? 'border-primary bg-primary/10 text-text-1'
                    : 'border-border-2 text-text-2 hover:text-text-1 hover:bg-surface-2'}`}>
      {etiqueta}
      <span className={n === 0 ? 'text-warning' : 'text-text-3'}>· {n}</span>
    </button>
  );
}

function Paso({ n, titulo, desc, accion, activo }) {
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-2 ${activo ? 'border-accent/50 bg-accent/5' : 'border-border bg-surface/40'}`}>
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activo ? 'bg-accent text-white' : 'bg-surface-2 text-text-2'}`}>{n}</span>
        <p className="text-sm font-semibold text-text-1">{titulo}</p>
      </div>
      <p className="text-xs text-text-3 flex-1">{desc}</p>
      {accion}
    </div>
  );
}
