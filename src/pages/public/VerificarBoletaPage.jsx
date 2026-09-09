import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Icono from '../../components/ui/Iconos.jsx';
import GLoader from '../../components/ui/GLoader.jsx';
import { eventosApi } from '../../api/eventos.js';

/* Página pública /verificar — «¿esta boleta es real?»
 *
 * ── A quién le habla ──────────────────────────────────────────────────────
 *
 * No al dueño de la boleta: a quien está a punto de COMPRÁRSELA a un
 * desconocido. Está en un chat de WhatsApp con el código pegado y el botón de
 * transferir dinero al lado. Todo aquí está pensado para ese minuto.
 *
 * ── Por qué esto no es /mi-ticket ─────────────────────────────────────────
 *
 * El código ES la credencial: `/mi-ticket/:codigo` enseña el QR. Mandar ahí a
 * quien todavía no ha pagado sería regalarle la entrada — comprobaría que es
 * real quedándose con ella. Esta página consulta una ruta distinta y más
 * estrecha, que dice lo justo para confiar y nada que sirva para entrar.
 *
 * ── Y por qué el nombre sale tapado ───────────────────────────────────────
 *
 * «J*** M***» le sirve a quien tiene la cédula del vendedor delante, y no le
 * sirve de nada a quien sólo tiene un código y va probando.
 *
 * ── Lo que GESTEK NO dice aquí, y se dice en voz alta ─────────────────────
 *
 * Que la boleta sea real no hace honrado a quien la vende. El dinero de una
 * reventa es ajeno a la plataforma: no lo cobra, no lo retiene y no lo
 * devuelve. Callarlo sería dejar que esta pantalla se lea como un aval de la
 * transacción, que es exactamente lo que no es.
 */

const LIMPIO = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');

export default function VerificarBoletaPage() {
  const { codigo: enLaUrl } = useParams();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState(enLaUrl || '');
  const [res, setRes] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const comprobar = async (valor) => {
    const c = LIMPIO(valor);
    if (c.length < 4) { setError('Escribe el código completo de la boleta.'); return; }
    setError(null); setCargando(true); setRes(null);
    try {
      setRes(await eventosApi.verificarBoleta(c));
      /* El resultado queda en la barra de direcciones para poder pegárselo a
         alguien más — que es lo primero que hace quien está comprando en grupo. */
      navigate(`/verificar/${c}`, { replace: true });
    } catch {
      setError('No pudimos comprobarla ahora. Vuelve a intentarlo en un momento.');
    } finally { setCargando(false); }
  };

  /* Un fallo nuestro NO se enseña como «no existe»: quien tiene una boleta
     buena se echaría atrás de una compra legítima por un error de red. */
  const veredicto = error ? null : res;

  return (
    <div className="min-h-screen bg-bg py-12 px-4">
      <div className="max-w-lg mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Icono name="entrada" className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-semibold text-text">¿Esta boleta es real?</h1>
          <p className="text-text-2 mt-2">
            Escribe el código que te pasaron y te decimos si existe, de qué evento es
            y si todavía sirve para entrar.
          </p>
        </header>

        <form
          onSubmit={(e) => { e.preventDefault(); comprobar(codigo); }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Código de la boleta"
            aria-label="Código de la boleta"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-bg-1 text-text
                       tracking-widest font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={cargando}
            className="px-6 py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-60"
          >
            {cargando ? 'Comprobando…' : 'Comprobar'}
          </button>
        </form>

        {cargando && <GLoader />}

        {error && (
          <p className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-text mb-6">
            {error}
          </p>
        )}

        {veredicto && <Resultado r={veredicto} />}

        <p className="mt-10 text-sm text-text-3 leading-relaxed border-t border-border pt-6">
          GESTEK sólo confirma que la boleta existe y en qué estado está.
          <strong className="text-text-2"> El pago entre ustedes es ajeno a la plataforma</strong>:
          no lo cobramos, no lo guardamos y no lo devolvemos. Que la boleta sea
          real no garantiza que quien te la vende te la vaya a entregar.
        </p>

        <p className="mt-4 text-sm text-text-3">
          ¿Es tuya y quieres ver tu QR? <Link to="/explorar" className="text-primary underline">Busca tu evento</Link>.
        </p>
      </div>
    </div>
  );
}

function Resultado({ r }) {
  const tono = r.ok
    ? 'bg-success/10 border-success/30 text-success'
    : 'bg-danger/10 border-danger/30 text-danger';

  return (
    <section className={`rounded-2xl border p-5 ${tono}`}>
      <div className="flex items-start gap-3">
        <Icono name={r.ok ? 'hecho' : 'aviso'} className="w-6 h-6 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold">{r.titulo}</h2>
          <p className="text-text-2 mt-1">{r.detalle}</p>
        </div>
      </div>

      {r.evento && (
        <dl className="mt-5 pt-5 border-t border-border/60 grid gap-3 text-text">
          <Dato etiqueta="Evento" valor={r.evento.titulo} />
          <Dato etiqueta="Fecha"  valor={fecha(r.evento.fecha_inicio)} />
          <Dato etiqueta="Lugar"  valor={r.evento.lugar} />
          <Dato etiqueta="Tipo"   valor={r.boleta?.tipo} />
          {/* El sitio es la mitad de lo que se compra en un concierto: es lo que
              hay que poder cotejar con lo que dijo el vendedor. */}
          <Dato etiqueta="Sitio"  valor={r.boleta?.sitio} />
          <Dato etiqueta="A nombre de" valor={r.boleta?.a_nombre_de}
                pie="Pídele el documento a quien te la vende y comprueba que las iniciales coinciden." />
        </dl>
      )}

      {/* Una boleta impecable de un evento cancelado no sirve para nada, y eso
          es exactamente lo que hay que saber antes de pagar. */}
      {r.evento?.cancelado && (
        <p className="mt-5 p-3 rounded-xl bg-danger/10 border border-danger/30 text-text">
          <strong>Este evento está cancelado.</strong> La boleta existe, pero el
          evento no se va a realizar.
        </p>
      )}
    </section>
  );
}

function Dato({ etiqueta, valor, pie }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-3">{etiqueta}</dt>
      <dd className="text-text font-medium">{valor}</dd>
      {pie && <p className="text-xs text-text-3 mt-1">{pie}</p>}
    </div>
  );
}

function fecha(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return null; }
}
