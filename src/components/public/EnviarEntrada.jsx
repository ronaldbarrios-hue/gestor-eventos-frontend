import { useEffect, useRef, useState } from 'react';
import { clientesApi } from '../../api/clientes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { tarjetaPng } from '../../lib/tarjetaPng.jsx';
import { walletConfig } from './WalletCard.jsx';
import { enlaceBoleta } from '../../lib/enlacesPublicos.js';
import { Flotante, usePosicionFlotante } from '../ui/Flotante.jsx';

/* GESTEK — Hacerle llegar la entrada a quien ya la tiene.
 *
 * ── Lo que se pidió, y lo que se puede cumplir de verdad ─────────────────
 *
 * «Poder enviar la tarjeta de una persona registrada por email. Ahora sólo
 * permite descargar el QR; debería ser toda la tarjeta, para enviarla al correo
 * registrado o compartirla por WhatsApp a un número.»
 *
 * Son dos cosas con mecánicas distintas, y conviene no prometer la misma:
 *
 * · **Por correo** lo manda el SERVIDOR, y manda el correo de siempre —el mismo
 *   que sale al pagar, con la plantilla del evento, su marca y el QR dentro—.
 *   No es una copia nueva: reenviar algo distinto a lo que se envió el primer
 *   día es como se acaba con dos entradas que no se parecen.
 *
 * · **Por WhatsApp** no lo puede mandar el servidor: no hay API de WhatsApp
 *   conectada, y montarla es un frente aparte —número verificado, plantillas
 *   aprobadas por Meta—. Lo que sí se puede, y es honesto, es **preparar el
 *   mensaje** y dejar que lo mande la persona desde su propio WhatsApp.
 *
 * ── Y ahí la decisión que importa: se comparte el ENLACE, no la imagen ────
 *
 * `wa.me` abre WhatsApp con un texto, y en un texto no cabe una imagen. Se
 * podría bajar la tarjeta y pedir que la adjunte a mano, pero entonces lo que
 * circula es un PNG suelto: sin QR que se pueda revalidar si cambia el token,
 * sin fecha si el evento se mueve, y reenviable por quien sea.
 *
 * El enlace a `/mi-ticket/:codigo` lleva a la tarjeta viva, y desde ahí la
 * persona se la baja en los tres formatos. Se comparte la entrada, no una foto
 * de la entrada.
 *
 * En un móvil, además, el sistema sabe compartir archivos: si el navegador trae
 * `navigator.share` con soporte de ficheros, se ofrece **también** la tarjeta
 * como imagen, que es lo que la mayoría espera al decir «compartir».
 */

const soloDigitos = (t) => String(t || '').replace(/\D+/g, '');

export default function EnviarEntrada({ evento = {}, ticket = {}, qrValue, className = '' }) {
  const { success, error: toastErr } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [numero, setNumero] = useState('');
  const caja = useRef(null);
  const ancla = useRef(null);
  const menu = useRef(null);
  /* Mismo patrón que `DescargarEntrada`, y por el mismo motivo que se descubrió
     ahí: el modal del asistente recorta a sus hijos, así que el desplegable sale
     por portal en coordenadas de pantalla o su última opción queda fuera del
     recorte y no se puede pulsar. */
  const pos = usePosicionFlotante(abierto, ancla, { altoMax: 360 });

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => {
      if (menu.current?.contains(e.target) || caja.current?.contains(e.target)) return;
      setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  const correo = ticket.guest_email || ticket.usuario?.email || '';
  const enlace = enlaceBoleta(evento, ticket.codigo);

  const enviarCorreo = async () => {
    setEnviando(true);
    try {
      const r = await clientesApi.reenviar(evento.id, ticket.id);
      success(`Entrada enviada a ${r.enviado_a}.`);
      setAbierto(false);
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setEnviando(false);
    }
  };

  const abrirWhatsapp = () => {
    /* El número va SIN validar el país: los organizadores escriben «312…»,
       «+57 312…» y «57312…» para el mismo teléfono, y rechazar cualquiera de
       las tres por no llevar indicativo es discutir con quien tiene el móvil
       delante. WhatsApp resuelve el resto; si el número no existe, lo dice él,
       que además sabe de qué país es cada quien. */
    const tel = soloDigitos(numero);
    const texto = `Tu entrada para ${evento.titulo || 'el evento'}: ${enlace}`;
    const url = tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener');
    setAbierto(false);
  };

  /* Compartir la tarjeta como archivo, cuando el sistema sabe hacerlo. En
     escritorio casi nunca existe, y por eso no es el camino principal: es el
     atajo del móvil, donde «compartir» significa esto. */
  const puedeCompartirArchivo = typeof navigator !== 'undefined' && Boolean(navigator.canShare);

  const compartirTarjeta = async () => {
    setEnviando(true);
    try {
      const design = walletConfig(evento.page_json, {
        publico: 'asistentes', tipo: ticket.tipo?.nombre,
      });
      const dataUrl = await tarjetaPng({ design, evento, ticket: { ...ticket, qr_token: qrValue } });
      if (!dataUrl) throw new Error('No se pudo generar la tarjeta.');
      const blob = await (await fetch(dataUrl)).blob();
      const archivo = new File([blob], `entrada-${ticket.codigo}.png`, { type: 'image/png' });
      if (!navigator.canShare({ files: [archivo] })) {
        throw new Error('Este navegador no deja compartir imágenes.');
      }
      await navigator.share({
        files: [archivo],
        title: evento.titulo || 'Entrada',
        text: `Tu entrada para ${evento.titulo || 'el evento'}: ${enlace}`,
      });
      setAbierto(false);
    } catch (e) {
      /* Cancelar el diálogo del sistema lanza `AbortError`, y eso no es un
         fallo: es alguien que cambió de idea. Avisarlo sería regañarle. */
      if (e?.name !== 'AbortError') toastErr(e.message || 'No se pudo compartir.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="relative" ref={caja}>
      <button ref={ancla} type="button" onClick={() => setAbierto(v => !v)}
        aria-expanded={abierto} aria-haspopup="menu"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-2 text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors ${className}`}>
        <IconoEnviar className="w-3.5 h-3.5" /> Enviar
      </button>

      {abierto && (
        <Flotante pos={pos} ancho="propio" ref={menu} style={{ width: 320 }}
          className="rounded-2xl border border-border-2 bg-surface shadow-xl text-left">
          <div className="p-3 space-y-3">
            <div>
              <p className="text-sm font-semibold text-text-1">Al correo registrado</p>
              {correo ? (
                <>
                  <p className="text-[11px] text-text-3 mt-0.5 truncate">{correo}</p>
                  <button onClick={enviarCorreo} disabled={enviando}
                    className="btn-primary btn-sm w-full justify-center mt-2">
                    {enviando ? 'Enviando…' : 'Enviar la entrada'}
                  </button>
                  <p className="text-[11px] text-text-3 mt-1.5 leading-relaxed">
                    Es el mismo correo que sale al pagar, con el QR dentro. Si la dirección está mal,
                    corrígela en la boleta y vuelve a enviarlo.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-warning-light mt-1 leading-relaxed">
                  Esta boleta no tiene correo. Escríbelo en la boleta y podrás enviársela.
                </p>
              )}
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-sm font-semibold text-text-1">Por WhatsApp</p>
              <p className="text-[11px] text-text-3 mt-0.5 leading-relaxed">
                Se abre tu WhatsApp con el mensaje escrito. Lo mandas tú, no la plataforma.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <input value={numero} onChange={e => setNumero(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); abrirWhatsapp(); } }}
                  inputMode="tel" placeholder="Número (opcional)"
                  className="input !h-9 text-sm flex-1 min-w-0" />
                <button onClick={abrirWhatsapp} className="btn-secondary btn-sm flex-shrink-0">Abrir</button>
              </div>
              <p className="text-[11px] text-text-3 mt-1.5 leading-relaxed">
                Va el <b className="text-text-2">enlace</b> a su entrada, no una captura: así el QR sigue
                sirviendo aunque cambie, y ella se la baja en el formato que quiera.
              </p>
            </div>

            {puedeCompartirArchivo && (
              <div className="border-t border-border pt-3">
                <button onClick={compartirTarjeta} disabled={enviando}
                  className="btn-ghost btn-sm w-full justify-center">
                  Compartir la tarjeta como imagen
                </button>
              </div>
            )}
          </div>
        </Flotante>
      )}
    </div>
  );
}

function IconoEnviar({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l16-8-6 16-2.5-6.5L4 12z" />
    </svg>
  );
}
