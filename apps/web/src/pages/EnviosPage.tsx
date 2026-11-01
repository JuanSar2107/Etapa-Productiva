import { useState } from 'react';
import { Link } from 'react-router';
import { ETIQUETAS_ESTADO_ENVIO, type Envio, type EstadoEnvio } from '@ep/shared';
import { Alerta, Boton, Modal } from '../components/ui';
import { useCancelarEnvio, useEnvios, useReintentarEnvio, useResumenEnvios } from '../hooks/useEnvios';
import { formatearFecha } from '../lib/fechas';

const POR_PAGINA = 20;

const COLORES: Record<EstadoEnvio, string> = {
  PROGRAMADO: 'bg-sky-100 text-sky-800',
  ENVIANDO: 'bg-indigo-100 text-indigo-800',
  ENVIADO: 'bg-marca-100 text-marca-700',
  ERROR: 'bg-red-100 text-red-700',
  CANCELADO: 'bg-slate-100 text-slate-600',
};

const FILTROS: [EstadoEnvio | '', string][] = [
  ['', 'Todos'],
  ['PROGRAMADO', 'En cola'],
  ['ENVIADO', 'Enviados'],
  ['ERROR', 'Con error'],
  ['CANCELADO', 'Cancelados'],
];

export function EnviosPage() {
  const [estado, setEstado] = useState<EstadoEnvio | ''>('');
  const [pagina, setPagina] = useState(1);
  const { data: resumen } = useResumenEnvios();
  const { data, isLoading, error, isFetching } = useEnvios({ estado: estado || undefined, pagina, porPagina: POR_PAGINA });
  const [viendo, setViendo] = useState<Envio | null>(null);
  const cancelar = useCancelarEnvio();
  const reintentar = useReintentarEnvio();

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / POR_PAGINA)) : 1;
  const errorAccion = cancelar.error ?? reintentar.error;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Envíos</h1>

      {resumen && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato titulo="Enviados hoy" valor={`${resumen.enviadosHoy} / ${resumen.limiteDiario}`} />
          <Dato titulo="En cola" valor={resumen.programados} />
          <Dato titulo="Próximo envío" valor={resumen.proximoEnvio ? formatearFecha(resumen.proximoEnvio) : '—'} pequeño />
          <Dato titulo="Con error" valor={resumen.conError} alerta={resumen.conError > 0} />
        </div>
      )}

      <p className="text-xs text-slate-500">
        Los correos salen de lunes a viernes entre 8:00 a. m. y 6:00 p. m. (hora de Colombia), con esperas aleatorias entre uno y
        otro. Puedes cambiar el límite y las esperas en <Link to="/perfil" className="underline">tu perfil</Link>.
      </p>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map(([valor, texto]) => (
          <button
            key={valor}
            onClick={() => {
              setEstado(valor);
              setPagina(1);
            }}
            className={`rounded-full px-3 py-1 text-sm ring-1 ${
              estado === valor ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {(error || errorAccion) && <Alerta tipo="error">{(error ?? errorAccion)!.message}</Alerta>}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-slate-500">Cargando envíos…</p>
      ) : data?.items.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center ring-1 ring-slate-200">
          <p className="font-medium">No hay envíos {estado && 'con este estado'}</p>
          {!estado && (
            <p className="mt-1 text-sm text-slate-500">
              Ve a <Link to="/empresas" className="text-marca-700 underline">Empresas</Link>, selecciona algunas y pulsa «Enviar correo».
            </p>
          )}
        </div>
      ) : (
        <ul className={`space-y-2 transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
          {data?.items.map((e) => (
            <li key={e.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{e.empresa.nombre}</p>
                  <p className="break-all text-xs text-slate-500">{e.destinatario}</p>
                </div>
                <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORES[e.estado]}`}>
                  {ETIQUETAS_ESTADO_ENVIO[e.estado]}
                </span>
              </div>
              <p className="mt-2 line-clamp-1 text-sm text-slate-700">{e.asunto}</p>
              <p className="mt-1 text-xs text-slate-500">
                {e.estado === 'ENVIADO' ? `Enviado ${formatearFecha(e.fechaEnvio)}` : `Programado para ${formatearFecha(e.fechaProgramada)}`}
                {e.plantillaNombre && ` · ${e.plantillaNombre}`}
              </p>
              {e.ultimoError && (
                <p className={`mt-1 text-xs ${e.estado === 'ERROR' ? 'text-red-600' : 'text-amber-700'}`}>{e.ultimoError}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <button onClick={() => setViendo(e)} className="text-marca-700 hover:underline">
                  Ver correo
                </button>
                {e.estado === 'PROGRAMADO' && (
                  <button
                    onClick={() => cancelar.mutate(e.id)}
                    disabled={cancelar.isPending}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
                {e.estado === 'ERROR' && (
                  <button
                    onClick={() => reintentar.mutate(e.id)}
                    disabled={reintentar.isPending}
                    className="text-marca-700 hover:underline disabled:opacity-50"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Boton variante="secundario" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </Boton>
          <span className="text-slate-600">
            Página {pagina} de {totalPaginas}
          </span>
          <Boton variante="secundario" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
            Siguiente
          </Boton>
        </div>
      )}

      <Modal titulo="Correo" abierto={!!viendo} onCerrar={() => setViendo(null)}>
        {viendo && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-slate-400">Para:</span> {viendo.destinatario}
            </p>
            <p>
              <span className="text-slate-400">Asunto:</span> <strong>{viendo.asunto}</strong>
            </p>
            <div className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 leading-relaxed ring-1 ring-slate-200">{viendo.cuerpo}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Dato({ titulo, valor, alerta, pequeño }: { titulo: string; valor: string | number; alerta?: boolean; pequeño?: boolean }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className={`mt-1 font-semibold ${pequeño ? 'text-sm' : 'text-xl'} ${alerta ? 'text-red-600' : ''}`}>{valor}</p>
    </div>
  );
}
