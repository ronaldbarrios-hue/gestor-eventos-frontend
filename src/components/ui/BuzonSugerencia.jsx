import { useState } from 'react';
import { sugerenciasApi } from '../../api/sugerencias.js';
import { useToast } from '../../context/ToastContext.jsx';

/* ──────────────────────────────────────────────────────────────────
   #49 · Buzón de sugerencias.

   Va pegado al selector que se quedó corto, no en una pantalla de "contacto".
   Ese es todo el truco: se pregunta en el segundo exacto en que la persona
   está mirando una lista y no encuentra lo suyo. Preguntado tres pantallas
   más tarde, ya nadie se acuerda de qué buscaba.

   Empieza como un enlace pequeño y sólo se abre si se toca: un formulario
   permanente al lado de cada `<select>` es ruido para quien sí encontró lo
   que venía a buscar — que son la mayoría.
   ────────────────────────────────────────────────────────────────── */

export default function BuzonSugerencia({ catalogo, contexto = {}, etiqueta }) {
  const { success, error: toastErr } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await sugerenciasApi.crear({ catalogo, texto: texto.trim(), contexto });
      setHecho(true);
      setTexto('');
      success('Anotado. Lo leemos y, si tiene sentido, entra al catálogo.');
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally { setEnviando(false); }
  };

  if (hecho) {
    return (
      <p className="text-[11px] text-success mt-1.5">
        ✓ Gracias — queda anotado.
      </p>
    );
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="text-[11px] text-text-3 hover:text-accent transition-colors mt-1.5 text-left">
        {etiqueta || '¿No está el tuyo? Dinos cuál falta'}
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-2 rounded-xl border border-border bg-surface-2/40 p-2.5 space-y-2">
      <label className="block text-[11px] text-text-2">
        {catalogo === 'evento'
          ? '¿Qué tipo de evento estás montando?'
          : '¿Qué rol estás buscando?'}
      </label>
      <input
        value={texto}
        onChange={e => setTexto(e.target.value)}
        maxLength={400}
        autoFocus
        placeholder={catalogo === 'evento' ? 'Ej. feria de adopción' : 'Ej. operador de dron'}
        className="input !h-9 text-sm w-full" />
      <div className="flex items-center gap-1.5">
        <button type="submit" disabled={enviando || !texto.trim()} className="btn btn-sm">
          {enviando ? 'Enviando…' : 'Enviar'}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="btn-ghost btn-sm">Cancelar</button>
      </div>
      <p className="text-[10px] text-text-3 leading-relaxed">
        No cambia nada ahora mismo: sigue adelante con la opción más parecida. Esto sirve
        para que la lista deje de quedarse corta.
      </p>
    </form>
  );
}
