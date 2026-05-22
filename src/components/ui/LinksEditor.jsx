/* Editor dinámico de links del evento.
   El organizador pulsa "+" y elige el tipo (Zoom, YouTube, Instagram, etc.).
   Cada link se guarda como { tipo, url, label? }. */

const TIPOS = [
  { value: 'zoom',      label: 'Zoom',          placeholder: 'https://zoom.us/j/...' },
  { value: 'meet',      label: 'Google Meet',   placeholder: 'https://meet.google.com/...' },
  { value: 'teams',     label: 'Microsoft Teams', placeholder: 'https://teams.microsoft.com/...' },
  { value: 'youtube',   label: 'YouTube Live',  placeholder: 'https://youtube.com/live/...' },
  { value: 'twitch',    label: 'Twitch',        placeholder: 'https://twitch.tv/...' },
  { value: 'instagram', label: 'Instagram',     placeholder: 'https://instagram.com/...' },
  { value: 'tiktok',    label: 'TikTok',        placeholder: 'https://tiktok.com/@...' },
  { value: 'x',         label: 'X / Twitter',   placeholder: 'https://x.com/...' },
  { value: 'facebook',  label: 'Facebook',      placeholder: 'https://facebook.com/...' },
  { value: 'whatsapp',  label: 'WhatsApp',      placeholder: 'https://wa.me/57...' },
  { value: 'web',       label: 'Sitio web',     placeholder: 'https://...' },
  { value: 'custom',    label: 'Otro',          placeholder: 'https://...' },
];

const TIPO_MAP = Object.fromEntries(TIPOS.map(t => [t.value, t]));

export default function LinksEditor({ value = [], onChange, title = 'Links de transmisión y redes' }) {
  const links = Array.isArray(value) ? value : [];

  const updateAt = (i, patch) => {
    const next = [...links];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const removeAt = (i) => {
    onChange(links.filter((_, idx) => idx !== i));
  };

  const add = () => {
    onChange([...links, { tipo: 'zoom', url: '', label: '' }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label !mb-0">{title}</label>
        <span className="text-[11px] text-text-3">{links.length} agregado{links.length !== 1 ? 's' : ''}</span>
      </div>

      {links.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-6 text-center">
          <p className="text-xs text-text-3 mb-3">Agrega links de streaming o redes sociales del evento.</p>
          <button type="button" onClick={add} className="btn-secondary btn-sm inline-flex">
            <PlusIcon className="w-3.5 h-3.5" />
            Agregar primer link
          </button>
        </div>
      )}

      {links.length > 0 && (
        <div className="space-y-2.5 animate-[fadeUp_0.25s_ease_both]">
          {links.map((link, i) => {
            const meta = TIPO_MAP[link.tipo] || TIPO_MAP.custom;
            return (
              <div
                key={i}
                className="grid grid-cols-[130px_1fr_auto] gap-2 items-center animate-[fadeUp_0.2s_ease_both]"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <select
                  value={link.tipo}
                  onChange={e => updateAt(i, { tipo: e.target.value })}
                  className="input bg-surface-2 rounded-xl py-2.5 text-sm"
                >
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input
                  type="url"
                  value={link.url}
                  onChange={e => updateAt(i, { url: e.target.value })}
                  placeholder={meta.placeholder}
                  className="input rounded-xl py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Quitar link"
                  className="w-9 h-9 rounded-xl text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={add}
            className="w-full mt-1 py-2.5 rounded-xl border border-dashed border-border text-sm text-text-2 hover:text-text-1 hover:border-border-2 hover:bg-surface-2/40 transition-all inline-flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Agregar otro link
          </button>
        </div>
      )}
    </div>
  );
}

function PlusIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
}
function TrashIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}
