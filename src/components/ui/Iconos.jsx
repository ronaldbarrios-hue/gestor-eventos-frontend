/* Los iconos de GESTEK.

   Sustituyen a los emoji del sistema (🎤 🏆 📅 📍 …), que tenían tres
   problemas y ninguno es de gusto:

     · Cada sistema los dibuja distinto. El mismo trofeo es dorado en Windows,
       plano en Android y otra cosa en iOS. Una interfaz que se ve distinta en
       cada máquina no tiene identidad.
     · Vienen con su propio color, siempre. No hay forma de que un emoji
       respete el latón y la noche, así que la paleta se rompe justo en los
       sitios donde hay más de ellos seguidos.
     · No se pueden escalar ni alinear con el texto de al lado: son glifos de
       otra fuente y siempre bailan un par de píxeles.

   Estos son SVG de trazo, `currentColor` y el mismo grosor que el resto de la
   aplicación (1.8), así que heredan el color de donde se pongan — incluido el
   color propio de cada tipo de sub-evento— y se alinean como cualquier texto.

   Son decorativos: van con `aria-hidden`, porque al lado siempre hay una
   etiqueta que ya dice lo que son. */

const TRAZOS = {
  /* Espacio del evento — los tipos de sub-evento */
  micro     : <><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" /><path d="M19 11a7 7 0 0 1-14 0M12 18v3" /></>,
  taller    : <><path d="M14.7 6.3a4 4 0 0 0 5 5L21 21H3l7.4-7.4a4 4 0 0 0 4.3-7.3Z" /><path d="M9 9 5 5" /></>,
  panel     : <><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" /></>,
  trofeo    : <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3" /><path d="M10 13v3h4v-3M8 20h8" /></>,
  show      : <><path d="M4 6h16v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V6Z" /><path d="M9 10h.01M15 10h.01M9.5 14a3 3 0 0 0 5 0" /></>,
  stand     : <><path d="M3 9h18l-1.5-4.5A2 2 0 0 0 17.6 3H6.4a2 2 0 0 0-1.9 1.5L3 9Z" /><path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" /><path d="M9 21v-6h6v6" /></>,
  diana     : <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
  proyeccion: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  estrella  : <><path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.8 6.7 19.7l1.1-6.1L3.4 9.4l6-.8L12 3Z" /></>,
  ceremonia : <><path d="m5 21 4-11 6 6-10 5Z" /><path d="M14 4v3M18.5 6.5 17 8M20 12h-3" /></>,
  pin       : <><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,

  /* Generales */
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  empresa   : <><path d="M4 21V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v15" /><path d="M15 10h4a1 1 0 0 1 1 1v10M3 21h18" /><path d="M7 9h1M7 13h1M11 9h1M11 13h1M8 21v-4h3v4" /></>,
  aviso     : <><path d="M12 4.5 2.8 20h18.4L12 4.5Z" /><path d="M12 10v4M12 17.5h.01" /></>,
  hecho     : <><path d="m4 12.5 5 5L20 6.5" /></>,
  imprimir  : <><path d="M7 8V3h10v5" /><path d="M5 8h14a2 2 0 0 1 2 2v6h-4M5 16H3v-6a2 2 0 0 1 2-2Z" /><rect x="7" y="14" width="10" height="7" rx="1" /></>,
  descargar : <><path d="M12 4v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M5 19h14" /></>,
  paleta    : <><path d="M12 3a9 9 0 1 0 0 18c1 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-1 .8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.3-9-7.3Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></>,
  adjunto   : <><path d="M20 11.5 12.4 19a5 5 0 0 1-7-7l7.8-7.8a3.3 3.3 0 1 1 4.7 4.7l-7.8 7.8a1.7 1.7 0 0 1-2.4-2.4l7-7" /></>,
  manos     : <><path d="M8 12 5.5 9.5a2 2 0 0 1 2.8-2.8L12 10l3.7-3.3a2 2 0 0 1 2.8 2.8L16 12" /><path d="M3 13.5 8 18a4 4 0 0 0 5.6 0L21 11" /></>,
  robot     : <><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4M9 14h.01M15 14h.01M9.5 17.5h5" /><circle cx="12" cy="3" r="1" /></>,
  camara    : <><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.5" /></>,
  documento : <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  entrada   : <><path d="M4 9V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6Z" /><path d="M13 5v2M13 11v2M13 17v2" /></>,
  megafono  : <><path d="M4 10v4a1 1 0 0 0 1 1h3l6 4V5L8 9H5a1 1 0 0 0-1 1Z" /><path d="M18 9a4 4 0 0 1 0 6" /></>,
  meta      : <><path d="M5 21V4M5 5h9l-1.5 3L14 11H5" /></>,
};

/* Las medallas del podio. Van aparte porque llevan número, y un 1/2/3 dentro
   del círculo se lee mejor que tres dibujos casi iguales. */
export function Medalla({ puesto, className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="14" r="6" />
      <path d="M9 3h6l-2 5h-2L9 3Z" />
      <text x="12" y="16.6" textAnchor="middle" fontSize="7" fill="currentColor" stroke="none"
            fontWeight="700">{puesto}</text>
    </svg>
  );
}

export default function Icono({ nombre, className = 'w-4 h-4' }) {
  const trazo = TRAZOS[nombre];
  if (!trazo) return null;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {trazo}
    </svg>
  );
}

export const NOMBRES_ICONO = Object.keys(TRAZOS);
