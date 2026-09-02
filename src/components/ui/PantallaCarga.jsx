import { useEffect, useState } from 'react';
import GLoader from './GLoader.jsx';
import { empiezaCarga } from '../../lib/cargaGlobal.js';

/* GESTEK — La espera de la primera carga.
 *
 * Lo que había antes era una rejilla de recuadros grises y un «Cargando…».
 * Funciona, pero es la primera pantalla que se ve al entrar, todos los días, y
 * no dice nada: unos rectángulos vacíos parecen una página rota tanto como una
 * que carga. De ahí el mensaje que rota, que sigue aquí.
 *
 * ── Por qué el logo y no el robot ─────────────────────────────────────────
 *
 * Aquí había un `Criatura` grande con su portátil. Se cambió por el nudo de
 * marca (`GLoader`) por dos razones:
 *
 *  · El robot ya vive en la barra lateral, permanentemente. Ponerlo también en
 *    el centro de la pantalla de carga era el mismo personaje dos veces, y al
 *    entrar el de la carga desaparecía para dejar ver... al otro.
 *  · Es la primera pantalla del día. Lo que conviene que se fije ahí es la
 *    marca, no la mascota.
 *
 * El robot no pierde su papel: es el de la barra lateral el que ahora dice
 * «Poniéndote en línea…» mientras esto carga, así que el personaje sigue
 * acompañando la espera — desde donde ya estaba.
 *
 * Regla dura: se pinta SÓLO en la primera carga. En las recargas silenciosas
 * —volver a una pestaña, refrescar datos— se mantiene lo que ya está en
 * pantalla, porque sustituir contenido bueno por una animación es hacer que la
 * aplicación parezca más lenta de lo que es. */

const MENSAJES = [
  'Poniéndote en línea con tus eventos…',
  'Contando boletas…',
  'Revisando lo que quedó pendiente…',
];

export default function PantallaCarga({ mensaje, alto = 'min-h-[52vh]' }) {
  /* Avisa al acompañante de la barra lateral de que hay una espera en curso,
     para que la narre él. Se apaga solo al desmontar. */
  useEffect(() => empiezaCarga(), []);

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
      <GLoader size="lg" />
      <div>
        {/* `key` en el texto para que cada mensaje entre por su cuenta; sin
            eso React sólo cambia el contenido y el relevo no se nota. */}
        <p key={texto} className="text-sm text-text-2 animate-[fadeUp_0.4s_ease_both]">{texto}</p>
        <p className="text-[11px] text-text-3 mt-1.5">Un momento</p>
      </div>
    </div>
  );
}
