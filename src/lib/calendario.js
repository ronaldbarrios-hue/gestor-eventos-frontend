/* Link "Añadir a Google Calendar" — funciona SIN cuenta ni API: es el
   template público de Google. Cualquiera lo abre y guarda el evento en su
   propio calendario. Para agendar entrevistas con invitación real (crear el
   evento en el calendario del organizador) sí se usa la API con OAuth. */

function fmtUTC(d) {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function googleCalendarUrl({ titulo, inicio, fin, descripcion, lugar }) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo || 'Evento',
  });
  if (descripcion) p.set('details', descripcion);
  if (lugar) p.set('location', lugar);
  let url = `https://calendar.google.com/calendar/render?${p.toString()}`;
  if (inicio) {
    const start = fmtUTC(inicio);
    const end = fmtUTC(fin || new Date(new Date(inicio).getTime() + 2 * 3600 * 1000));
    url += `&dates=${start}/${end}`;
  }
  return url;
}
