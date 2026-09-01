import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';

/* «Ya tienes tu boleta para este evento.»
 *
 * Pedido del 1 de septiembre: quien vuelve a la página pública al día siguiente
 * no tenía camino — sólo el botón de registrarse otra vez. Ahora la página lo
 * reconoce (por el código guardado al registrarse, o pidiéndolo) y le ofrece lo
 * que de verdad quiere: ver su boleta y apuntarse a las actividades.
 *
 * El código se guarda en localStorage al confirmar la reserva
 * (`guardarBoleta`). Es por navegador y por evento; no viaja a ningún lado.
 */

const clave = (slug) => `gestek-boleta:${slug}`;

export function guardarBoleta(slug, codigo) {
  if (!slug || !codigo) return;
  try { localStorage.setItem(clave(slug), String(codigo).toUpperCase()); } catch { /* almacenamiento lleno / bloqueado */ }
}
export function olvidarBoleta(slug) {
  try { localStorage.removeItem(clave(slug)); } catch { /* noop */ }
}
function leerBoleta(slug) {
  try { return localStorage.getItem(clave(slug)) || ''; } catch { return ''; }
}

export default function BoletaConocida({ slug }) {
  const [boleta, setBoleta] = useState(null);   // { codigo, nombre } si está confirmada
  const [pidiendo, setPidiendo] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [err, setErr] = useState('');

  /* Comprueba un código contra el servidor. Si es de este evento y existe, lo
     deja guardado y muestra la tarjeta. Si no, lo olvida en silencio. */
  const verificar = useCallback(async (cod, { guardar = true } = {}) => {
    const c = String(cod || '').trim().toUpperCase();
    if (c.length < 4) return false;
    try {
      const t = await eventosApi.ticketByCode(c);
      if (t?.evento?.slug === slug && t.estado !== 'anulado' && t.estado !== 'cancelado') {
        if (guardar) guardarBoleta(slug, c);
        setBoleta({ codigo: t.codigo, nombre: t.guest_nombre || '' });
        return true;
      }
    } catch { /* 404 o red: se trata como "no vale" */ }
    return false;
  }, [slug]);

  useEffect(() => {
    const guardado = leerBoleta(slug);
    if (!guardado) return;
    let vivo = true;
    verificar(guardado, { guardar: false }).then(ok => {
      if (vivo && !ok) olvidarBoleta(slug);   // el guardado ya no sirve
    });
    return () => { vivo = false; };
  }, [slug, verificar]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBuscando(true);
    const ok = await verificar(codigo);
    setBuscando(false);
    if (ok) { setPidiendo(false); setCodigo(''); }
    else setErr('Ese código no es de este evento o no existe. Míralo en el correo de tu boleta.');
  };

  const cambiar = () => { olvidarBoleta(slug); setBoleta(null); setPidiendo(true); setCodigo(''); };

  /* Ya reconocida: la tarjeta con las dos salidas. */
  if (boleta) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 px-4 py-3.5 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm text-text-1 font-medium">
            Ya tienes tu boleta para este evento
            {boleta.nombre ? <span className="text-text-3 font-normal">, {boleta.nombre.split(' ')[0]}</span> : ''}.
          </p>
          <p className="text-[11px] text-text-3">
            Código <span className="font-mono tracking-wider">{boleta.codigo}</span> · <button type="button" onClick={cambiar} className="hover:underline">no soy yo / usar otro</button>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/mi-ticket/${boleta.codigo}`}
            className="px-4 py-2 rounded-full border border-border-2 text-text-1 hover:bg-surface-2 text-sm font-semibold transition-colors">
            Ver mi boleta
          </Link>
          <Link to={`/explorar/${slug}/agenda?boleta=${encodeURIComponent(boleta.codigo)}`}
            className="px-4 py-2 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-colors">
            Ver actividades
          </Link>
        </div>
      </div>
    );
  }

  /* Sin reconocer: una línea discreta que se abre a un campo. */
  return (
    <div className="mb-6">
      {!pidiendo ? (
        <button type="button" onClick={() => setPidiendo(true)}
          className="text-sm text-text-3 hover:text-text-1 transition-colors">
          ¿Ya te registraste? <span className="text-primary-light hover:underline">Ver mi boleta</span>
        </button>
      ) : (
        <form onSubmit={submit} className="rounded-2xl border border-border bg-surface/50 px-4 py-3.5 max-w-md">
          <label className="text-sm text-text-1 font-medium">Escribe el código de tu boleta</label>
          <p className="text-[11px] text-text-3 mb-2">Está en el correo de confirmación y en tu boleta digital.</p>
          <div className="flex items-center gap-2">
            <input value={codigo} onChange={e => { setCodigo(e.target.value.toUpperCase()); setErr(''); }}
              placeholder="ABCD1234" autoFocus
              className="input-form font-mono tracking-widest uppercase flex-1" />
            <button type="submit" disabled={buscando || codigo.trim().length < 4}
              className="px-4 py-2.5 rounded-xl bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-colors disabled:opacity-50 flex-shrink-0">
              {buscando ? '…' : 'Buscar'}
            </button>
          </div>
          {err && <p className="text-[11px] text-danger-light mt-1.5">{err}</p>}
          <button type="button" onClick={() => { setPidiendo(false); setErr(''); }}
            className="text-[11px] text-text-3 hover:text-text-1 mt-2">Cancelar</button>
        </form>
      )}
    </div>
  );
}
