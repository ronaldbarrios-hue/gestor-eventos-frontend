import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import { vacantesApi, formatoPago } from '../../api/vacantes.js';
import { useI18n } from '../../context/I18nContext.jsx';

/* ──────────────────────────────────────────────────────────────────
   Explorar — la vitrina pública de GESTEK.

   Dos categorías, porque hay dos públicos distintos entrando por aquí:
   quien busca a qué ir, y quien busca en qué trabajar. La bolsa de
   vacantes es lo que mueve la economía de los dos lados (el organizador
   consigue personal, la persona consigue trabajo), así que merece estar
   al mismo nivel que los eventos, no escondida dentro del panel.

   Esta página lleva la navbar y el tema del resto del sitio: es de
   GESTEK, no de un organizador. Las páginas de cada evento sí son marca
   blanca y ahí no aparece nada nuestro.
   ────────────────────────────────────────────────────────────────── */

const CATEGORIAS = [
  { id: 'eventos',  label: 'Eventos' },
  { id: 'vacantes', label: 'Vacantes para eventos' },
];

export default function ExplorarPage() {
  const { t, lang } = useI18n();
  const [categoria, setCategoria] = useState(() => (
    new URLSearchParams(window.location.search).get('ver') === 'vacantes' ? 'vacantes' : 'eventos'
  ));

  const cambiar = (id) => {
    setCategoria(id);
    const url = new URL(window.location.href);
    if (id === 'eventos') url.searchParams.delete('ver');
    else url.searchParams.set('ver', id);
    window.history.replaceState({}, '', url);
  };

  return (
    <section className="px-5 sm:px-8 py-12 max-w-6xl mx-auto">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">{t('Explorar')}</p>
        <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-text-1 mb-3">
          {categoria === 'eventos' ? t('Eventos públicos') : t('Trabaja en eventos')}
        </h1>
        <p className="text-base text-text-2 max-w-xl">
          {categoria === 'eventos'
            ? t('Descubre qué se está organizando con GESTEK ahora mismo. Reserva tu cupo o compra tu boleta desde la página pública de cada evento.')
            : t('Los organizadores publican aquí el personal que necesitan: logística, ingreso, sonido, cocina, guías. Arma tu perfil una vez y postúlate a lo que te sirva.')}
        </p>
      </header>

      <div className="flex items-center gap-1 border-b border-border mb-10 -mx-1 px-1 overflow-x-auto no-scrollbar">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            onClick={() => cambiar(c.id)}
            className={`relative px-4 py-2.5 text-[15px] font-medium whitespace-nowrap transition-colors
                        ${categoria === c.id ? 'text-text-1' : 'text-text-3 hover:text-text-2'}`}
          >
            {t(c.label)}
            {categoria === c.id && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {categoria === 'eventos' ? <ListaEventos t={t} lang={lang} /> : <ListaVacantes t={t} />}
    </section>
  );
}

/* ─────────── Eventos ─────────── */
function ListaEventos({ t, lang }) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    eventosApi.publicos({ limit: 60 })
      .then(d => setEventos(d.eventos || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (d) => d
    ? new Date(d).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  if (loading) return <Esqueleto />;
  if (error)   return <p className="text-center text-sm text-danger py-12">{error}</p>;
  if (!eventos.length) return (
    <p className="mt-10 text-center text-sm text-text-3">{t('Aún no hay eventos públicos. Vuelve pronto.')}</p>
  );

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {eventos.map(ev => (
        <Link
          key={ev.id}
          to={`/explorar/${ev.slug}`}
          className="group rounded-3xl border border-border bg-surface/40 hover:bg-surface/60 hover:border-primary/35 transition-all overflow-hidden flex flex-col"
        >
          <div className="aspect-video bg-gradient-to-br from-primary/20 via-accent/10 to-bg flex items-center justify-center border-b border-border overflow-hidden">
            {(ev.cover_url || ev.gallery?.[0])
              ? <img src={ev.cover_url || ev.gallery[0]} alt={ev.titulo} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              : <span className="text-xs font-medium text-text-3 uppercase tracking-widest">{ev.categoria?.nombre || t('Evento')}</span>}
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h3 className="text-base font-semibold text-text-1 mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {ev.titulo}
            </h3>
            <p className="text-xs text-text-2 mb-4">
              {fmt(ev.fecha_inicio)}{ev.location_nombre ? ` · ${ev.location_nombre}` : ''}
            </p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs text-text-3">
                {ev.organizador?.empresa || ev.organizador?.nombre || '—'}
              </span>
              <span className="text-xs text-primary group-hover:translate-x-0.5 transition-transform">{t('Ver')} →</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ─────────── Vacantes ─────────── */
function ListaVacantes({ t }) {
  const [vacantes, setVacantes] = useState([]);
  const [estado, setEstado] = useState('cargando'); // cargando | ok | sesion | error
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    setEstado('cargando');
    vacantesApi.explorar({})
      .then((d) => { setVacantes(d.vacantes || []); setEstado('ok'); })
      .catch((e) => {
        /* El listado ya es público, pero si el backend de turno todavía no
           tiene el cambio se cae con 401. En vez de un error crudo (o de
           echar al visitante a /login) se le ofrece entrar. */
        if (e?.status === 401 || e?.status === 403) { setEstado('sesion'); return; }
        setError(e?.message || String(e));
        setEstado('error');
      });
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (estado === 'cargando') return <Esqueleto alto="h-44" />;

  if (estado === 'sesion') return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
      <h3 className="text-lg font-semibold text-text-1 mb-2">{t('Entra para ver las vacantes')}</h3>
      <p className="text-sm text-text-2 max-w-md mx-auto mb-6">
        {t('Necesitas una cuenta para ver las ofertas y postularte. Crearla toma menos de un minuto y también te sirve para comprar boletas.')}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
        <Link to="/register" className="px-6 py-3 rounded-full text-sm font-semibold text-[#15171C] bg-gradient-primary shadow-glow-sm hover:shadow-glow transition-all">
          {t('Crear cuenta gratis')}
        </Link>
        <Link to="/login" className="px-6 py-3 rounded-full text-sm font-medium text-text-1 border border-border-2 hover:bg-surface-2 transition-colors">
          {t('Iniciar sesión')}
        </Link>
      </div>
    </div>
  );

  if (estado === 'error') return <p className="text-center text-sm text-danger py-12">{error}</p>;

  if (!vacantes.length) return (
    <p className="mt-10 text-center text-sm text-text-3">
      {t('Todavía no hay vacantes abiertas. Vuelve pronto.')}
    </p>
  );

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {vacantes.map(v => (
        <Link
          key={v.id}
          to={`/vacantes?v=${v.id}`}
          className="group rounded-3xl border border-border bg-surface/40 hover:bg-surface/60 hover:border-primary/35 transition-all p-5 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-1 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {v.titulo}
              </h3>
              <p className="text-xs text-text-3 truncate mt-1">{v.evento?.titulo}</p>
            </div>
            {v.destacada && (
              <span className="text-[10px] font-semibold uppercase tracking-widest bg-primary/15 text-primary px-2 py-0.5 rounded flex-shrink-0">
                {t('Destacada')}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {v.rol?.nombre && <Etiqueta>{v.rol.nombre}</Etiqueta>}
            {v.ciudad && <Etiqueta>{v.ciudad}</Etiqueta>}
            <Etiqueta>{t(String(v.modalidad || '').charAt(0).toUpperCase() + String(v.modalidad || '').slice(1))}</Etiqueta>
          </div>

          <p className="mt-auto pt-3 border-t border-border text-sm font-semibold text-success tabular-nums">
            {formatoPago(v.pago_monto, v.pago_moneda, v.pago_periodo)}
          </p>
        </Link>
      ))}
    </div>
  );
}

const Etiqueta = ({ children }) => (
  <span className="text-[10px] bg-surface-2 text-text-2 px-2 py-0.5 rounded-full">{children}</span>
);

const Esqueleto = ({ alto = 'h-72' }) => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className={`${alto} rounded-3xl border border-border bg-surface/40 animate-pulse`} />
    ))}
  </div>
);
