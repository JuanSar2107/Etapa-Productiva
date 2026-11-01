import { ETIQUETAS_ESTADO, type EstadoContacto } from '@ep/shared';

export const COLORES_ESTADO: Record<EstadoContacto, string> = {
  SIN_CONTACTAR: 'bg-slate-100 text-slate-700',
  PENDIENTE: 'bg-sky-100 text-sky-800',
  ENVIADO: 'bg-indigo-100 text-indigo-800',
  RESPONDIO: 'bg-marca-100 text-marca-700',
  RECHAZADO: 'bg-red-100 text-red-700',
  NO_CONTACTAR: 'bg-amber-100 text-amber-800',
};

export function EstadoEmpresa({ estado }: { estado: EstadoContacto }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORES_ESTADO[estado]}`}>
      {ETIQUETAS_ESTADO[estado]}
    </span>
  );
}
