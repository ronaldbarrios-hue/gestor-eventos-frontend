import { useEffect, useState } from 'react';
import Criatura from '../agente/Criatura.jsx';

/* GESTEK — La espera de la primera carga, con alguien trabajando en ella.

   Lo que había era una rejilla de recuadros grises y un «Cargando…». Funciona,
   pero es la primera pantalla que se ve al entrar, todos los días, y no dice
   nada: unos rectángulos vacíos parecen una página rota tanto como una que
   carga.

   Es el único sitio de toda la aplicación donde vale la pena gastar
   presupuesto de deleite —el sondeo de `ANIMACIONES.md` lo pone como el caso
   raro, de primera impresión— así que aquí sí hay un personaje y un mensaje
   que cambia. En cualquier otro sitio esto sería ruido.

   Se reutiliza `Criatura` con su portátil, que es el bot que ya existe. Ni un
   dibujo nuevo: si algún día cambia su cara, cambia también aquí.

   Regla dura: se pinta SÓLO en la primera carga. En las recargas silenciosas
   —volver a una pestaña, refrescar datos— se mantiene lo que ya está en
   pantalla, porque sustituir contenido bueno por una animación es hacer que la
   aplicación parezca más lenta de lo que es. */

const MENSAJES = [
  'Poniéndote en línea con tus eventos…',
  'Contando boletas…',
  'Revisando lo que quedó pendiente…',
];

export default function PantallaCarga({ mensaje, alto = 'min-h-[52vh]' }) {
  /* El mensaje va rotando para que una espera larga no parezca colgada. Tres
     segundos: menos parpadea, más y no se llega a ver el segundo. */
  const [i, setI] = useState(0);
  useEffect(() => {
    if (mensaje) return undefined;
    const id = setInterval(() => setI(n => (n + 1) % MENSAJES.length), 3000);
    return () => clearInterval(id);
  }, [mensaje]);

  const texto = mensaje || MENSAJES[i];

  return (
    <div className={`${alto} flex flex-col items-center justify-center gap-5 text-center animate-[fadeIn_0.3s_ease_both]`}>
      <Criatura mood="thinking" size={132} conPortatil />
      <div>
        {/* `key` en el texto para que cada mensaje entre por su cuenta; sin
            eso React sólo cambia el contenido y el relevo no se nota. */}
        <p key={texto} className="text-sm text-text-2 animate-[fadeUp_0.4s_ease_both]">{texto}</p>
        <p className="text-[11px] text-text-3 mt-1.5">Un momento</p>
      </div>
    </div>
  );
}
