import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import { BLOCKS } from '../events/editor/blocks.jsx';
import GLoader from '../../components/ui/GLoader.jsx';
import BarraEvento from '../../components/public/BarraEvento.jsx';
import EventoNoEncontrado from '../../components/public/EventoNoEncontrado.jsx';

/* GESTEK — El plano del evento, en público.

   El mapa se configuraba en el panel (Espacio del evento → Mapa), se guardaba
   en `page_json.mapa` con los expositores y las actividades ubicados… y no
   había forma de verlo. Sólo aparecía si el organizador se acordaba de añadir
   el bloque «Mapa del evento» a su landing, y el que no lo hacía —que es lo
   normal, porque nada se lo dice— dejaba ese trabajo invisible.

   Es la misma clase de fallo que ya salió con la tarjeta del asistente: algo
   que se configura, se guarda y nadie ve nunca.

   Aquí no se dibuja nada nuevo: se reutiliza el mismo bloque que pinta el mapa
   dentro de la landing y dentro del iframe. Una sola forma de dibujarlo, tres
   sitios donde aparece. */

export default function MapaPublicoPage() {
  const { slug } = useParams();
  const [evento, setEvento] = useState(undefined);

  useEffect(() => {
    let vivo = true;
    eventosApi.publicoBySlug(slug)
      .then(d => { if (vivo) setEvento(d.evento); })
      .catch(() => { if (vivo) setEvento(null); });
    return () => { vivo = false; };
  }, [slug]);

  if (evento === undefined) return (
    <section className="px-5 py-20 max-w-2xl mx-auto"><GLoader message="Cargando el mapa…" /></section>
  );

  if (!evento) return (
    <EventoNoEncontrado />
  );

  const mapa = evento.page_json?.mapa;
  /* El bloque trae sus propios títulos por defecto: servirlo con `data` vacía
     lo dejaría sin encabezado y parecería roto. */
  const bloque = BLOCKS.mapa_evento;
  const data = { ...(bloque?.defaults || {}) };
  const Preview = bloque?.Preview;

  return (
    <section className="px-5 py-10 max-w-4xl mx-auto animate-[fadeUp_0.4s_ease_both]">
      <BarraEvento actual="mapa" evento={evento} />
      {mapa && Preview
        ? <Preview data={data} evento={evento} />
        : (
          <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
            <p className="text-sm text-text-3">Este evento todavía no publicó su mapa.</p>
          </div>
        )}
    </section>
  );
}
