/* Gestbot en el sidebar del evento.

   Antes había una caja que decía "¿Necesitas ayuda?" con un botón. Es la
   pregunta más inútil que puede hacer un asistente: quien está atascado no
   sabe que lo está, y quien sabe lo que busca no necesita que se lo
   pregunten. Ocupaba sitio y no adelantaba nada.

   Ahora el bot trabaja ahí y de vez en cuando saca un bocadillo diciendo algo
   CONCRETO de este evento: que no tiene portada, que no tiene tipos de
   boleta, que no tiene sitio, que sigue en borrador. Todos los avisos salen
   de campos reales del evento, así que ninguno puede aparecer cuando no toca.

   Los avisos van en orden: primero lo que impide vender, después lo que se
   ve mal en la página pública, y al final publicar. No tiene sentido decirle
   a alguien que publique un evento que todavía no tiene qué vender.

   Si no falta nada, no dice nada. Un asistente que habla cuando no hay motivo
   se convierte en ruido, y a partir de ahí ya nadie lee lo que dice. */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitudesApi } from '../../api/solicitudes.js';
import Criatura from './Criatura.jsx';

const SEGUNDOS_POR_AVISO = 9;

/* `solicitudesPendientes` llega de fuera porque no vive en el evento: son
   filas de otra tabla. Se pasa como número para que esta función siga siendo
   pura y se pueda leer de un vistazo qué dispara cada aviso. */
export function avisosDelEvento(evento, { solicitudesPendientes = 0 } = {}) {
  if (!evento) return [];
  const avisos = [];

  /* `undefined` no es «no hay»: es «no lo sé». La petición del panel no traía
     `ticket_types`, así que este aviso saltaba en TODOS los eventos, tuvieran
     cuatro tipos o ninguno. Se avisa sólo cuando la lista llegó y viene vacía:
     un consejero que se equivoca siempre enseña a ignorar también los avisos
     que sí aciertan. */
  if (Array.isArray(evento.ticket_types) && evento.ticket_types.length === 0) {
    avisos.push({ id: 'boletas', texto: 'Este evento todavía no tiene tipos de boleta. Sin eso nadie puede inscribirse.' });
  }
  /* Alguien esperando respuesta es lo único de la lista que le pasa a una
     PERSONA y no al evento, así que va justo detrás de lo que impide vender.
     El resto puede esperar a mañana; esto no. */
  if (solicitudesPendientes > 0) {
    avisos.push({
      id: 'solicitudes',
      texto: solicitudesPendientes === 1
        ? 'Hay una solicitud sin responder.'
        : `Hay ${solicitudesPendientes} solicitudes sin responder.`,
    });
  }
  if (!evento.cover_url) {
    avisos.push({ id: 'portada', texto: 'Le falta la portada. Es lo primero que ve quien abre la página.' });
  }
  /* La marca del evento pisa la del organizador; si no hay ninguna de las
     dos, la página pública sale con el logo de GESTEK y el evento parece de
     otro. */
  const logo = evento.page_json?.branding?.logo_url || evento.organizador?.empresa_logo_url;
  if (!logo) {
    avisos.push({ id: 'logo', texto: 'No hay logo. Sin él tu página sale con la marca de GESTEK, no con la tuya.' });
  }
  if (!evento.location_nombre) {
    avisos.push({ id: 'sitio', texto: 'No has puesto el sitio. Es de lo primero que preguntan.' });
  }
  if (!evento.descripcion) {
    avisos.push({ id: 'descripcion', texto: 'No hay descripción. Cuesta decidir ir a algo que no se explica.' });
  }
  if (evento.estado === 'borrador' && avisos.length === 0) {
    avisos.push({ id: 'publicar', texto: 'Está listo y sigue en borrador. Publícalo cuando quieras.' });
  }

  return avisos;
}

export default function GestbotSidebar({ evento }) {
  /* Las solicitudes se piden aquí y no se reciben de arriba: el workspace no
     las carga, y hacer que las cargue para pasárselas al bot obligaría a que
     todas las pestañas esperasen por una consulta que sólo usa una esquina.
     Si falla, se queda en cero y los demás avisos siguen saliendo. */
  const [solicitudesPendientes, setSolicitudes] = useState(0);
  useEffect(() => {
    if (!evento?.id) return undefined;
    let vivo = true;
    solicitudesApi.list(evento.id)
      .then(d => {
        if (!vivo) return;
        const abiertas = (d.solicitudes || d || [])
          .filter(s => s.estado === 'pendiente' || s.estado === 'abierta');
        setSolicitudes(abiertas.length);
      })
      /* Una cifra en una insignia. Si no llega, no se pinta — y no tener
         insignia se entiende solo. */
      .catch(() => {});
    return () => { vivo = false; };
  }, [evento?.id]);

  const avisos = avisosDelEvento(evento, { solicitudesPendientes });
  const [i, setI] = useState(0);

  /* Van rotando, porque tres bocadillos a la vez no se leen y uno fijo se
     vuelve invisible a los dos días. */
  useEffect(() => {
    if (avisos.length < 2) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setI(n => (n + 1) % avisos.length), SEGUNDOS_POR_AVISO * 1000);
    return () => clearInterval(id);
  }, [avisos.length]);

  const aviso = avisos[i % (avisos.length || 1)];
  const destino = `/gestbot?evento=${evento?.id}&nom=${encodeURIComponent(evento?.titulo || '')}`;

  return (
    <Link
      to={destino}
      className="group block rounded-2xl bg-sidebar-2 border border-white/5 p-3 hover:border-accent/40 transition-colors"
      title="Abrir Gestbot"
    >
      {aviso && (
        <div
          key={aviso.id}
          className="relative mb-2 rounded-xl bg-sidebar-3 border border-white/5 px-3 py-2
                     animate-[fadeUp_0.45s_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          <p className="text-[12px] text-slate-200 leading-snug">{aviso.texto}</p>
          {/* El pico del bocadillo, apuntando al bot */}
          <span className="absolute -bottom-1.5 left-5 w-3 h-3 rotate-45 bg-sidebar-3 border-r border-b border-white/5" />
        </div>
      )}

      <div className="flex items-center gap-2.5">
        <div className="flex-shrink-0 -my-1">
          <Criatura size={44} mood={aviso ? 'talking' : 'happy'} />
        </div>
        <p className="text-[12.5px] text-slate-400 group-hover:text-white transition-colors leading-tight">
          {aviso ? 'Hablar con Gestbot' : 'Gestbot está pendiente de este evento'}
        </p>
      </div>
    </Link>
  );
}
