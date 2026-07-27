import client from './client.js';

/* Cliente del módulo "Explorar vacantes disponibles" (bolsa de empleo). */
export const vacantesApi = {
  /* ── Candidato · perfil de talento ── */
  miPerfil       : ()          => client.get('/me/talento').then(r => r.data),
  guardarPerfil  : (body)      => client.put('/me/talento', body).then(r => r.data),
  publicarPerfil : (publicado) => client.post('/me/talento/publicar', { publicado }).then(r => r.data),
  verificar      : ()          => client.post('/me/talento/verificacion').then(r => r.data),

  /* ── Roles (catálogo curado + propios) ── */
  roles   : ()       => client.get('/vacantes/roles').then(r => r.data),
  crearRol: (nombre) => client.post('/vacantes/roles', { nombre }).then(r => r.data),

  /* ── Candidato · explorar y postularse ── */
  explorar        : (params)     => client.get('/vacantes', { params }).then(r => r.data),
  detalle         : (id)         => client.get(`/vacantes/${id}`).then(r => r.data),
  postular        : (id, body)   => client.post(`/vacantes/${id}/postular`, body).then(r => r.data),
  misPostulaciones: ()           => client.get('/me/postulaciones').then(r => r.data),
  retirar         : (id)         => client.delete(`/me/postulaciones/${id}`).then(r => r.data),
  resenarOrganizador: (postId, body) => client.post(`/me/postulaciones/${postId}/resena`, body).then(r => r.data),
  perfilPublico   : (userId)     => client.get(`/perfil-talento/${userId}`).then(r => r.data),
  miReputacionOrganizador: ()    => client.get('/me/organizador/reputacion').then(r => r.data),

  /* ── Organizador (dentro del evento) ── */
  listar        : (eventoId)          => client.get(`/eventos/${eventoId}/vacantes`).then(r => r.data),
  crear         : (eventoId, body)    => client.post(`/eventos/${eventoId}/vacantes`, body).then(r => r.data),
  editar        : (eventoId, id, body)=> client.patch(`/eventos/${eventoId}/vacantes/${id}`, body).then(r => r.data),
  borrar        : (eventoId, id)      => client.delete(`/eventos/${eventoId}/vacantes/${id}`).then(r => r.data),
  postulaciones : (eventoId, vid)     => client.get(`/eventos/${eventoId}/vacantes/${vid}/postulaciones`).then(r => r.data),
  moverEtapa    : (eventoId, vid, pid, body) => client.patch(`/eventos/${eventoId}/vacantes/${vid}/postulaciones/${pid}`, body).then(r => r.data),
  agendarEntrevista: (eventoId, vid, pid, body) => client.post(`/eventos/${eventoId}/vacantes/${vid}/postulaciones/${pid}/entrevista`, body).then(r => r.data),
  resenarTrabajador: (eventoId, vid, pid, body) => client.post(`/eventos/${eventoId}/vacantes/${vid}/postulaciones/${pid}/resena`, body).then(r => r.data),
  talento       : (eventoId, params)  => client.get(`/eventos/${eventoId}/talento`, { params }).then(r => r.data),
  destacar      : (eventoId, id, body)=> client.post(`/eventos/${eventoId}/vacantes/${id}/destacar`, body).then(r => r.data),
};

/* Formatea dinero {monto, moneda} — COP sin decimales, otras con Intl. */
export function formatoPago(monto, moneda = 'COP', periodo = 'evento') {
  const n = Number(monto || 0);
  let txt;
  try {
    txt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(n);
  } catch { txt = `$${n.toLocaleString('es-CO')} ${moneda}`; }
  const suf = periodo === 'dia' ? ' / día' : periodo === 'hora' ? ' / hora' : '';
  return txt + suf;
}

export const ETAPAS_VACANTE = [
  { id: 'postulado',  label: 'Postulado' },
  { id: 'revisado',   label: 'Revisado' },
  { id: 'entrevista', label: 'Entrevista' },
  { id: 'oferta',     label: 'Oferta' },
  { id: 'aceptado',   label: 'Aceptado' },
  { id: 'rechazado',  label: 'Rechazado' },
];
