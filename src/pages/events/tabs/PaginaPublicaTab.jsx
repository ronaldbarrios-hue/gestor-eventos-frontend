import { useState } from 'react';
import ExperienceBuilder from '../editor/ExperienceBuilder.jsx';

/* Tab Página pública — las tres formas de mirar lo mismo.
 *
 * ── Por qué son tres y no dos ──────────────────────────────────────
 *
 *   · **Página de GESTEK** — lo que ve el visitante, en un iframe de la página
 *     de verdad y no de una imitación. Con `?gestek=1` cuando el evento publica
 *     hacia fuera: si no, el editor de su propia página se iría a la web del
 *     organizador y no habría manera de ver lo que se está editando.
 *   · **Editor** — las secciones, o el lienzo libre.
 *   · **Datos** — la misma página escrita en el formato que valida el servidor,
 *     de donde se copia la página entera o un bloque suelto.
 *
 * Las tres estaban, y estaban escondidas una dentro de otra: al preview se
 * llegaba por defecto, al editor por un botón de la esquina y a los datos por
 * ningún sitio —vivían en un editor entero que no abría nadie—. Son tres formas
 * de mirar la misma página, así que se eligen en el mismo sitio. */

const DEVICES = [
  { id: 'desktop', label: 'Desktop', w: '100%', icon: DesktopIcon },
  { id: 'tablet',  label: 'Tablet',  w: '768px', icon: TabletIcon },
  { id: 'mobile',  label: 'Mobile',  w: '380px', icon: PhoneIcon },
];

export default function PaginaPublicaTab({ evento }) {
  const [mode, setMode] = useState('preview'); // preview | edit | datos
  const [device, setDevice] = useState('desktop');
  const [reloadKey, setReloadKey] = useState(0);

  /* `?gestek=1` fuerza la landing de GESTEK aunque el evento esté publicado
     hacia fuera (#32). Sin esto, un evento en modo "mi propia web" haría que
     su propio editor se fuera a la web del organizador y no habría manera de
     ver lo que se está editando. Lo que ve el público se dice aparte. */
  const modo = evento.modo_publico || 'gestek';
  const publicaFuera = modo !== 'gestek' && Boolean(evento.url_externa);
  const url = `/explorar/${evento.slug}${publicaFuera ? '?gestek=1' : ''}`;
  const previewWidth = DEVICES.find(d => d.id === device)?.w || '100%';

  if (mode === 'edit' || mode === 'datos') {
    return (
      <ExperienceBuilder
        evento={evento}
        abrirEnDatos={mode === 'datos'}
        /* Al volver se recarga el iframe: si no, la página recién guardada se
           sigue viendo como estaba y parece que no se guardó. */
        onClose={() => { setMode('preview'); setReloadKey(k => k + 1); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-border bg-surface/40 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {evento.estado !== 'publicado' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/30 text-[11px] text-warning font-medium">
              <DotIcon className="w-1.5 h-1.5 fill-warning" />
              Modo preview · solo tú ves esto
            </span>
          )}
          {publicaFuera && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-[11px] text-text-1 font-medium">
              <DotIcon className="w-1.5 h-1.5 fill-accent" />
              El público sale a tu web · esto es el respaldo
            </span>
          )}
          <span className="text-xs text-text-3 font-mono truncate hidden sm:inline">{url}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Device selector */}
          <div className="flex items-center gap-0.5 bg-surface-2 border border-border rounded-xl p-0.5 mr-2">
            {DEVICES.map(d => (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                aria-label={d.label}
                title={d.label}
                className={`p-1.5 rounded-lg transition-all ${device === d.id ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}
              >
                <d.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="btn-ghost btn-sm"
            title="Recargar preview"
          >
            <ReloadIcon className="w-3.5 h-3.5" />
            Recargar
          </button>

          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-secondary btn-sm"
          >
            <ExternalIcon className="w-3.5 h-3.5" />
            Abrir
          </a>

          <button onClick={() => setMode('datos')} className="btn-secondary btn-sm"
            title="La misma página como datos: copiar la página entera o un bloque suelto">
            <span className="font-mono text-[11px]">{'{ }'}</span>
            <span className="hidden sm:inline">Datos</span>
          </button>

          <button onClick={() => setMode('edit')} className="btn-gradient btn-sm">
            <EditIcon className="w-3.5 h-3.5" />
            Editar página pública
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-3xl border border-border-2 bg-bg p-3 sm:p-5 overflow-x-auto">
        <div className="mx-auto transition-all duration-500" style={{ maxWidth: previewWidth }}>
          <div className="rounded-2xl overflow-hidden border border-border shadow-card">
            <iframe
              key={reloadKey}
              src={url}
              title="Vista cliente del evento"
              className="w-full bg-bg"
              style={{ height: '75vh', minHeight: '600px' }}
            />
          </div>
        </div>
      </div>

      {/* El editor visual YA existe: está en el botón "Editor" de la barra de
          arriba. Aquí antes decía "Próximamente: editor visual drag & drop",
          anunciando como futuro algo construido y a diez centímetros. */}
      <div className="rounded-2xl border border-border bg-surface/40 px-5 py-3 text-xs text-text-3 leading-relaxed">
        Esto es <strong className="text-text-2">la página de GESTEK</strong>, tal cual la ve tu público
        —no una imitación: es la página de verdad dentro de un marco—. Para cambiarla, el{' '}
        <strong className="text-text-2">Editor</strong>: arrastras secciones y editas cada una. Y en{' '}
        <strong className="text-text-2">Datos</strong> la tienes escrita en el formato que valida el
        servidor, para copiar la página entera o un solo bloque y llevarlo a otra parte.
      </div>
    </div>
  );
}

function DesktopIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
}
function TabletIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="5" y="3" width="14" height="18" rx="2" /><line x1="12" y1="18" x2="12" y2="18" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}
function PhoneIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="7" y="3" width="10" height="18" rx="2" /><line x1="12" y1="18" x2="12" y2="18" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}
function ReloadIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
}
function ExternalIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;
}
function EditIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
}
function DotIcon({ className }) {
  return <svg className={className} viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>;
}
