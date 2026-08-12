import { Link } from 'react-router-dom';
import { BrandHeader } from './Branding.jsx';
import Icono from '../ui/Icono.jsx';

/* Envoltorio de las páginas públicas que cuelgan de un evento: la rueda de
   negocios, la agenda y el torneo.

   Las tres eran un <section> pelado con un título. Sin la marca del organizador,
   sin decir de qué evento se trata más que en letra pequeña, y —lo peor— sin
   forma de volver: quien entraba por un enlace directo a /networking se quedaba
   ahí, en una página que flota. Solo las pantallas de error tenían un "volver".

   Se comparte para que las tres se vean como el mismo sitio. Antes había que
   arreglarlo tres veces y acordarse de las tres. */
export default function EventoSubPagina({
  evento,
  slug,
  titulo,
  descripcion,
  /* Pestañas opcionales: [{ id, label }] */
  tabs,
  tabActiva,
  onTab,
  /* Ancho del contenido. Las tablas y las rejillas piden más aire. */
  ancho = 'max-w-4xl',
  children,
}) {
  return (
    <div className="min-h-screen">
      {/* Cabecera: la marca del organizador y la vuelta al evento */}
      <header className="border-b border-border bg-surface/40 backdrop-blur-sm">
        <div className={`${ancho} mx-auto px-5 py-4 flex items-center justify-between gap-4 flex-wrap`}>
          <Link
            to={`/explorar/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-text-2 hover:text-text-1 transition-colors min-w-0"
          >
            <Icono name="subcanal" className="w-4 h-4 rotate-180 flex-shrink-0" />
            <span className="truncate">{evento?.titulo || 'Volver al evento'}</span>
          </Link>

          {evento?.organizador && (
            <div className="flex-shrink-0">
              <BrandHeader organizador={evento.organizador} size="sm" />
            </div>
          )}
        </div>
      </header>

      <section className={`${ancho} mx-auto px-5 py-8 animate-[fadeUp_0.4s_ease_both]`}>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-text-1">{titulo}</h1>
          {descripcion && <p className="text-sm text-text-2 mt-1.5 leading-relaxed max-w-2xl">{descripcion}</p>}
        </div>

        {tabs?.length > 1 && (
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 w-fit mb-6 overflow-x-auto no-scrollbar max-w-full">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => onTab?.(t.id)}
                aria-current={tabActiva === t.id ? 'page' : undefined}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0
                  ${tabActiva === t.id ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {children}
      </section>

      {/* Pie: la otra forma de volver, para quien llega al final scrolleando */}
      <footer className={`${ancho} mx-auto px-5 pb-10`}>
        <div className="border-t border-border pt-5 flex items-center justify-between gap-4 flex-wrap">
          <Link to={`/explorar/${slug}`} className="text-sm text-text-3 hover:text-text-1 transition-colors">
            ← Volver a {evento?.titulo || 'el evento'}
          </Link>
          <Link to="/explorar" className="text-sm text-text-3 hover:text-text-1 transition-colors">
            Explorar otros eventos
          </Link>
        </div>
      </footer>
    </div>
  );
}
