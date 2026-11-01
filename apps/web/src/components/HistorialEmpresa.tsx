import { Link } from 'react-router';
import { ETIQUETAS_ESTADO_ENVIO, type Empresa } from '@ep/shared';
import { useEnvios } from '../hooks/useEnvios';
import { formatearFecha } from '../lib/fechas';
import { EstadoEmpresa } from './EstadoEmpresa';
import { Modal } from './ui';

export function HistorialEmpresa({ empresa, onCerrar }: { empresa: Empresa; onCerrar: () => void }) {
  const { data, isLoading } = useEnvios({ empresaId: empresa.id, porPagina: 50 });

  return (
    <Modal titulo={empresa.nombre} abierto onCerrar={onCerrar}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <EstadoEmpresa estado={empresa.estado} />
          <span className="break-all text-slate-600">{empresa.correoContacto}</span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-700">
          {empresa.ciudad && (
            <>
              <dt className="text-slate-400">Ciudad</dt>
              <dd>{empresa.ciudad}</dd>
            </>
          )}
          {empresa.sector && (
            <>
              <dt className="text-slate-400">Sector</dt>
              <dd>{empresa.sector}</dd>
            </>
          )}
          {empresa.sitioWeb && (
            <>
              <dt className="text-slate-400">Sitio web</dt>
              <dd className="truncate">
                <a href={empresa.sitioWeb} target="_blank" rel="noreferrer" className="text-marca-700 underline">
                  {empresa.sitioWeb.replace(/^https?:\/\//, '')}
                </a>
              </dd>
            </>
          )}
        </dl>

        {empresa.notas && <p className="whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">{empresa.notas}</p>}

        <div>
          <p className="mb-2 font-medium">Correos</p>
          {isLoading ? (
            <p className="text-slate-500">Cargando…</p>
          ) : data?.items.length === 0 ? (
            <p className="text-slate-500">Aún no le has escrito a esta empresa.</p>
          ) : (
            <ol className="space-y-2 border-l-2 border-slate-200 pl-4">
              {data?.items.map((e) => (
                <li key={e.id}>
                  <p>
                    <span className="font-medium">{ETIQUETAS_ESTADO_ENVIO[e.estado]}</span>{' '}
                    <span className="text-slate-500">
                      {formatearFecha(e.estado === 'ENVIADO' ? e.fechaEnvio : e.fechaProgramada)}
                    </span>
                  </p>
                  <p className="text-slate-600">{e.asunto}</p>
                  {e.ultimoError && <p className="text-xs text-red-600">{e.ultimoError}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Para editar los datos o las notas, ve a <Link to="/empresas" className="underline">Empresas</Link>.
        </p>
      </div>
    </Modal>
  );
}
