/* Stub temporal — backend pendiente.
   Se reescribirá contra Supabase + endpoints Express. */

const pendiente = (op) => () => {
  console.warn(`[api/usuarios] ${op} pendiente — backend pendiente`);
  return Promise.reject(new Error('Backend en construcción — backend pendiente'));
};

export const usuariosApi = {
  list          : () => Promise.resolve({ usuarios: [] }),
  get           : pendiente('get'),
  mePermisos    : () => Promise.resolve({ permisos: [] }),
  updateRol     : pendiente('updateRol'),
  updatePermisos: pendiente('updatePermisos'),
  getPermisos   : () => Promise.resolve({ permisos: [] }),
  delete        : pendiente('delete'),
};
