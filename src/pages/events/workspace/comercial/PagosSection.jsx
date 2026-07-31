import { useState } from 'react';
import { eventosApi } from '../../../../api/eventos.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import ImagePicker from '../../../../components/ui/ImagePicker.jsx';
import MercadoPagoConnect from '../../../../components/ui/MercadoPagoConnect.jsx';
import WompiConnect from '../../../../components/ui/WompiConnect.jsx';

/* Comercial · Pagos del evento — configuración REAL de cobro:
   llave Bre-B + QR + instrucciones (van al checkout público) y
   Mercado Pago (conexión de cuenta, global en Ajustes). */
export default function PagosSection({ evento, reload }) {
  const { success, error } = useToast();
  const [f, setF] = useState({
    pago_llave        : evento.pago_llave || '',
    pago_qr_url       : evento.pago_qr_url || '',
    pago_instrucciones: evento.pago_instrucciones || '',
  });
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    setSaving(true);
    try {
      await eventosApi.update(evento.id, f);
      success('Configuración de pagos guardada. Ya aparece en el checkout público.');
      reload?.();
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start max-w-5xl">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="text-base font-semibold text-text-1">Bre-B (transferencia directa)</h3>
            <p className="text-xs text-text-3 mt-0.5">El dinero va directo del asistente a tu cuenta — GESTEK no lo toca.</p>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div>
            <label className="label">Llave Bre-B</label>
            <input className="input font-mono" value={f.pago_llave} onChange={e => setF(x => ({ ...x, pago_llave: e.target.value }))} placeholder="@tullave, celular o correo" />
          </div>
          <div>
            <label className="label">Código QR de tu banco (opcional)</label>
            <ImagePicker value={f.pago_qr_url} onChange={v => setF(x => ({ ...x, pago_qr_url: v }))} ownerId={evento.id} placeholder="URL del QR o subir" />
          </div>
          <div>
            <label className="label">Instrucciones para el comprador</label>
            <textarea rows={3} className="input !h-auto resize-none" value={f.pago_instrucciones}
              onChange={e => setF(x => ({ ...x, pago_instrucciones: e.target.value }))}
              placeholder="Ej. Transfiere el valor exacto y guarda el comprobante; validamos y te llega la boleta por correo." />
          </div>
          <button onClick={guardar} disabled={saving} className="btn-primary btn-sm">{saving ? 'Guardando…' : 'Guardar configuración'}</button>
        </div>
      </div>

      <div className="space-y-5">
        <WompiConnect />
        <MercadoPagoConnect />
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-1 mb-1.5">¿Cómo se cobra?</h3>
          <p className="text-sm text-text-2 leading-relaxed">Con Mercado Pago el pago es online y la boleta se emite sola al confirmarse. Con Bre-B el comprador transfiere directo a tu llave y tú validas la entrada; ideal para eventos que no quieren pasarela. La cuenta MP se conecta una vez y aplica a todos tus eventos.</p>
        </div>
      </div>
    </div>
  );
}
