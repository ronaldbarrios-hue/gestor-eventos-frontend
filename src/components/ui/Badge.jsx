const ESTADO_MAP = {
  borrador  : { cls: 'badge-yellow', label: 'Borrador'   },
  publicado : { cls: 'badge-green',  label: 'Publicado'  },
  cancelado : { cls: 'badge-red',    label: 'Cancelado'  },
  finalizado: { cls: 'badge-gray',   label: 'Finalizado' },
  cerrado   : { cls: 'badge-gray',   label: 'Cerrado'    },
};

const MODALIDAD_MAP = {
  fisico  : { cls: 'badge-blue',   label: 'Físico'   },
  virtual : { cls: 'badge-purple', label: 'Virtual'  },
  hibrido : { cls: 'badge-green',  label: 'Híbrido'  },
};

const ROL_MAP = {
  admin_global: { cls: 'badge-purple', label: 'Admin Global' },
  organizador : { cls: 'badge-blue',   label: 'Organizador'  },
  asistente   : { cls: 'badge-gray',   label: 'Asistente'    },
};

export function EstadoBadge({ estado }) {
  const m = ESTADO_MAP[estado] || { cls: 'badge-gray', label: estado };
  return <span className={`${m.cls} badge-dot`}>{m.label}</span>;
}

export function ModalidadBadge({ modalidad }) {
  const m = MODALIDAD_MAP[modalidad] || { cls: 'badge-gray', label: modalidad };
  return <span className={m.cls}>{m.label}</span>;
}

export function RolBadge({ rol }) {
  const m = ROL_MAP[rol] || { cls: 'badge-gray', label: rol };
  return <span className={m.cls}>{m.label}</span>;
}
