import type { EmpresaDatos, EstadoContacto, FuenteEmpresa } from './schemas/empresa';
import type { EstadoEnvio } from './schemas/envio';
import type { PlantillaDatos } from './schemas/plantilla';

/** Forma del usuario que el API devuelve al frontend (sin tokens ni rutas internas). */
export interface UsuarioPublico {
  id: string;
  nombre: string;
  correo: string;
  programaFormacion: string | null;
  ficha: string | null;
  telefono: string | null;
  hojaVida: { nombre: string; bytes: number } | null;
  limiteDiario: number;
  espaciadoMinSeg: number;
  espaciadoMaxSeg: number;
  diasSeguimiento: number;
  autorizacionDatosEn: string | null;
  requiereReconexion: boolean;
  /** false si el usuario desmarcó el permiso de Gmail en la pantalla de Google. */
  permisoEnvio: boolean;
}

export interface Empresa extends EmpresaDatos {
  id: string;
  fuente: FuenteEmpresa;
  estado: EstadoContacto;
  /** Fecha del último correo enviado a la empresa. */
  ultimoContactoEn: string | null;
  /** Cuándo hacer seguimiento si no responde (solo para empresas en estado ENVIADO). */
  proximoSeguimientoEn: string | null;
  enviosRealizados: number;
  creadoEn: string;
  actualizadoEn: string;
}

export type ResumenEstados = Record<EstadoContacto, number> & {
  total: number;
  /** Empresas que no han respondido y ya pasaron los días de seguimiento. */
  seguimientoPendiente: number;
};

export interface OpcionesFiltro {
  departamentos: string[];
  /** Cada ciudad con su departamento, para acotar las ciudades al elegir un departamento. */
  ciudades: { ciudad: string; departamento: string | null }[];
  sectores: string[];
}

/** Empresas de un filtro a las que se les puede escribir por primera vez. */
export interface EmpresasPorContactar {
  items: Empresa[];
  /** Cuántas coinciden con el filtro sin contar el estado. */
  totalFiltro: number;
  /** Cuántas sin contactar hay en total (puede superar el máximo por lote). */
  totalPorContactar: number;
}

export interface ResultadoCambioEstado {
  actualizadas: number;
  /** Correos en cola que se cancelaron porque la empresa ya no debe recibirlos. */
  enviosCancelados: number;
}

export interface Plantilla extends PlantillaDatos {
  id: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Envio {
  id: string;
  empresa: { id: string; nombre: string; correoContacto: string };
  plantillaNombre: string | null;
  destinatario: string;
  asunto: string;
  cuerpo: string;
  estado: EstadoEnvio;
  fechaProgramada: string;
  fechaEnvio: string | null;
  intentos: number;
  ultimoError: string | null;
  fechaProximoSeguimiento: string | null;
}

export interface ResumenEnvios {
  enviadosHoy: number;
  limiteDiario: number;
  programados: number;
  conError: number;
  proximoEnvio: string | null;
}

export interface ResultadoEncolar {
  encolados: number;
  omitidos: { empresaId: string; nombre: string; motivo: string }[];
  primerEnvio: string | null;
  ultimoEnvio: string | null;
}

export interface Paginado<T> {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export type ResultadoFila = 'valida' | 'invalida' | 'duplicada';

export interface FilaImportacion {
  /** Número de fila en el archivo (la 1 es el encabezado). */
  fila: number;
  resultado: ResultadoFila;
  /** Valores tal como venían en el CSV, para mostrarlos si la fila tiene errores. */
  original: Record<string, string>;
  /** Solo en filas válidas: datos normalizados listos para importar. */
  empresa?: EmpresaDatos;
  errores: string[];
  avisos: string[];
}

export interface PrevisualizacionCsv {
  /** Encabezado del archivo → campo de la empresa. */
  columnas: Record<string, keyof EmpresaDatos>;
  columnasIgnoradas: string[];
  filas: FilaImportacion[];
  resumen: { total: number; validas: number; invalidas: number; duplicadas: number };
}

export interface ResultadoImportacion {
  creadas: number;
  omitidas: number;
}

export interface ErrorApi {
  error: {
    codigo: string;
    mensaje: string;
    detalles?: unknown;
  };
}
