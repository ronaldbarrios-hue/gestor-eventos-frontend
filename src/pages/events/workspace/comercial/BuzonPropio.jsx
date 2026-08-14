import { useEffect, useState } from 'react';
import client from '../../../../api/client.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';

/* El buzón propio del organizador para ESTE evento.

   Sin esto, los correos salen con el remitente de la plataforma. Conectando su
   buzón salen de su cuenta de verdad: el `From` es suyo, la autenticación ya
   es correcta y no hace falta tocar el DNS de nadie.

   Lo que hay que decir sin rodeos, y por eso está en pantalla y no sólo en la
   documentación: esto hereda los topes de su proveedor. Gmail gratis ~500 al
   día, Workspace ~2.000, un buzón de cPanel 200 por hora. Para un evento de
   miles de asistentes no alcanza. */

const api = {
  ver    : (id)       => client.get(`/eventos/${id}/emails/smtp`).then(r => r.data),
  guardar: (id, body) => client.put(`/eventos/${id}/emails/smtp`, body).then(r => r.data),
  probar : (id)       => client.post(`/eventos/${id}/emails/smtp/probar`).then(r => r.data),
  borrar : (id)       => client.delete(`/eventos/${id}/emails/smtp`).then(r => r.data),
};

const VACIO = {
  host: '', puerto: 465, usuario: '', pass: '',
  remitente: '', remitente_nombre: '', responder_a: '',
};

export default function BuzonPropio({ evento }) {
  const { success, error: toastErr } = useToast();
  const [estado, setEstado] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);

  const cargar = () => api.ver(evento.id).then(setEstado)
    .catch(e => { toastErr(e.response?.data?.error || e.message); setEstado({ disponible: false }); });

  useEffect(cargar, [evento.id]); // eslint-disable-line

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await api.guardar(evento.id, form);
      if (r.conexion?.ok) { success(r.aviso || 'Conectado.'); setEditando(false); setForm(VACIO); }
      else toastErr(r.conexion?.error || 'Se guardó, pero la conexión falla.');
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setGuardando(false); }
  };

  const probar = async () => {
    setProbando(true);
    try {
      const r = await api.probar(evento.id);
      r.ok ? success(r.mensaje || 'Conexión correcta.') : toastErr(r.error);
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setProbando(false); }
  };

  const desconectar = async () => {
    try {
      const r = await api.borrar(evento.id);
      success(r.aviso || 'Desconectado.');
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  if (!estado) return <div className="card p-5"><Spinner size="sm" /></div>;

  const c = estado.config;
  const conectado = Boolean(c);

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text-1">Enviar desde tu propio correo</h3>
        <p className="text-xs text-text-3 mt-1 leading-relaxed">
          Conecta el buzón de tu evento y los correos saldrán desde tu dirección, no desde la de la
          plataforma. No hay que tocar el DNS: el correo sale de tu cuenta, así que ya está
          autenticado.
        </p>
      </div>

      {estado.disponible === false && (
        <p className="text-xs text-warning-light bg-warning/10 rounded-xl px-3 py-2">
          Falta aplicar la migración 0071 en la base de datos.
        </p>
      )}
      {/* El motivo concreto lo da el servidor: ver el comentario en
          ConectarClaude.jsx. */}
      {estado.cifrado_listo === false && (
        <div className="text-xs text-danger-light bg-danger/10 rounded-xl px-3 py-2">
          No se puede guardar una contraseña de forma segura: el cifrado de secretos del servidor
          no está en condiciones.
          {estado.cifrado?.mensaje
            ? <span className="block mt-1.5 text-text-2">{estado.cifrado.mensaje}</span>
            : <> Falta <code>SMTP_CRYPTO_KEY</code>.</>}
          {estado.cifrado?.arreglo && (
            <span className="block mt-1 text-[11px] text-text-3">{estado.cifrado.arreglo}</span>
          )}
        </div>
      )}

      {conectado && !editando ? (
        <div className="rounded-2xl border border-border bg-surface-2/40 px-4 py-3 space-y-2">
          <p className="text-sm text-text-1 font-mono break-all">{c.usuario}</p>
          <p className="text-[11px] text-text-3">
            {c.host}:{c.puerto}
            {c.remitente_nombre && <> · se ve como «{c.remitente_nombre}»</>}
          </p>
          {c.verificado_at && (
            <p className="text-[11px] text-text-3">
              {c.verificado_ok
                ? <span className="text-success">✓ comprobado</span>
                : <span className="text-danger-light">✗ falla</span>}
              {' '}el {new Date(c.verificado_at).toLocaleString('es-CO')}
            </p>
          )}
          {c.verificado_error && <p className="text-xs text-danger-light">{c.verificado_error}</p>}
          <div className="flex gap-2 pt-1 flex-wrap">
            <button onClick={probar} disabled={probando} className="btn-secondary btn-sm">
              {probando ? <Spinner size="sm" /> : 'Probar conexión'}
            </button>
            <button onClick={() => { setEditando(true); setForm({ ...VACIO, host: c.host, puerto: c.puerto, usuario: c.usuario, remitente: c.remitente || '', remitente_nombre: c.remitente_nombre || '', responder_a: c.responder_a || '' }); }}
              className="btn-secondary btn-sm">Cambiar</button>
            <button onClick={desconectar} className="btn-secondary btn-sm text-danger-light">Desconectar</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-2">
            <div className="field sm:col-span-2">
              <label className="label text-xs">Servidor (host)</label>
              <input value={form.host} onChange={e => set('host', e.target.value)}
                placeholder="mail.tudominio.com" className="input rounded-xl py-2.5 text-sm" />
            </div>
            <div className="field">
              <label className="label text-xs">Puerto</label>
              <select value={form.puerto} onChange={e => set('puerto', Number(e.target.value))}
                className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                <option value={465}>465 · SSL</option>
                <option value={587}>587 · STARTTLS</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <div className="field">
              <label className="label text-xs">Usuario</label>
              <input value={form.usuario} onChange={e => set('usuario', e.target.value)}
                placeholder="eventos@tudominio.com" autoComplete="off"
                className="input rounded-xl py-2.5 text-sm" />
              <p className="text-[11px] text-text-3 mt-1">El correo completo, no sólo lo de antes de la arroba.</p>
            </div>
            <div className="field">
              <label className="label text-xs">Contraseña</label>
              <input type="password" value={form.pass} onChange={e => set('pass', e.target.value)}
                autoComplete="new-password" className="input rounded-xl py-2.5 text-sm" />
              <p className="text-[11px] text-text-3 mt-1">
                La del buzón. En Gmail hace falta una <strong>contraseña de aplicación</strong>, no la normal.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            <div className="field">
              <label className="label text-xs">Se ve como</label>
              <input value={form.remitente_nombre} onChange={e => set('remitente_nombre', e.target.value)}
                placeholder={evento.titulo || 'Nombre del evento'} className="input rounded-xl py-2.5 text-sm" />
            </div>
            <div className="field">
              <label className="label text-xs">Remitente <span className="text-text-3 font-normal">(opcional)</span></label>
              <input value={form.remitente} onChange={e => set('remitente', e.target.value)}
                placeholder="mismo dominio" className="input rounded-xl py-2.5 text-sm" />
            </div>
            <div className="field">
              <label className="label text-xs">Responder a <span className="text-text-3 font-normal">(opcional)</span></label>
              <input value={form.responder_a} onChange={e => set('responder_a', e.target.value)}
                className="input rounded-xl py-2.5 text-sm" />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={guardar} disabled={guardando} className="btn-primary btn-sm">
              {guardando ? <><Spinner size="sm" /> Comprobando…</> : 'Guardar y probar'}
            </button>
            {editando && (
              <button onClick={() => { setEditando(false); setForm(VACIO); }} className="btn-secondary btn-sm">Cancelar</button>
            )}
          </div>
          <p className="text-[11px] text-text-3">
            Se comprueba la conexión antes de darla por buena, y la contraseña se guarda cifrada.
          </p>
        </div>
      )}

      <p className="text-[11px] text-text-3 leading-relaxed border-t border-border pt-3">
        <strong className="text-text-2">Ojo con el volumen.</strong> Tu proveedor tiene topes: Gmail
        gratis ~500 correos al día, Workspace ~2.000, un buzón de cPanel 200 por hora. Para un evento
        de miles de asistentes esto no alcanza — ahí hace falta repartir los envíos en el tiempo.
      </p>
    </div>
  );
}
