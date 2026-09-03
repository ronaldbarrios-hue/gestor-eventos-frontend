import Volver from '../ui/Volver.jsx';

/* La pantalla de «aquí no hay evento», una sola vez.

   Estaba copiada en las seis páginas públicas que cuelgan de un evento —agenda,
   mapa, rueda, ranking, torneo y el resumen de torneos— con el mismo texto y el
   mismo hueco, y con seis «← Volver a explorar» escritos a mano.

   Aquí la vuelta a explorar SÍ es la correcta, al revés que en el resto de la
   navegación pública: cuando el evento no existe no hay evento al que volver, y
   el directorio es lo único que queda. */
export default function EventoNoEncontrado({ mensaje }) {
  return (
    <section className="px-5 py-20 max-w-md mx-auto text-center animate-[fadeUp_0.4s_ease_both]">
      <p className="text-sm text-text-1 mb-1.5">{mensaje || 'Este evento no está disponible.'}</p>
      <p className="text-xs text-text-3 mb-5">
        Puede que se haya despublicado, o que el enlace esté mal copiado.
      </p>
      <Volver a="/explorar" tono="chip">Ver otros eventos</Volver>
    </section>
  );
}
