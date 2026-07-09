import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { eventosApi } from '../../api/eventos.js';
import { pagosApi }   from '../../api/pagos.js';
import { BLOCKS } from '../events/editor/blocks.jsx';
import { BrandingProvider, BrandHeader, PoweredBy } from '../../components/public/Branding.jsx';
import Turnstile, { turnstileActivo } from '../../components/public/Turnstile.jsx';
import { useT } from '../../lib/i18n.js';

export default function EventoPublicoPage() {
  const { slug } = useParams();
  const { t } = useT();
  const [params, setParams] = useSearchParams();
  const [evento,  setEvento]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [reservaTipo, setReservaTipo] = useState(null);
  const [reservaOk,   setReservaOk]   = useState(null);
  const [waitlistTipo, setWaitlistTipo] = useState(null);

  useEffect(() => {
    setLoading(true);
    eventosApi.publicoBySlug(slug)
      .then(d => setEvento(d.evento))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const pages = useMemo(() => {
    if (!evento) return [];
    const pj = evento.page_json;
    if (pj?.pages?.length) return pj.pages;
    if (Array.isArray(pj?.blocks)) return [{ id: 'inicio', nombre: 'Inicio', blocks: pj.blocks }];
    return [{ id: 'inicio', nombre: 'Inicio', blocks: [] }];
  }, [evento]);

  const pageIdx = (() => {
    const p = Number(params.get('p') || 1);
    return Math.max(1, Math.min(pages.length, p));
  })();

  const activePage = pages[pageIdx - 1];

  if (loading) return (
    <section className="px-5 sm:px-8 py-12 max-w-5xl mx-auto">
      <div className="h-64 rounded-3xl bg-surface/40 border border-border animate-pulse" />
    </section>
  );

  if (error || !evento) return (
    <section className="px-5 sm:px-8 py-20 max-w-3xl mx-auto text-center">
      <p className="text-xs uppercase tracking-widest text-danger mb-3">Evento no encontrado</p>
      <h1 className="text-3xl font-bold font-display tracking-tight text-text-1 mb-4">
        {t('evento.no_encontrado_titulo')}
      </h1>
      <Link to="/explorar" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border-2 text-sm hover:bg-surface">
        {t('evento.volver_explorar')}
      </Link>
    </section>
  );

  return (
    <BrandingProvider organizador={evento.organizador}>
    <section className="px-5 sm:px-8 py-8 sm:py-12 max-w-5xl mx-auto">
      {/* Barra superior: volver + compartir + marca del organizador */}
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <Link to="/explorar"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                     text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Explorar eventos
        </Link>
        <div className="flex items-center gap-2">
          <ShareButton />
          <BrandHeader organizador={evento.organizador} />
        </div>
      </div>

      {/* Page tabs — arriba, antes del contenido */}
      {pages.length > 1 && (
        <nav className="mb-8 flex items-center justify-center gap-1.5 flex-wrap">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setParams(prev => { const x = new URLSearchParams(prev); x.set('p', String(i + 1)); return x; })}
              className={`min-w-[40px] h-10 px-4 rounded-full text-sm font-medium transition-all
                ${pageIdx === i + 1
                  ? 'bg-text-1 text-bg'
                  : 'border border-border text-text-2 hover:text-text-1 hover:bg-surface-2'}
              `}
              aria-current={pageIdx === i + 1 ? 'page' : undefined}
            >
              <span className="hidden sm:inline mr-1.5">{i + 1}.</span>
              {p.nombre}
            </button>
          ))}
        </nav>
      )}

      {/* Bloques */}
      <div className="space-y-8 max-w-3xl mx-auto" key={activePage?.id}>
        {(activePage?.blocks || []).map(block => {
          if (block.data?.oculto) return null;
          const B = BLOCKS[block.type];
          if (!B) return null;
          const Preview = B.Preview;
          return (
            <div key={block.id} className="animate-[fadeUp_0.4s_ease_both]">
              <Preview data={block.data || {}} evento={evento} onReservar={setReservaTipo} onWaitlist={setWaitlistTipo} />
            </div>
          );
        })}
      </div>

      {/* Volver a explorar */}
      <div className="mt-12 text-center">
        <Link to="/explorar" className="text-xs text-text-3 hover:text-text-1 transition-colors">
          ← Volver a explorar
        </Link>
        <PoweredBy organizador={evento.organizador} />
      </div>

      {/* Modales */}
      {reservaTipo && (
        <ReservaModal
          tipo={reservaTipo}
          slug={slug}
          currency={evento.currency}
          evento={evento}
          onClose={() => setReservaTipo(null)}
          onSuccess={(t) => { setReservaTipo(null); setReservaOk(t); }}
        />
      )}
      {reservaOk && (
        <ConfirmacionModal ticket={reservaOk} onClose={() => setReservaOk(null)} />
      )}
      {waitlistTipo && (
        <WaitlistModal
          tipo={waitlistTipo}
          slug={slug}
          onClose={() => setWaitlistTipo(null)}
        />
      )}
    </section>
    </BrandingProvider>
  );
}

/* ─────────── Botón compartir ─────────── */
function ShareButton() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {copied ? '¡Copiado!' : 'Compartir'}
    </button>
  );
}

/* ─────────── Modal lista de espera ─────────── */
function WaitlistModal({ tipo, slug, onClose }) {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '' });
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState('');
  const [captcha, setCaptcha] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (turnstileActivo && !captcha) { setErr('Completá la verificación anti-bot.'); return; }
    setWorking(true); setErr('');
    try {
      const { waitlistApi } = await import('../../api/waitlist.js');
      const r = await waitlistApi.join(slug, {
        ticket_type_id: tipo.id,
        nombre: form.nombre, email: form.email,
        captcha_token: captcha,
      });
      setDone({ posicion: r.entry?.posicion });
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setWorking(false); }
  };

  return (
    <ModalShell onClose={onClose}>
      {done ? (
        <div className="text-center py-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-warning/15 border border-warning/30 mb-5">
            <svg className="w-7 h-7 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight mb-2">¡Estás en la lista!</h2>
          <p className="text-sm text-text-2 mb-5 leading-relaxed max-w-sm mx-auto">
            Sos el <strong className="text-text-1">#{done.posicion}</strong> en la lista de espera de <strong className="text-text-1">{tipo.nombre}</strong>. Si se libera un cupo, el organizador te contactará por email.
          </p>
          <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
            Entendido
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-2">Lista de espera</p>
            <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">{tipo.nombre}</h2>
            <p className="text-sm text-text-2 mt-2 leading-relaxed">
              Este tipo de boleta está agotado. Anotate y te avisamos si se libera un cupo.
            </p>
          </div>
          {err && <div className="px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger-light text-sm">{err}</div>}
          <div className="field">
            <label className="label">Nombre completo *</label>
            <input required value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
              className="input rounded-2xl py-3 text-base" placeholder="Tu nombre" autoFocus />
          </div>
          <div className="field">
            <label className="label">Email *</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
              className="input rounded-2xl py-3 text-base" placeholder="tu@email.com" />
          </div>
          <div className="field">
            <label className="label">Teléfono <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
            <input value={form.telefono} onChange={e => setForm(f => ({...f, telefono: e.target.value}))}
              className="input rounded-2xl py-3 text-base" placeholder="300 000 0000" />
          </div>
          <Turnstile onToken={setCaptcha} />
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-full text-sm text-text-2 hover:text-text-1">Cancelar</button>
            <button type="submit" disabled={working}
              className="px-5 py-2.5 rounded-full bg-warning/90 text-bg hover:bg-warning text-sm font-semibold disabled:opacity-60 transition-all">
              {working ? 'Anotando...' : 'Anotarme en la lista'}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

function CampoDinamico({ campo, value, onChange }) {
  const req = campo.requerido;
  if (campo.tipo === 'checkbox') {
    return (
      <label className="flex items-start gap-2.5 text-sm text-text-2 cursor-pointer py-1">
        <input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded accent-primary" />
        <span>{campo.etiqueta}{req && <span
