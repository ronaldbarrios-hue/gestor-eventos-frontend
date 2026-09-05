/* El cierre de una reunión de la rueda, en el navegador.
 *
 * Las mismas listas y el mismo informe que `lib/cierreDeCita.js` del servidor.
 * Aquí se usan para pintar y para poder enseñar el resumen sin esperar a que
 * el servidor lo calcule; el servidor sigue siendo el que manda y el que
 * valida.
 *
 * Vive en un módulo plano —no dentro del `.jsx`— porque es lógica y sus
 * pruebas tienen que poder correrla: node no importa JSX.
 */

export const RESULTADOS = [
  { id: 'realizada',  label: 'Sí, nos reunimos' },
  { id: 'no_asistio', label: 'No asistió' },
];

/* La lista corta es a propósito: sirve para agrupar en el informe, y un campo
   libre acabaría con «3 meses», «tres meses» y «3m» en la misma columna. */
export const PLAZOS = [
  { id: 'inmediato', label: 'Ya, o este mes' },
  { id: '3_meses',   label: 'En 3 meses' },
  { id: '6_meses',   label: 'En 6 meses' },
  { id: '12_meses',  label: 'En un año' },
];

export const etiquetaPlazo = (id) => PLAZOS.find(p => p.id === id)?.label || id;
export const etiquetaResultado = (id) => RESULTADOS.find(r => r.id === id)?.label || id;

/* ¿Ya se puede cerrar esta reunión?
 *
 * Antes de que empiece, preguntar «¿se realizó?» no tiene respuesta y ensucia
 * la pantalla de quien todavía está en la rueda. Se abre cuando la reunión ha
 * TERMINADO — con unos minutos de margen, porque el reloj del móvil y el del
 * servidor no coinciden al segundo y una cita que acaba «ahora mismo» ya se
 * puede cerrar de camino a la siguiente mesa. */
export function sePuedeCerrar(cita, ahora = new Date()) {
  if (!cita || cita.estado === 'cancelada') return false;
  const fin = new Date(cita.horario?.fin);
  if (Number.isNaN(fin.getTime())) return true;   // sin hora, que decida la persona
  return ahora.getTime() >= fin.getTime() - 2 * 60 * 1000;
}

/* El mismo cálculo que `informeDeCitas` del servidor.
 *
 * «Sin registrar» es una columna propia y no se reparte: una rueda donde nadie
 * cerró sus reuniones tiene que verse como lo que es —sin datos—, no como una
 * rueda con cero reuniones realizadas. Y la efectividad se calcula sobre lo
 * registrado: sobre el total convertiría «no lo sabemos» en «no ocurrió». */
export function resumenDeCitas(citas = []) {
  const r = {
    total: 0, canceladas: 0, agendadas: 0,
    realizadas: 0, no_asistio: 0, sin_registrar: 0,
    con_acuerdo: 0, con_expectativa: 0,
    expectativa_por_moneda: {},
  };

  for (const c of citas) {
    r.total++;
    if (c.estado === 'cancelada') { r.canceladas++; continue; }
    r.agendadas++;

    if (c.resultado === 'realizada') r.realizadas++;
    else if (c.resultado === 'no_asistio') r.no_asistio++;
    else r.sin_registrar++;

    if (c.hubo_acuerdo) r.con_acuerdo++;

    const monto = Number(c.expectativa_monto);
    if (Number.isFinite(monto) && monto > 0) {
      r.con_expectativa++;
      const m = c.expectativa_moneda || 'COP';
      r.expectativa_por_moneda[m] = (r.expectativa_por_moneda[m] || 0) + monto;
    }
  }

  const registradas = r.realizadas + r.no_asistio;
  return {
    ...r,
    registradas,
    efectividad: registradas > 0 ? Math.round((r.realizadas / registradas) * 100) : null,
  };
}

/* El informe, en la hoja de cálculo donde se va a acabar pegando.
 *
 * `;` y BOM por lo mismo que las notas: Excel en español abre los `,` en una
 * sola columna y sin el BOM convierte «Reunión» en «ReuniÃ³n». */
export function informeCSV(citas = [], tituloEvento = '') {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const cuando = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };
  const filas = [
    ['Evento', 'Fecha y hora', 'Mesa', 'Stand', 'Sector', 'Participante', 'Correo',
      'Estado', 'Resultado', 'Expectativa', 'Moneda', 'Plazo', 'Acuerdo', 'Qué se acordó']
      .map(esc).join(';'),
    ...citas.map(c => [
      tituloEvento,
      cuando(c.horario?.inicio),
      c.horario?.expositor?.nombre,
      c.horario?.expositor?.stand,
      c.horario?.expositor?.categoria_negocio,
      c.persona?.nombre,
      c.persona?.email,
      c.estado,
      /* Vacío y no «no» cuando nadie lo registró: son cosas distintas y el
         informe no puede inventarse la diferencia. */
      c.resultado ? etiquetaResultado(c.resultado) : '',
      c.expectativa_monto ?? '',
      c.expectativa_moneda ?? '',
      c.expectativa_plazo ? etiquetaPlazo(c.expectativa_plazo) : '',
      c.hubo_acuerdo === true ? 'Sí' : c.hubo_acuerdo === false ? 'No' : '',
      c.resultado_nota,
    ].map(esc).join(';')),
  ];
  return `﻿${filas.join('\r\n')}\r\n`;
}
