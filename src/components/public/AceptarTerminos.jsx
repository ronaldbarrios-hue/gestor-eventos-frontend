import { useEffect, useState } from 'react';
import { eventosApi } from '../../api/eventos.js';

/* GESTEK — Aceptación de los términos DEL EVENTO en el formulario de registro.

   La 0059 dejó `evento_legal` y el endpoint público `/legal`, y el formulario
   nunca los llamó: seguía usando el viejo `page_json.checkout.terminos_activo`,
   que era opcional (apagado por defecto) y sólo aceptaba una URL externa. Un
   formulario que pide documento, teléfono y —con la ficha de caracterización—
   etnia, discapacidad o condición de víctima no puede pedirlos sin decir bajo
   qué condiciones, así que esto deja de ser opcional cuando el organizador
   tiene documentos publicados.

   Regla: si el evento TIENE documentos propios, la casilla es obligatoria. Si
   no los tiene, se enlazan los de GESTEK y no se bloquea — el organizador que
   todavía no escribió los suyos no puede dejar su evento sin vender. */

export function useLegalEvento(slug) {
  const [estado, setEstado] = useState({ cargando: true, legal: null, exige: false });

  useEffect(() => {
    if (!slug) { setEstado({ cargando: false, legal: null, exige: false }); return; }
    let vivo = true;
    eventosApi.legalPublico(slug)
      .then(d => {
        if (!vivo) return;
        setEstado({
          cargando: false,
          legal: d.legal || null,
          /* Basta con que haya términos: la privacidad puede vivir dentro del
             mismo documento y exigir las dos por separado dejaría fuera a quien
             escribió uno solo bien hecho. */
          exige: Boolean(d.tiene_terminos),
          tienePrivacidad: Boolean(d.tiene_privacidad),
          organizador: d.evento?.organizador,
        });
      })
      /* Que no se pueda leer el legal no puede impedir una compra: se cae al
         comportamiento de siempre (los términos de GESTEK) y se deja pasar. */
      .catch(() => { if (vivo) setEstado({ cargando: false, legal: null, exige: false }); });
    return () => { vivo = false; };
  }, [slug]);

  return estado;
}

/* Enlace a un documento del evento: si el organizador puso URL propia, gana;
   si sólo escribió el texto, se abre la página que lo sirve. */
function EnlaceLegal({ slug, url, cual, children }) {
  const destino = url || `/explorar/${slug}/legal#${cual}`;
  return (
    <a href={destino} target="_blank" rel="noreferrer noopener"
       className="text-primary-light hover:underline">{children}</a>
  );
}

export default function AceptarTerminos({ slug, estado, aceptado, onChange }) {
  const { cargando, legal, exige, tienePrivacidad } = estado;
  if (cargando) return <div className="h-10 rounded-xl bg-surface-2/40 animate-pulse" />;

  /* Sin documentos del organizador: los de GESTEK, informativos, como antes. */
  if (!exige) {
    return (
      <p className="text-[11px] text-text-3 leading-relaxed">
        Al continuar aceptas los{' '}
        <a href="/terminos" target="_blank" rel="noreferrer noopener" className="underline hover:text-text-2">términos y condiciones</a>{' '}
        y la{' '}
        <a href="/privacidad" target="_blank" rel="noreferrer noopener" className="underline hover:text-text-2">política de privacidad</a>{' '}
        de GESTEK.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-2/30 px-4 py-3 space-y-2">
      <label className="flex items-start gap-2.5 text-sm text-text-2 cursor-pointer">
        <input type="checkbox" checked={aceptado} onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded accent-primary shrink-0" />
        <span>
          He leído y acepto los{' '}
          <EnlaceLegal slug={slug} url={legal?.terminos_url} cual="terminos">términos y condiciones</EnlaceLegal>
          {tienePrivacidad && <>
            {' '}y la{' '}
            <EnlaceLegal slug={slug} url={legal?.privacidad_url} cual="privacidad">política de tratamiento de datos</EnlaceLegal>
          </>}
          {' '}de este evento.
          <span className="text-danger-light"> *</span>
        </span>
      </label>
      {legal?.responsable && (
        <p className="text-[11px] text-text-3 leading-relaxed pl-6">
          Responsable de tus datos: <span className="text-text-2">{legal.responsable}</span>
          {legal.contacto_datos && <> · {legal.contacto_datos}</>}
        </p>
      )}
      <p className="text-[11px] text-text-3 leading-relaxed pl-6">
        Además rigen los{' '}
        <a href="/terminos" target="_blank" rel="noreferrer noopener" className="underline hover:text-text-2">términos de GESTEK</a>
        {' '}como plataforma.
      </p>
    </div>
  );
}
