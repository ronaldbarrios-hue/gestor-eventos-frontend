import { pantallaInicial } from '../lib/prefs.js';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import logoG from '../assets/logo-g.svg';
import GestekMark from '../components/layout/GestekMark.jsx';
import { InlineLoader } from '../components/ui/PageLoader.jsx';
import AvatarUploader, { uploadAvatarFile } from '../components/ui/AvatarUploader.jsx';
import { supabase } from '../lib/supabase.js';
import { PAISES, bandera } from '../lib/paises.js';

const PARTICIPANTES = ['Menos de 50', '50 – 200', '200 – 1.000', 'Más de 1.000'];
const DUR_OUT = 420;
const DUR_IN  = 520;

const staggerClass = 'animate-[fadeUp_0.55s_cubic-bezier(0.16,1,0.3,1)_both]';
const staggerStyle = (i = 0) => ({ animationDelay: `${i * 70}ms` });

/* Adónde navegar después de login/registro exitoso.
   Prioridad: 1) a dónde intentaba ir antes de que lo mandaran a login
   (ej. clic en invitación estando sin sesión), 2) evento recién vinculado
   por invitación pendiente, 3) el fallback (dashboard). */
function useDestinoPostAuth() {
  const { consumirInvitacionInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  return (fallback = pantallaInicial()) => {
    const from = location.state?.from;
    const info = consumirInvitacionInfo();
    navigate(from || (info?.eventoId ? `/eventos/${info.eventoId}` : fallback), { replace: true });
  };
}

export default function AuthPage() {
  const { pathname } = useLocation();
  const mode = pathname.startsWith('/register') ? 'register' : 'login';

  const [displayMode, setDisplayMode] = useState(mode);
  const [phase, setPhase] = useState('idle');       // idle | out | in
  const [rumbo, setRumbo] = useState('right');      // hacia dónde viaja el formulario

  useEffect(() => {
    if (mode === displayMode) return undefined;
    /* En login el formulario está a la izquierda y en registro a la derecha,
       así que el rumbo lo decide a cuál vamos. Se guarda al empezar porque
       la fase de entrada tiene que seguir el mismo sentido que la de salida:
       si no, el contenido sale por un lado y vuelve por el mismo, y se ve
       como un rebote en vez de un viaje. */
    setRumbo(mode === 'register' ? 'right' : 'left');
    setPhase('out');
    const t1 = setTimeout(() => {
      setDisplayMode(mode);
      setPhase('in');
    }, DUR_OUT);
    return () => clearTimeout(t1);
  }, [mode, displayMode]);

  useEffect(() => {
    if (phase !== 'in') return undefined;
    const t = setTimeout(() => setPhase('idle'), DUR_IN);
    return () => clearTimeout(t);
  }, [phase]);

  const isLogin = displayMode === 'login';

  /* El formulario viaja en el sentido del rumbo; el panel de color y su
     texto, en el contrario — se están intercambiando el sitio. */
  const animFormulario = phase === 'out'
    ? (rumbo === 'right' ? 'animate-auth-out-right' : 'animate-auth-out-left')
    : phase === 'in'
      ? (rumbo === 'right' ? 'animate-auth-in-right' : 'animate-auth-in-left')
      : '';
  const animPanel = phase === 'out'
    ? (rumbo === 'right' ? 'animate-auth-out-left' : 'animate-auth-out-right')
    : phase === 'in'
      ? (rumbo === 'right' ? 'animate-auth-in-left' : 'animate-auth-in-right')
      : '';

  return (
    <div className="relative min-h-screen flex items-start lg:items-center justify-center bg-bg text-text-1 overflow-x-hidden px-4 sm:px-8 pt-16 pb-8 lg:py-12 animate-[fadeIn_0.4s_ease_both]">
      <BackgroundGlows isLogin={isLogin} />

      <Link
        to="/"
        className="fixed top-4 left-4 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-surface/90 backdrop-blur-md text-sm font-medium text-text-2 hover:text-text-1 hover:bg-surface transition-all group animate-[fadeUp_0.5s_ease_both] min-h-[44px]"
        style={{ animationDelay: '40ms' }}
      >
        <svg
          className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Volver</span>
      </Link>

      {/* Una sola tarjeta con las dos mitades adentro. Antes eran dos columnas
          sueltas que se desvanecían y volvían a aparecer; ahora la mitad de
          color se desliza de un lado al otro y el contenido viaja con ella. */}
      <div className="relative w-full max-w-5xl mx-auto lg:rounded-[2rem] lg:border lg:border-border-2
                      lg:bg-surface/40 lg:backdrop-blur-xl lg:shadow-card-hover lg:overflow-hidden">

        {/* La mitad de color. Es la noche de la marca, así que resalta contra
            el lado del formulario en los dos temas. */}
        <div
          aria-hidden="true"
          className={`hidden lg:block absolute inset-y-0 left-0 w-1/2 z-0
                      transition-transform duration-[680ms] ease-[cubic-bezier(0.65,0,0.35,1)]
                      ${isLogin ? 'translate-x-full' : 'translate-x-0'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#232935] via-[#161A21] to-[#0D0F13]" />
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(30rem 22rem at 22% 12%, rgba(224,177,43,0.20), transparent 62%)' }}
          />
          {/* La marca, en grande y muy tenue: llena el panel sin robar lectura */}
          <div className="absolute -bottom-16 -right-14 opacity-[0.055]">
            <GestekMark size={340} color="#F2D66B" />
          </div>
          <div className={`absolute inset-y-0 w-px bg-primary/25 ${isLogin ? 'left-0' : 'right-0'}`} />
        </div>

        <div className="relative z-10 grid lg:grid-cols-2 lg:min-h-[640px]">
          {/* Formulario */}
          <div className={`${isLogin ? 'lg:order-1' : 'lg:order-2'} flex items-center lg:p-10 xl:p-12 ${animFormulario}`}>
            <div className="w-full max-w-md mx-auto">
              {isLogin ? <LoginForm /> : <RegisterForm />}
            </div>
          </div>

          {/* Texto — vive sobre la mitad de color, solo en escritorio */}
          <div className={`${isLogin ? 'lg:order-2' : 'lg:order-1'} hidden lg:flex items-center p-10 xl:p-12 ${animPanel}`}>
            <div className="w-full max-w-md mx-auto">
              {isLogin ? <LoginText /> : <RegisterText />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Background ─────────── */
function BackgroundGlows({ isLogin }) {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10" aria-hidden="true">
      <div className={`absolute w-[700px] h-[700px] rounded-full blur-[160px] transition-all duration-1000 animate-[glowPulse_8s_ease-in-out_infinite] ${isLogin ? 'top-1/3 left-0 bg-primary/15' : 'top-1/3 right-0 bg-accent/15'}`} />
      <div className={`absolute w-[500px] h-[500px] rounded-full blur-[140px] transition-all duration-1000 animate-[glowPulse_10s_ease-in-out_infinite] ${isLogin ? 'bottom-0 right-1/4 bg-accent/10' : 'bottom-0 left-1/4 bg-primary/10'}`} style={{ animationDelay: '2s' }} />
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
    </div>
  );
}

/* ─────────── LOGIN ─────────── */
function LoginText() {
  /* Antes esto era un titular, un párrafo y tres círculos de degradado
     haciéndose pasar por fotos de usuarios. Se veía vacío justamente
     porque no decía nada: ahora enumera lo que la persona viene a
     retomar, que es lo único que importa en esta pantalla. */
  const TE_ESPERA = [
    ['Tus eventos', 'Con sus ventas y su aforo al día.'],
    ['El ingreso listo', 'Escáner, escarapelas y zonas configuradas.'],
    ['Lo que avanzó tu equipo', 'Tareas, mensajes y solicitudes pendientes.'],
  ];

  return (
    <div className="space-y-7">
      <Link to="/" className={`${staggerClass} inline-flex items-center gap-3 group`} style={staggerStyle(0)}>
        <img src={logoG} alt="GESTEK" className="h-12 w-12 transition-transform group-hover:scale-110 drop-shadow-[0_0_18px_rgba(224,177,43,0.5)]" />
        <span className="text-2xl font-bold font-display tracking-tight text-white">GESTEK</span>
      </Link>

      <h2
        className={`${staggerClass} text-4xl xl:text-5xl font-bold font-display tracking-tight leading-[1.05] text-white`}
        style={staggerStyle(1)}
      >
        Bienvenido de vuelta.
      </h2>

      <p className={`${staggerClass} text-lg text-white/65 leading-relaxed`} style={staggerStyle(2)}>
        Todo quedó donde lo dejaste.
      </p>

      <ul className={`${staggerClass} space-y-4 pt-5 border-t border-white/10`} style={staggerStyle(3)}>
        {TE_ESPERA.map(([que, detalle], i) => (
          <li
            key={que}
            className="flex items-start gap-3.5 animate-[fadeUp_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"
            style={{ animationDelay: `${320 + i * 80}ms` }}
          >
            <span className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-primary/20 border border-primary/40
                             flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#F2D66B" strokeWidth="2.6" strokeLinecap="round"
                   strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <p className="text-[15px] font-semibold text-white">{que}</p>
              <p className="text-sm text-white/55 mt-0.5">{detalle}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className={`${staggerClass} text-sm text-white/45 pt-2`} style={staggerStyle(4)}>
        ¿Problemas para entrar?{' '}
        <Link to="/faq" className="text-[#F2D66B] hover:underline">Mira las preguntas frecuentes</Link>
      </p>
    </div>
  );
}

function LoginForm() {
  const { login, signInWithGoogle } = useAuth();
  const { error: toastError } = useToast();
  const irDestinoPostAuth = useDestinoPostAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const res = await signInWithGoogle();
    if (!res.ok) { toastError(res.error); setGoogleLoading(false); }
  };

  const onChange = e => { setErr(''); setForm(f => ({ ...f, [e.target.name]: e.target.value })); };

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    const res = await login(form.email, form.password);
    setLoading(false);
    if (res.ok) {
      setTimeout(() => irDestinoPostAuth('/inicio'), 300);
    } else {
      setErr(res.error); toastError(res.error);
    }
  };

  return (
    <div>
      {/* Logo móvil */}
      <Link
        to="/"
        className={`${staggerClass} lg:hidden inline-flex items-center gap-2 mb-8`}
        style={staggerStyle(0)}
      >
        <img src={logoG} alt="GESTEK" className="h-10 w-10" />
        <span className="text-xl font-bold font-display tracking-tight">GESTEK</span>
      </Link>

      <h1
        className={`${staggerClass} text-3xl sm:text-4xl font-bold font-display tracking-tight text-text-1 mb-2`}
        style={staggerStyle(0)}
      >
        Iniciar sesión
      </h1>
      <p className={`${staggerClass} text-base text-text-2 mb-8`} style={staggerStyle(1)}>
        ¿Aún no tienes cuenta?{' '}
        <Link to="/register" className="text-primary-light hover:text-primary font-semibold transition-colors">
          Crear una gratis
        </Link>
      </p>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className={`${staggerClass} w-full mb-5 py-3.5 rounded-2xl border border-border-2 bg-surface hover:bg-surface-2 text-text-1 font-medium text-sm flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 min-h-[44px]`}
        style={staggerStyle(2)}
      >
        <GoogleIcon className="w-5 h-5 shrink-0" />
        {googleLoading ? 'Conectando…' : 'Continuar con Google'}
      </button>

      <div className={`${staggerClass} flex items-center gap-3 mb-5`} style={staggerStyle(3)}>
        <div className="flex-1 h-px bg-border" />
        <span className="text-[11px] uppercase tracking-widest text-text-3 whitespace-nowrap">o con email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={onSubmit} className={`${staggerClass} space-y-5`} style={staggerStyle(4)}>
        {err && (
          <div className="px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger-light text-sm">{err}</div>
        )}

        <div className="field">
          <label className="label">Email</label>
          <input
            type="email" name="email" value={form.email} onChange={onChange}
            className="input rounded-2xl py-3.5 text-base" placeholder="tu@empresa.com"
            required autoFocus autoComplete="email"
            style={{ fontSize: '16px' }}
          />
        </div>

        <div className="field">
          <div className="flex items-center justify-between mb-1.5">
            <label className="label !mb-0">Contraseña</label>
            <Link to="/recuperar" className="text-xs text-text-2 hover:text-primary-light transition-colors py-1">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'} name="password"
              value={form.password} onChange={onChange}
              className="input rounded-2xl py-3.5 pr-12 text-base" placeholder="••••••••"
              required autoComplete="current-password"
              style={{ fontSize: '16px' }}
            />
            <button
              type="button" onClick={() => setShowPwd(v => !v)}
              aria-label={showPwd ? 'Ocultar' : 'Mostrar'}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2"
            >
              {showPwd
                ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l18 18M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-3.42M9.88 4.24A10.07 10.07 0 0112 4c5 0 9 4 10 8a13.43 13.43 0 01-2.6 3.94M6.6 6.6A13.43 13.43 0 002 12c1 4 5 8 10 8 1.59 0 3.07-.39 4.36-1.06"/></svg>
                : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white transition-all duration-200 active:scale-[0.99] shadow-[0_0_30px_rgba(241,245,249,0.18)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 min-h-[48px]"
        >
          {loading ? <InlineLoader message="Iniciando sesión..." /> : 'Iniciar sesión'}
        </button>
      </form>

      <p className={`${staggerClass} text-center text-xs text-text-3 mt-8`} style={staggerStyle(5)}>
        Al iniciar sesión aceptas nuestros{' '}
        <a href="/terminos" target="_blank" rel="noreferrer" className="underline text-text-2 hover:text-text-1">términos de uso</a> y la{' '}
        <a href="/privacidad" target="_blank" rel="noreferrer" className="underline text-text-2 hover:text-text-1">política de privacidad</a>.
      </p>
    </div>
  );
}

/* ─────────── REGISTER ─────────── */
function RegisterText() {
  /* Las cuatro casillas decían dos palabras cada una y no explicaban nada.
     Ahora cada una dice qué es y por qué importa, y ninguna promete algo
     que no exista: el agente de IA es del plan de marca blanca y se dice. */
  const LO_QUE_TIENES = [
    ['Asistentes ilimitados', 'Sin tope y sin caducidad, también en el plan gratuito.'],
    ['El dinero va directo a ti', 'Cobras con tu propia llave. GESTEK no toca ese flujo.'],
    ['Ingreso con QR', 'Escanea desde el celular, incluso sin internet.'],
    ['Tu equipo con roles', 'Cada quien ve y hace solo lo suyo, evento por evento.'],
  ];

  return (
    <div className="space-y-6">
      <Link to="/" className={`${staggerClass} inline-flex items-center gap-3 group`} style={staggerStyle(0)}>
        <img src={logoG} alt="GESTEK" className="h-12 w-12 transition-transform group-hover:scale-110 drop-shadow-[0_0_18px_rgba(224,177,43,0.5)]" />
        <span className="text-2xl font-bold font-display tracking-tight text-white">GESTEK</span>
      </Link>

      <p
        className={`${staggerClass} text-xs uppercase tracking-widest text-[#F2D66B] font-semibold`}
        style={staggerStyle(1)}
      >
        Plan gratuito · Sin límite de asistentes
      </p>

      <h2
        className={`${staggerClass} text-4xl xl:text-[2.9rem] font-bold font-display tracking-tight leading-[1.05] text-white`}
        style={staggerStyle(2)}
      >
        Crea tu cuenta y monta tu primer evento hoy.
      </h2>

      <p className={`${staggerClass} text-[17px] text-white/65 leading-relaxed`} style={staggerStyle(3)}>
        Cuéntanos lo básico y te dejamos el entorno listo: página pública,
        boletas y control de ingreso desde el primer momento.
      </p>

      <ul className={`${staggerClass} space-y-3.5 pt-5 border-t border-white/10`} style={staggerStyle(4)}>
        {LO_QUE_TIENES.map(([que, detalle], i) => (
          <li
            key={que}
            className="flex items-start gap-3.5 animate-[fadeUp_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"
            style={{ animationDelay: `${340 + i * 70}ms` }}
          >
            <span className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-primary/20 border border-primary/40
                             flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#F2D66B" strokeWidth="2.6" strokeLinecap="round"
                   strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <p className="text-[15px] font-semibold text-white">{que}</p>
              <p className="text-sm text-white/55 mt-0.5">{detalle}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RegisterForm() {
  const { register, resendConfirmation, signInWithGoogle, checkInvitacionPendiente } = useAuth();
  const { success, error: toastError } = useToast();
  const irDestinoPostAuth = useDestinoPostAuth();

  const [step, setStep] = useState(0); // 0 (propósito) | 1 | 2 | 'sent'
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState('');

  /* Propósito elegido en el paso 0: 'organizador' (crear/gestionar eventos)
     o 'asistente' (solo explorar y comprar boletas). */
  const [proposito, setProposito] = useState(null);

  /* Info de invitación pendiente detectada por email (staff invitado a un
     equipo). Cuando aplica, se relajan las preguntas de "organizador"
     igual que cuando el propósito elegido es "asistente". */
  const [invitacion, setInvitacion] = useState(null);
  const [checkingInvite, setCheckingInvite] = useState(false);

  const [paso1, setPaso1] = useState({
    nombre: '', email: '', telefono: '', participantes: '', contexto: '', password: '',
  });
  const [paso2, setPaso2] = useState({
    fotoFile: null, ocupacion: '', empresa: '', ciudad: '', aceptar: false,
  });

  /* Se ocultan las preguntas específicas de organizador si el propósito
     elegido es "asistente" O si detectamos que viene de una invitación. */
  const esFlujoLigero = proposito === 'asistente' || Boolean(invitacion?.invitado);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const res = await signInWithGoogle();
    if (!res.ok) { toastError(res.error); setGoogleLoading(false); }
  };

  const onChange1 = e => { setErr(''); setPaso1(f => ({ ...f, [e.target.name]: e.target.value })); };
  const onChange2 = e => { setErr(''); setPaso2(f => ({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })); };

  const elegirProposito = (p) => {
    setProposito(p);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Al salir del campo email, chequeamos si hay una invitación pendiente */
  const onBlurEmail = async () => {
    if (!paso1.email || !paso1.email.includes('@')) { setInvitacion(null); return; }
    setCheckingInvite(true);
    const info = await checkInvitacionPendiente(paso1.email);
    setCheckingInvite(false);
    setInvitacion(info?.invitado ? info : null);
  };

  const submitPaso1 = e => {
    e.preventDefault();
    if (paso1.password.length < 8) { setErr('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (!esFlujoLigero && !paso1.participantes) { setErr('Selecciona el tamaño típico de tus eventos.'); return; }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitFinal = async e => {
    e.preventDefault();
    if (!paso2.aceptar) { setErr('Debes aceptar los términos para continuar.'); return; }
    setLoading(true);
    setErr('');
    const res = await register({
      nombre: paso1.nombre,
      email: paso1.email,
      password: paso1.password,
      rol: 'organizador',
      modo_activo: proposito === 'asistente' ? 'asistente' : 'organizador',
      telefono: paso1.telefono,
      participantes: paso1.participantes,
      contexto: paso1.contexto,
      ocupacion: paso2.ocupacion,
      empresa: paso2.empresa,
      ciudad: paso2.ciudad,
    });

    if (res.ok && paso2.fotoFile && res.data?.user?.id) {
      try {
        const url = await uploadAvatarFile(paso2.fotoFile, res.data.user.id);
        await supabase.auth.updateUser({ data: { foto: url } });
      } catch (e) {
        console.warn('[register] upload avatar falló (no crítico):', e.message);
      }
    }

    setLoading(false);
    if (res.ok) {
      if (res.requiresConfirmation) {
        setStep('sent');
      } else {
        success('Cuenta creada exitosamente.');
        setTimeout(() => irDestinoPostAuth('/inicio'), 300);
      }
    } else {
      setErr(res.error);
      toastError(res.error);
    }
  };

  const onResend = async () => {
    setLoading(true);
    const res = await resendConfirmation(paso1.email);
    setLoading(false);
    if (res.ok) success('Correo reenviado.');
    else toastError(res.error);
  };

  return (
    <div>
      <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-6">
        <img src={logoG} alt="GESTEK" className="h-10 w-10" />
        <span className="text-xl font-bold font-display tracking-tight">GESTEK</span>
      </Link>

      {step !== 'sent' && step !== 0 && (
        <div className={`${staggerClass} flex items-center gap-2 mb-7`} style={staggerStyle(0)}>
          {[1, 2].map(n => (
            <div key={n} className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 shrink-0 ${
                step >= n ? 'bg-text-1 text-bg scale-100' : 'bg-surface-2 text-text-3 border border-border scale-95'
              }`}>{n}</span>
              <span className={`text-xs font-medium transition-colors duration-300 truncate ${step >= n ? 'text-text-1' : 'text-text-3'}`}>
                {n === 1 ? 'Acceso gratis' : 'Perfil'}
              </span>
              {n === 1 && <span className={`flex-1 h-px transition-colors duration-500 ${step >= 2 ? 'bg-text-1' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
      )}

      {/* PASO 0 — Propósito, estilo Airbnb Huésped/Anfitrión */}
      {step === 0 && (
        <div key="step0" className="animate-[fadeUp_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
          <h1 className={`${staggerClass} text-3xl sm:text-4xl font-bold font-display tracking-tight mb-2`} style={staggerStyle(0)}>
            ¿Qué te trae a GESTEK?
          </h1>
          <p className={`${staggerClass} text-base text-text-2 mb-6`} style={staggerStyle(1)}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-light hover:text-primary font-semibold transition-colors">Iniciar sesión</Link>
          </p>

          <div className={`${staggerClass} space-y-3`} style={staggerStyle(2)}>
            <button
              type="button"
              onClick={() => elegirProposito('organizador')}
              className="w-full text-left p-5 rounded-3xl border-2 border-border hover:border-primary/50 hover:bg-surface-2/40 transition-all group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <CalendarProposeIcon className="w-6 h-6 text-primary-light" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-text-1 group-hover:text-primary-light transition-colors">Quiero organizar eventos</p>
                <p className="text-sm text-text-2 mt-0.5">Crea, gestiona y vende boletas para tus propios eventos.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => elegirProposito('asistente')}
              className="w-full text-left p-5 rounded-3xl border-2 border-border hover:border-accent/50 hover:bg-surface-2/40 transition-all group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                <TicketProposeIcon className="w-6 h-6 text-accent-light" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-text-1 group-hover:text-accent-light transition-colors">Solo quiero ir a eventos</p>
                <p className="text-sm text-text-2 mt-0.5">Explora eventos y compra o reserva tus boletas.</p>
              </div>
            </button>
          </div>

          <div className={`${staggerClass} flex items-center gap-3 my-6`} style={staggerStyle(3)}>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] uppercase tracking-widest text-text-3 whitespace-nowrap">o con Google</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className={`${staggerClass} w-full py-3.5 rounded-2xl border border-border-2 bg-surface hover:bg-surface-2 text-text-1 font-medium text-sm flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 min-h-[44px]`}
            style={staggerStyle(4)}
          >
            <GoogleIcon className="w-5 h-5 shrink-0" />
            {googleLoading ? 'Conectando…' : 'Registrarme con Google'}
          </button>
          <p className="text-xs text-text-3 mt-2 text-center">Con Google entras directo en modo Organizador; puedes cambiar a Asistente después desde el menú.</p>
        </div>
      )}

      {step === 'sent' && (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success/15 border border-success/30 mb-6">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight mb-3">Revisa tu correo</h1>
          <p className="text-base text-text-2 mb-2">Te enviamos un enlace de confirmación a</p>
          <p className="text-base text-text-1 font-semibold mb-6 break-all">{paso1.email}</p>
          <p className="text-sm text-text-3 mb-8">
            Haz click en el enlace para activar tu cuenta. Si no llega en 2 minutos, revisa la carpeta de spam.
            {invitacion?.invitado && ' Al confirmar, quedarás automáticamente vinculado al equipo que te invitó.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onResend}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-3 rounded-full border border-border-2 text-text-1 hover:bg-surface-2 text-sm font-medium transition-colors disabled:opacity-60 min-h-[44px]"
            >
              {loading ? 'Reenviando...' : 'Reenviar correo'}
            </button>
            <Link
              to="/login"
              className="w-full sm:w-auto px-5 py-3 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-colors text-center min-h-[44px] flex items-center justify-center"
            >
              Ir al login
            </Link>
          </div>
        </div>
      )}

      {step === 1 && (
        <div key="step1" className="animate-[fadeUp_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
          <button
            type="button"
            onClick={() => { setStep(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="text-xs text-text-3 hover:text-text-1 transition-colors mb-3 inline-flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Cambiar propósito
          </button>
          <h1
            className={`${staggerClass} text-3xl sm:text-4xl font-bold font-display tracking-tight mb-2`}
            style={staggerStyle(1)}
          >
            Acceder gratis
          </h1>
          <p className={`${staggerClass} text-base text-text-2 mb-6`} style={staggerStyle(2)}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-light hover:text-primary font-semibold transition-colors">Iniciar sesión</Link>
          </p>

          <form onSubmit={submitPaso1} className={`${staggerClass} space-y-4`} style={staggerStyle(5)}>
            {err && <div className="px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger-light text-sm">{err}</div>}

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="field">
                <label className="label">Nombre</label>
                <input name="nombre" value={paso1.nombre} onChange={onChange1}
                  className="input rounded-2xl py-3 text-base" placeholder="Juan Pérez"
                  required autoFocus style={{ fontSize: '16px' }} />
              </div>
              <div className="field">
                <label className="label">{esFlujoLigero ? 'Email' : 'Email empresarial'}</label>
                <input type="email" name="email" value={paso1.email} onChange={onChange1}
                  onBlur={onBlurEmail}
                  className="input rounded-2xl py-3 text-base" placeholder="juan@empresa.com"
                  required style={{ fontSize: '16px' }} />
              </div>
            </div>

            {invitacion?.invitado && (
              <div className="px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-sm text-text-2 leading-relaxed animate-[fadeUp_0.3s_ease_both]">
                <span className="text-text-1 font-medium">¡Te estaban esperando!</span> Fuiste invitado como <strong className="text-text-1">{invitacion.rol}</strong>
                {invitacion.eventoTitulo ? <> a <strong className="text-text-1">{invitacion.eventoTitulo}</strong></> : ''}. Solo necesitamos lo básico para crear tu cuenta.
              </div>
            )}

            <div className="field">
              <label className="label">Teléfono</label>
              <div className="grid grid-cols-[90px_1fr] gap-2">
                <select className="input rounded-2xl py-3 text-sm px-2">
                  <option>+57 CO</option>
                  <option>+1 US</option>
                  <option>+34 ES</option>
                  <option>+52 MX</option>
                </select>
                <input name="telefono" value={paso1.telefono} onChange={onChange1}
                  className="input rounded-2xl py-3 text-base min-w-0" placeholder="300 000 0000"
                  style={{ fontSize: '16px' }} />
              </div>
            </div>

            {!esFlujoLigero && (
              <>
                <div className="field">
                  <label className="label">Número esperado de participantes</label>
                  <select name="participantes" value={paso1.participantes} onChange={onChange1}
                    className="input rounded-2xl py-3 text-base" required style={{ fontSize: '16px' }}>
                    <option value="">Seleccionar...</option>
                    {PARTICIPANTES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="label">Para preparar tu entorno de trabajo</label>
                  <textarea
                    name="contexto" value={paso1.contexto} onChange={onChange1} rows={2}
                    className="input rounded-2xl py-3 text-base resize-none"
                    placeholder="Qué eventos organizas, frecuencia e industria. El agente IA usará esto."
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </>
            )}

            <div className="field">
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} name="password" value={paso1.password} onChange={onChange1}
                  className="input rounded-2xl py-3 pr-12 text-base" placeholder="Mínimo 8 caracteres"
                  minLength={8} required style={{ fontSize: '16px' }} />
                <button
                  type="button" onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2"
                >
                  {showPwd
                    ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l18 18M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-3.42M9.88 4.24A10.07 10.07 0 0112 4c5 0 9 4 10 8a13.43 13.43 0 01-2.6 3.94M6.6 6.6A13.43 13.43 0 002 12c1 4 5 8 10 8 1.59 0 3.07-.39 4.36-1.06"/></svg>
                    : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-text-3 leading-relaxed">
              Al continuar aceptas nuestros{' '}
              <a className="underline text-text-2 hover:text-text-1" href="/terminos" target="_blank" rel="noreferrer">términos y condiciones</a> y la{' '}
              <a className="underline text-text-2 hover:text-text-1" href="/privacidad" target="_blank" rel="noreferrer">política de privacidad</a>.
            </p>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white transition-all duration-200 active:scale-[0.99] hover:shadow-[0_0_40px_rgba(241,245,249,0.25)] min-h-[48px]"
            >
              Continuar
            </button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div key="step2" className="animate-[fadeUp_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
          <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight mb-2">
            {esFlujoLigero ? 'Casi listo' : 'Perfil del organizador'}
          </h1>
          <p className="text-base text-text-2 mb-6">
            {invitacion?.invitado
              ? 'Estos datos solo se usan dentro del equipo al que te uniste.'
              : esFlujoLigero
                ? 'Solo un par de datos más para terminar.'
                : 'Estos datos aparecen en tu página pública y en los correos a tus asistentes.'}
          </p>

          <form onSubmit={submitFinal} className="space-y-4">
            {err && <div className="px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger-light text-sm">{err}</div>}

            <div className="rounded-2xl border border-border bg-surface/40 p-4">
              <AvatarUploader
                value={paso2.fotoFile}
                onChange={file => setPaso2(p => ({ ...p, fotoFile: file }))}
                initials={paso1.nombre?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || 'U'}
                size={80}
              />
            </div>

            {!invitacion?.invitado && !esFlujoLigero && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="field">
                  <label className="label">Ocupación</label>
                  <input name="ocupacion" value={paso2.ocupacion} onChange={onChange2}
                    className="input rounded-2xl py-3 text-base" placeholder="Productor de eventos"
                    style={{ fontSize: '16px' }} />
                </div>
                <div className="field">
                  <label className="label">
                    Empresa{' '}
                    <span className="text-text-3 lowercase tracking-normal font-normal">(opcional)</span>
                  </label>
                  <input name="empresa" value={paso2.empresa} onChange={onChange2}
                    className="input rounded-2xl py-3 text-base" placeholder="Tu empresa"
                    style={{ fontSize: '16px' }} />
                </div>
              </div>
            )}

            {!invitacion?.invitado && (
              <div className="field">
                <label className="label">País</label>
                <select name="ciudad" value={paso2.ciudad} onChange={onChange2}
                  className="input rounded-2xl py-3 text-base" style={{ fontSize: '16px' }}>
                  <option value="">Seleccionar...</option>
                  {PAISES.map(p => (
                    <option key={p.code} value={p.nombre}>{bandera(p.code)} {p.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input type="checkbox" name="aceptar" checked={paso2.aceptar} onChange={onChange2}
                className="mt-0.5 w-5 h-5 rounded border-border bg-surface-2 accent-primary shrink-0" />
              <span className="text-xs text-text-2 leading-relaxed">
                Acepto los <a href="/terminos" target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="underline text-text-1 hover:text-primary-light">términos y condiciones</a> y la{' '}
                <a href="/privacidad" target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="underline text-text-1 hover:text-primary-light">política de privacidad</a>, y recibir comunicaciones por correo de GESTEK (puedo darme de baja cuando quiera).
              </span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="flex-1 py-3.5 rounded-2xl text-base font-medium text-text-1 border border-border-2 hover:bg-surface-2 transition-all duration-200 active:scale-[0.99] min-h-[48px]"
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white transition-all duration-200 active:scale-[0.99] hover:shadow-[0_0_40px_rgba(241,245,249,0.25)] disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2 min-h-[48px]"
              >
                {loading ? <InlineLoader message="Creando cuenta..." /> : 'Registrarme'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}
function CalendarProposeIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function TicketProposeIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;
}
