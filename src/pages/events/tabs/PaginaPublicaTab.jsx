import { useState } from 'react';
import PageBuilder from '../editor/PageBuilder.jsx';

/* Tab Página pública — alterna entre Preview (vista cliente con iframe)
   y Editor (constructor visual de bloques). */

const DEVICES = [
  { id: 'desktop', label: 'Desktop', w: '100%', icon: DesktopIcon },
  { id: 'tablet',  label: 'Tablet',  w: '768px', icon: TabletIcon },
  { id: 'mobile',  label: 'Mobile',  w: '380px', icon: PhoneIcon },
];

export default function PaginaPublicaTab({ evento }) {
  const [mode, setMode] = useState('preview'); // preview | edit
  const [device, setDevice] = useState('desktop');
  const [reloadKey, setReloadKey] = useState(0);

  const url = `/explorar/${evento.slug}`;
  const previewWidth = DEVICES.find(d => d.id === device)?.w || '100%';

  if (mode === 'edit') {
    return <PageBuilder evento={evento} onClose={() => { setMode('preview'); setReloadKey(k => k + 1); }} />;
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

      {/* Footer info */}
      <div className="rounded-2xl border border-border bg-surface/40 px-5 py-3 text-xs text-text-3 leading-relaxed">
        <strong className="text-text-2">Próximamente:</strong> editor visual drag &amp; drop para personalizar bloques (hero, agenda, speakers, FAQ, mapa, ticket box, video) sin código.
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
