import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ESTADOS_CONTACTO, ETIQUETAS_ESTADO, type Empresa, type EstadoContacto } from '@ep/shared';
import { EnviarCorreoModal } from '../components/EnviarCorreoModal';
import { EstadoEmpresa } from '../components/EstadoEmpresa';
import { FormularioEmpresa } from '../components/FormularioEmpresa';
import { Alerta, Boton, Modal } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { useEliminarEmpresa, useEmpresas } from '../hooks/useEmpresas';

const POR_PAGINA = 20;

export function EmpresasPage() {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<EstadoContacto | ''>('');
  const [pagina, setPagina] = useState(1);
  const q = useDebounce(busqueda);

  useEffect(() => setPagina(1), [q, estado]);

  const { data, isLoading, isFetching, error } = useEmpresas({ q, estado: estado || undefined, pagina, porPagina: POR_PAGINA });
  const [editando, setEditando] = useState<Empresa | 'nueva' | null>(null);
  const [eliminando, setEliminando] = useState<Empresa | null>(null);
  // La selección se guarda por id para que se mantenga al cambiar de página o filtro.
  const [seleccion, setSeleccion] = useState<Map<string, Empresa>>(new Map());
  const [enviandoA, setEnviandoA] = useState<Empresa[] | null>(null);

  const alternar = (e: Empresa) =>
    setSeleccion((s) => {
      const nueva = new Map(s);
      if (nueva.has(e.id)) nueva.delete(e.id);
      else nueva.set(e.id, e);
      return nueva;
    });
  const paginaSeleccionada = !!data?.items.length && data.items.every((e) => seleccion.has(e.id));
  const alternarPagina = () =>
    setSeleccion((s) => {
      const nueva = new Map(s);
      data?.items.forEach((e) => (paginaSeleccionada ? nueva.delete(e.id) : nueva.set(e.id, e)));
      return nueva;
    });

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / POR_PAGINA)) : 1;
  const hayFiltros = !!q || !!estado;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Empresas {data && <span className="text-base font-normal text-slate-500">({data.total})</span>}
        </h1>
        <div className="flex gap-2">
          <Link to="/empresas/importar" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
            Importar CSV
          </Link>
          <Boton onClick={() => setEditando('nueva')}>Nueva empresa</Boton>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          placeholder="Buscar por nombre, correo, ciudad, sector o NIT…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-marca-600/40"
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoContacto | '')}
          aria-label="Filtrar por estado"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-marca-600/40"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_CONTACTO.map((e) => (
            <option key={e} value={e}>
              {ETIQUETAS_ESTADO[e]}
            </option>
          ))}
        </select>
      </div>

      {seleccion.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
          <span>
            {seleccion.size} {seleccion.size === 1 ? 'empresa seleccionada' : 'empresas seleccionadas'}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setSeleccion(new Map())} className="rounded-lg px-3 py-1.5 hover:bg-white/10">
              Quitar selección
            </button>
            <button onClick={() => setEnviandoA([...seleccion.values()])} className="rounded-lg bg-marca-600 px-3 py-1.5 font-medium hover:bg-marca-700">
              Enviar correo
            </button>
          </div>
        </div>
      )}

      {error && <Alerta tipo="error">{error.message}</Alerta>}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-slate-500">Cargando empresas…</p>
      ) : data && data.items.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center ring-1 ring-slate-200">
          {hayFiltros ? (
            <p className="text-sm text-slate-600">Ninguna empresa coincide con la búsqueda.</p>
          ) : (
            <>
              <p className="font-medium">Aún no tienes empresas</p>
              <p className="mt-1 text-sm text-slate-500">Agrégalas una por una o importa un archivo CSV.</p>
            </>
          )}
        </div>
      ) : (
        data && (
          <div className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            {/* Escritorio: tabla */}
            <div className="hidden overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-10 py-3 pl-4">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todas las de esta página"
                        checked={paginaSeleccionada}
                        onChange={alternarPagina}
                        className="size-4 accent-marca-600"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Empresa</th>
                    <th className="px-4 py-3 font-medium">Correo</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((e) => (
                    <tr key={e.id} className={seleccion.has(e.id) ? 'bg-marca-50/60' : 'hover:bg-slate-50'}>
                      <td className="py-3 pl-4">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${e.nombre}`}
                          checked={seleccion.has(e.id)}
                          onChange={() => alternar(e)}
                          className="size-4 accent-marca-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{e.nombre}</p>
                        <p className="text-xs text-slate-500">{[e.sector, e.ciudad].filter(Boolean).join(' · ') || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{e.correoContacto}</td>
                      <td className="px-4 py-3">
                        <EstadoEmpresa estado={e.estado} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button onClick={() => setEnviandoA([e])} className="rounded px-2 py-1 text-marca-700 hover:bg-marca-50">
                          Enviar
                        </button>
                        <button onClick={() => setEditando(e)} className="rounded px-2 py-1 text-marca-700 hover:bg-marca-50">
                          Editar
                        </button>
                        <button onClick={() => setEliminando(e)} className="rounded px-2 py-1 text-red-600 hover:bg-red-50">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Móvil: tarjetas */}
            <ul className="space-y-2 md:hidden">
              {data.items.map((e) => (
                <li key={e.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={seleccion.has(e.id)}
                        onChange={() => alternar(e)}
                        className="mt-1 size-4 accent-marca-600"
                      />
                      <span className="font-medium">{e.nombre}</span>
                    </label>
                    <EstadoEmpresa estado={e.estado} />
                  </div>
                  <p className="mt-1 break-all text-sm text-slate-700">{e.correoContacto}</p>
                  <p className="text-xs text-slate-500">{[e.sector, e.ciudad].filter(Boolean).join(' · ')}</p>
                  <div className="mt-2 flex gap-3 text-sm">
                    <button onClick={() => setEnviandoA([e])} className="font-medium text-marca-700">
                      Enviar
                    </button>
                    <button onClick={() => setEditando(e)} className="text-marca-700">
                      Editar
                    </button>
                    <button onClick={() => setEliminando(e)} className="text-red-600">
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {totalPaginas > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
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
          </div>
        )
      )}

      <Modal titulo={editando === 'nueva' ? 'Nueva empresa' : 'Editar empresa'} abierto={editando !== null} onCerrar={() => setEditando(null)}>
        {editando && (
          <FormularioEmpresa
            key={editando === 'nueva' ? 'nueva' : editando.id}
            empresa={editando === 'nueva' ? undefined : editando}
            onListo={() => setEditando(null)}
          />
        )}
      </Modal>

      <ConfirmarEliminar empresa={eliminando} onCerrar={() => setEliminando(null)} />

      {enviandoA && (
        <EnviarCorreoModal
          empresas={enviandoA}
          onCerrar={(enviado) => {
            setEnviandoA(null);
            if (enviado) setSeleccion(new Map());
          }}
        />
      )}
    </div>
  );
}

function ConfirmarEliminar({ empresa, onCerrar }: { empresa: Empresa | null; onCerrar: () => void }) {
  const eliminar = useEliminarEmpresa();
  return (
    <Modal titulo="Eliminar empresa" abierto={!!empresa} onCerrar={onCerrar}>
      {empresa && (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            ¿Eliminar <strong>{empresa.nombre}</strong>? También se borrará el historial de correos enviados a esta empresa.
          </p>
          {empresa.estado === 'NO_CONTACTAR' || empresa.estado === 'RECHAZADO' ? (
            <Alerta tipo="aviso">
              Esta empresa está marcada como «{ETIQUETAS_ESTADO[empresa.estado]}». Si la eliminas, la app ya no podrá
              impedir que le vuelvas a escribir si la registras de nuevo. Es mejor conservarla.
            </Alerta>
          ) : null}
          {eliminar.isError && <Alerta tipo="error">{eliminar.error.message}</Alerta>}
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={onCerrar}>
              Cancelar
            </Boton>
            <Boton variante="peligro" cargando={eliminar.isPending} onClick={() => eliminar.mutate(empresa.id, { onSuccess: onCerrar })}>
              Eliminar
            </Boton>
          </div>
        </div>
      )}
    </Modal>
  );
}
