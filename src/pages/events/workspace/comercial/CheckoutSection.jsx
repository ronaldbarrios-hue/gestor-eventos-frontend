import { useState } from 'react';
import { Link } from 'react-router-dom';
import { eventosApi } from '../../../../api/eventos.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import FormularioTab from '../../tabs/FormularioTab.jsx';

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
      await eventosApi.update(evento.id, { page_json: { ...(evento.page_json || {}), checkout } });
      success('Proceso de compra guardado. Ya aplica en la compra pública.');
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const nCampos = (evento.campos_formulario || []).length;
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
            <div className="card-body">
              <FormularioTab evento={evento} />
            </div>
          </div>
        )}

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

        {/* Términos y validaciones */}
        <div className="grid md:grid-cols-2 gap-5 items-start">
          <div className="card">
            <div className="card-header"><h3 className="text-base font-semibold text-text-1">Términos y consentimiento</h3></div>
            <div className="card-body space-y-3">
              <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
                <input type="checkbox" checked={f.terminos_activo} onChange={e => set({ terminos_activo: e.target.checked })} className="accent-[#8B5CF6]" />
                Exigir aceptación de términos para comprar
              </label>
              {f.terminos_activo && (<>
                <div>
                  <label className="label">Texto del consentimiento</label>
                  <input className="input" value={f.terminos_texto} onChange={e => set({ terminos_texto: e.target.value })} />
                </div>
                <div>
                  <label className="label">Enlace a los términos <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
                  <input className="input" value={f.terminos_url} onChange={e => set({ terminos_url: e.target.value })} placeholder="https://…/terminos" />
                </div>
              </>)}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="text-base font-semibold text-text-1">Validaciones</h3></div>
            <div className="card-body space-y-3">
              <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
                <input type="checkbox" checked={f.requiere_telefono} onChange={e => set({ requiere_telefono: e.target.checked })} className="accent-[#8B5CF6]" />
                Teléfono obligatorio
              </label>
              <div className="grid grid-cols-2 gap-3">
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
        </div>

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
        <PreviewCompra evento={evento} f={f} vista={vista} tienePago={tienePago} />
        <p className="text-xs text-text-3">Así lo ve el comprador en el sitio público.</p>
      </div>
    </div>
  );
}

/* Maqueta viva del modal de compra / confirmación */
function PreviewCompra({ evento, f, vista, tienePago }) {
  const campos = evento.campos_formulario || [];

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
        <p className="text-[10px] uppercase tracking-widest text-text-3 font-semibold">Compra tu boleta</p>
        <p className="text-lg font-bold font-display text-text-1">General</p>
        <p className="text-xl font-bold font-display text-text-1 tabular-nums">$50.000</p>
      </div>
      <CampoFake label="Nombre completo *" />
      <CampoFake label="Email *" />
      <CampoFake label={`Teléfono ${f.requiere_telefono ? '*' : '(opcional)'}`} />
      {campos.map(c => <CampoFake key={c.id} label={`${c.etiqueta}${c.requerido ? ' *' : ''}`} />)}
      {Number(f.edad_minima) > 0 && <CheckFake label={`Confirmo que tengo al menos ${f.edad_minima} años.`} />}
      {f.terminos_activo && <CheckFake label={f.terminos_texto || 'He leído y acepto los términos y condiciones.'} link={f.terminos_url} />}
      {tienePago && (
        <div className="rounded-xl bg-warning/10 border border-warning/25 px-3 py-2 text-[11px] text-text-2 leading-relaxed">
          Pago manual · transfiere a <span className="font-mono text-text-1">{evento.pago_llave || 'tu llave'}</span>
        </div>
      )}
      <div className="pt-1 text-right">
        <span className="inline-block px-4 py-2 rounded-full bg-text-1 text-bg text-xs font-semibold">Confirmar reserva</span>
      </div>
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
