import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import client from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/* La pantalla de consentimiento del conector.

   Aquí llega el organizador cuando Claude pide acceso a su cuenta. Es el único
   paso del flujo OAuth que hace una persona, así que tiene que responder tres
   preguntas sin que nadie tenga que adivinar: quién pide, con qué cuenta, y
   qué va a poder hacer.

   Lo que NO se hace: pintar una lista de setenta herramientas. Nadie la lee, y
   una lista que nadie lee es peor que un resumen honesto — da sensación de
   detalle sin informar. Se agrupan por lo que significan, y se separa lo que
   puede salir a la calle (publicar, cobrar, escribir a los asistentes) de lo
   que sólo mira. */

const PUEDE = [
  { icono: '✎', qué: 'Crear y editar tus eventos', detalle: 'Títulos, fechas, lugar, agenda, ponentes y patrocinadores.' },
  { icono: '⊞', qué: 'Crear boletas y códigos de descuento', detalle: 'Tipos de boleta, precios y cortesías.' },
  { icono: '☰', qué: 'Ver tus asistentes y tus métricas', detalle: 'Listados, ingresos y cómo va cada evento.' },
  { icono: '⚑', qué: 'Gestionar tu equipo y sus tareas', detalle: 'Invitar colaboradores, roles y asignaciones.' },
];

const OJO = [
  'Publicar un evento, que lo hace visible al público.',
  'Emitir o anular boletas.',
  'Mandar recordatorios a tus asistentes.',
];

export default function AutorizarPage() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const location = useLocation();
  const { usuario, loading: cargandoSesion } = useAuth();

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  /* Los parámetros los puso el servidor al redirigir; se devuelven tal cual. */
  const datos = useMemo(() => ({
    client_id: params.get('client_id') || '',
    redirect_uri: params.get('redirect_uri') || '',
    code_challenge: params.get('code_challenge') || '',
    state: params.get('state') || '',
    scope: params.get('scope') || 'mcp',
    cliente: params.get('cliente') || 'Una aplicación',
  }), [params]);

  const faltan = !datos.client_id || !datos.redirect_uri || !datos.code_challenge;

  /* Sin sesión: al login, pero diciéndole a dónde volver.

     Se usa el `state.from` de react-router porque es el mecanismo que AuthPage
     ya lee (`useDestinoPostAuth`). La primera versión de esto guardaba la URL
     en sessionStorage y hacía `window.location.href = '/login'`: funcionaba a
     medias — entrabas, y aterrizabas en el panel con los parámetros de OAuth
     perdidos, así que había que empezar otra vez desde Claude. Y recargar la
     página entera habría tirado la sesión que se estaba resolviendo.

     Van la ruta y la query: sin la query no queda nada que aprobar. */
  useEffect(() => {
    if (cargandoSesion || usuario || faltan) return;
    navegar('/login', {
      replace: true,
      state: { from: `${location.pathname}${location.search}` },
    });
  }, [cargandoSesion, usuario, faltan, navegar, location.pathname, location.search]);

  const aprobar = async () => {
    setEnviando(true); setError('');
    try {
      const r = await client.post('/oauth/aprobar', datos).then(res => res.data);
      if (!r.redirect) throw new Error('El servidor no devolvió a dónde volver.');
      /* Se sale del panel hacia el cliente con el código. */
      window.location.href = r.redirect;
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setEnviando(false);
    }
  };

  const cancelar = () => {
    /* Se avisa al cliente de que el usuario dijo no, en vez de dejarlo
       esperando: el estándar espera un error en el redirect. */
    try {
      const u = new URL(datos.redirect_uri);
      u.searchParams.set('error', 'access_denied');
      if (datos.state) u.searchParams.set('state', datos.state);
      window.location.href = u.toString();
    } catch {
      window.location.href = '/';
    }
  };

  if (cargandoSesion) {
    return <Centrado><Spinner /></Centrado>;
  }

  if (faltan) {
    return (
      <Centrado>
        <Tarjeta>
          <h1 className="text-xl font-bold font-display text-text-1 mb-2">Enlace incompleto</h1>
          <p className="text-sm text-text-2 leading-relaxed mb-5">
            A esta página se llega desde la aplicación que pide acceso, y faltan datos en el enlace.
            Vuelve a intentar la conexión desde ahí.
          </p>
          <Link to="/" className="btn-secondary btn-sm">Ir al panel</Link>
        </Tarjeta>
      </Centrado>
    );
  }

  if (!usuario) return <Centrado><Spinner /></Centrado>;

  return (
    <Centrado>
      <Tarjeta>
        <p className="text-[11px] uppercase tracking-widest text-primary-light font-semibold mb-3">
          Permiso de acceso
        </p>

        <h1 className="text-2xl font-bold font-display text-text-1 tracking-tight leading-tight mb-2">
          {datos.cliente} quiere operar tu cuenta de GESTEK
        </h1>

        <p className="text-sm text-text-2 leading-relaxed mb-5">
          Si lo autorizas, podrá hacer en tu nombre lo mismo que harías tú desde el panel — sin
          entrar al panel.
        </p>

        {/* Con qué cuenta: es la pregunta que más veces se responde mal, porque
            alguien con dos cuentas aprueba desde la equivocada. */}
        <div className="rounded-2xl border border-border bg-surface-2/40 px-4 py-3 mb-5">
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1">Tu cuenta</p>
          <p className="text-sm text-text-1 break-all">{usuario.email}</p>
          <p className="text-[11px] text-text-3 mt-1">
            El permiso queda atado a esta cuenta. Si no es la que quieres,{' '}
            <a href="/login" className="text-primary-light hover:underline">entra con otra</a>.
          </p>
        </div>

        <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">Qué va a poder hacer</p>
        <ul className="space-y-2.5 mb-5">
          {PUEDE.map(p => (
            <li key={p.qué} className="flex gap-3">
              <span className="text-primary-light text-sm leading-6 w-4 shrink-0" aria-hidden="true">{p.icono}</span>
              <span className="min-w-0">
                <span className="block text-sm text-text-1">{p.qué}</span>
                <span className="block text-[11px] text-text-3 leading-relaxed">{p.detalle}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Lo que sale a la calle, aparte y en tono de aviso: es lo que uno
            querría haber leído si algo se publica sin querer. */}
        <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 mb-5">
          <p className="text-[11px] uppercase tracking-widest text-warning-light font-semibold mb-1.5">
            Incluye acciones que se ven fuera
          </p>
          <ul className="space-y-1">
            {OJO.map(o => <li key={o} className="text-[11px] text-text-2 leading-relaxed">· {o}</li>)}
          </ul>
        </div>

        {error && (
          <p className="text-xs text-danger-light bg-danger/10 rounded-xl px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex gap-2 flex-wrap">
          <button onClick={aprobar} disabled={enviando}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-text-1 text-bg
                       hover:bg-white text-sm font-semibold disabled:opacity-60 transition-all">
            {enviando ? <><Spinner size="sm" /> Autorizando…</> : 'Autorizar'}
          </button>
          <button onClick={cancelar} disabled={enviando}
            className="px-5 py-2.5 rounded-full border border-border-2 text-sm text-text-2
                       hover:text-text-1 hover:bg-surface-2 transition-colors">
            Cancelar
          </button>
        </div>

        <p className="text-[11px] text-text-3 leading-relaxed mt-4">
          Puedes cortar este acceso cuando quieras desde <strong className="text-text-2">Ajustes →
          Integraciones</strong>, sin tocar nada en la otra aplicación. No compartimos tu contraseña:
          lo que se entrega es un permiso revocable.
        </p>
      </Tarjeta>
    </Centrado>
  );
}

function Centrado({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-bg">
      {children}
    </div>
  );
}

function Tarjeta({ children }) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-border-2 bg-surface p-6 sm:p-8 shadow-2xl">
      {children}
    </div>
  );
}
