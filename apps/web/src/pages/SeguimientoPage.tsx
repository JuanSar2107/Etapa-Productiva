import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ESTADOS_CONTACTO,
  ESTADOS_MANUALES,
  ETIQUETAS_ESTADO,
  ETIQUETAS_ORDEN,
  ORDENES_EMPRESAS,
  type CambiarEstadoInput,
  type Empresa,
  type EstadoContacto,
  type OrdenEmpresas,
} from '@ep/shared';
import { EnviarCorreoModal } from '../components/EnviarCorreoModal';
import { COLORES_ESTADO } from '../components/EstadoEmpresa';
import { HistorialEmpresa } from '../components/HistorialEmpresa';
import { Alerta, Boton } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { useCambiarEstado, useEmpresas, useOpcionesFiltro, usePosponerSeguimiento, useResumenEstados } from '../hooks/useEmpresas';
import { useUsuario } from '../hooks/useUsuario';
import { formatearFecha } from '../lib/fechas';

const POR_PAGINA = 25;
type EstadoManual = CambiarEstadoInput['estado'];

const claseSelect =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-marca-600/40';

const vencido = (e: Empresa) => !!e.proximoSeguimientoEn && new Date(e.proximoSeguimientoEn) <= new Date();

export function SeguimientoPage() {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<EstadoContacto | ''>('');
  const [ciudad, setCiudad] = useState('');
  const [sector, setSector] = useState('');
  const [orden, setOrden] = useState<OrdenEmpresas>('seguimiento');
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [pagina, setPagina] = useState(1);
  const q = useDebounce(busqueda);
  useEffect(() => setPagina(1), [q, estado, ciudad, sector, orden, soloPendientes]);

  const { data: usuario } = useUsuario();
  const { data: resumen } = useResumenEstados();
  const { data: opciones } = useOpcionesFiltro();
  const { data, isLoading, isFetching, error } = useEmpresas({
    q,
    estado: estado || undefined,
    ciudad: ciudad || undefined,
    sector: sector || undefined,
    orden,
    seguimiento: soloPendientes ? 'pendiente' : undefined,
    pagina,
    porPagina: POR_PAGINA,
  });
  const diasSeguimiento = usuario?.diasSeguimiento ?? 7;

  const [seleccion, setSeleccion] = useState<Map<string, Empresa>>(new Map());
  const [estadoLote, setEstadoLote] = useState<EstadoManual>('RESPONDIO');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Empresa | null>(null);
  const [seguimientoA, setSeguimientoA] = useState<Empresa[] | null>(null);
  const cambiar = useCambiarEstado();
  const posponer = usePosponerSeguimiento();

  function posponerSeguimiento(empresaIds: string[]) {
    posponer.mutate(
      { empresaIds, dias: diasSeguimiento },
      {
        onSuccess: (r) => {
          setSeleccion(new Map());
          setMensaje(
            `${r.pospuestas === 1 ? 'Recordatorio pospuesto' : `${r.pospuestas} recordatorios pospuestos`} ${diasSeguimiento} días.`,
          );
        },
      },
    );
  }

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(null), 6000);
    return () => clearTimeout(t);
  }, [mensaje]);

  function aplicar(empresaIds: string[], nuevo: EstadoManual) {
    cambiar.mutate(
      { empresaIds, estado: nuevo },
      {
        onSuccess: (r) => {
          setSeleccion(new Map());
          setMensaje(
            `${r.actualizadas === 1 ? 'Estado actualizado' : `${r.actualizadas} empresas actualizadas`} a «${ETIQUETAS_ESTADO[nuevo]}».` +
              (r.enviosCancelados > 0
                ? ` Se ${r.enviosCancelados === 1 ? 'canceló 1 correo' : `cancelaron ${r.enviosCancelados} correos`} que estaba${r.enviosCancelados === 1 ? '' : 'n'} en cola.`
                : ''),
          );
        },
      },
    );
  }

  const alternar = (e: Empresa) =>
    setSeleccion((s) => {
      const n = new Map(s);
      if (n.has(e.id)) n.delete(e.id);
      else n.set(e.id, e);
      return n;
    });
  const todasPagina = !!data?.items.length && data.items.every((e) => seleccion.has(e.id));
  const alternarPagina = () =>
    setSeleccion((s) => {
      const n = new Map(s);
      data?.items.forEach((e) => (todasPagina ? n.delete(e.id) : n.set(e.id, e)));
      return n;
    });

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / POR_PAGINA)) : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Seguimiento</h1>

      {/* Contadores por estado: también sirven de filtro */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Contador texto="Todas" valor={resumen?.total} activo={estado === ''} onClick={() => setEstado('')} />
        {ESTADOS_CONTACTO.map((e) => (
          <Contador key={e} texto={ETIQUETAS_ESTADO[e]} valor={resumen?.[e]} activo={estado === e} onClick={() => setEstado(estado === e ? '' : e)} />
        ))}
      </div>

      {!!resumen?.seguimientoPendiente && !soloPendientes && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <p>
            <strong>
              {resumen.seguimientoPendiente === 1 ? '1 empresa no ha' : `${resumen.seguimientoPendiente} empresas no han`} respondido
            </strong>{' '}
            en más de {diasSeguimiento} días. Puedes escribirles de nuevo, posponer el recordatorio o cambiar su estado.
          </p>
          <Boton variante="secundario" onClick={() => setSoloPendientes(true)}>
            Ver cuáles
          </Boton>
        </div>
      )}

      {soloPendientes && (
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">Solo empresas que esperan seguimiento</span>
          <button onClick={() => setSoloPendientes(false)} className="text-slate-600 underline">
            Ver todas
          </button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Buscar empresa, correo, NIT…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={claseSelect}
        />
        <select aria-label="Ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={claseSelect}>
          <option value="">Todas las ciudades</option>
          {opciones?.ciudades.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Sector" value={sector} onChange={(e) => setSector(e.target.value)} className={claseSelect}>
          <option value="">Todos los sectores</option>
          {opciones?.sectores.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Ordenar" value={orden} onChange={(e) => setOrden(e.target.value as OrdenEmpresas)} className={claseSelect}>
          {ORDENES_EMPRESAS.map((o) => (
            <option key={o} value={o}>
              {ETIQUETAS_ORDEN[o]}
            </option>
          ))}
        </select>
      </div>

      {seleccion.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
          <span className="mr-auto">{seleccion.size} seleccionadas</span>
          {[...seleccion.values()].some((e) => e.estado === 'ENVIADO') && (
            <>
              <button
                onClick={() => setSeguimientoA([...seleccion.values()].filter((e) => e.estado === 'ENVIADO'))}
                className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20"
              >
                Enviar seguimiento
              </button>
              <button
                onClick={() => posponerSeguimiento([...seleccion.keys()])}
                disabled={posponer.isPending}
                className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20 disabled:opacity-50"
              >
                Posponer {diasSeguimiento} días
              </button>
            </>
          )}
          <label htmlFor="estado-lote">Marcar como</label>
          <select
            id="estado-lote"
            value={estadoLote}
            onChange={(e) => setEstadoLote(e.target.value as EstadoManual)}
            className="rounded-lg bg-white/10 px-2 py-1.5 text-white ring-1 ring-white/20 [&>option]:text-slate-900"
          >
            {ESTADOS_MANUALES.map((e) => (
              <option key={e} value={e}>
                {ETIQUETAS_ESTADO[e]}
              </option>
            ))}
          </select>
          <button
            onClick={() => aplicar([...seleccion.keys()], estadoLote)}
            disabled={cambiar.isPending}
            className="rounded-lg bg-marca-600 px-3 py-1.5 font-medium hover:bg-marca-700 disabled:opacity-50"
          >
            Aplicar
          </button>
          <button onClick={() => setSeleccion(new Map())} className="rounded-lg px-2 py-1.5 hover:bg-white/10">
            Cancelar
          </button>
        </div>
      )}

      {mensaje && <Alerta tipo="exito">{mensaje}</Alerta>}
      {(error ?? cambiar.error ?? posponer.error) && (
        <Alerta tipo="error">{(error ?? cambiar.error ?? posponer.error)!.message}</Alerta>
      )}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-slate-500">Cargando…</p>
      ) : data?.items.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center text-sm text-slate-600 ring-1 ring-slate-200">
          {resumen?.total === 0 ? (
            <>
              <p className="font-medium text-slate-900">Aún no tienes empresas</p>
              <p className="mt-1">Agrega las empresas a las que quieres escribir; aquí verás en qué va cada una.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link to="/empresas/importar" className="rounded-lg bg-white px-4 py-2 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                  Importar empresas
                </Link>
                <Link to="/empresas" className="rounded-lg bg-marca-600 px-4 py-2 font-medium text-white hover:bg-marca-700">
                  Agregar empresas
                </Link>
              </div>
            </>
          ) : soloPendientes ? (
            'No tienes seguimientos pendientes. ¡Vas al día!'
          ) : (
            'No hay empresas con estos filtros.'
          )}
        </div>
      ) : (
        data && (
          <div className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <div className="hidden overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-10 py-3 pl-4">
                      <input type="checkbox" aria-label="Seleccionar la página" checked={todasPagina} onChange={alternarPagina} className="size-4 accent-marca-600" />
                    </th>
                    <th className="px-3 py-3 font-medium">Empresa</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium">Último contacto</th>
                    <th className="px-3 py-3 font-medium">Seguimiento</th>
                    <th className="px-3 py-3 text-center font-medium">Correos</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((e) => (
                    <tr key={e.id} className={seleccion.has(e.id) ? 'bg-marca-50/60' : 'hover:bg-slate-50'}>
                      <td className="py-3 pl-4">
                        <input type="checkbox" aria-label={`Seleccionar ${e.nombre}`} checked={seleccion.has(e.id)} onChange={() => alternar(e)} className="size-4 accent-marca-600" />
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{e.nombre}</p>
                        <p className="text-xs text-slate-500">{[e.ciudad, e.sector].filter(Boolean).join(' · ') || e.correoContacto}</p>
                      </td>
                      <td className="px-3 py-3">
                        <SelectorEstado empresa={e} deshabilitado={cambiar.isPending} onCambiar={(nuevo) => aplicar([e.id], nuevo)} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatearFecha(e.ultimoContactoEn)}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <Seguimiento empresa={e} />
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">{e.enviosRealizados}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        {vencido(e) && (
                          <>
                            <button onClick={() => setSeguimientoA([e])} className="rounded px-2 py-1 font-medium text-marca-700 hover:bg-marca-50">
                              Escribir de nuevo
                            </button>
                            <button
                              onClick={() => posponerSeguimiento([e.id])}
                              disabled={posponer.isPending}
                              className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                              Posponer
                            </button>
                          </>
                        )}
                        <button onClick={() => setHistorial(e)} className="rounded px-2 py-1 text-marca-700 hover:bg-marca-50">
                          Historial
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 md:hidden">
              {data.items.map((e) => (
                <li key={e.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                  <label className="flex items-start gap-2">
                    <input type="checkbox" checked={seleccion.has(e.id)} onChange={() => alternar(e)} className="mt-1 size-4 accent-marca-600" />
                    <span>
                      <span className="font-medium">{e.nombre}</span>
                      <span className="block text-xs text-slate-500">{[e.ciudad, e.sector].filter(Boolean).join(' · ')}</span>
                    </span>
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <SelectorEstado empresa={e} deshabilitado={cambiar.isPending} onCambiar={(nuevo) => aplicar([e.id], nuevo)} />
                    <Seguimiento empresa={e} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Último contacto: {formatearFecha(e.ultimoContactoEn)} · {e.enviosRealizados} correos
                    </span>
                    <button onClick={() => setHistorial(e)} className="text-sm text-marca-700">
                      Historial
                    </button>
                  </div>
                  {vencido(e) && (
                    <div className="mt-2 flex gap-4 border-t border-slate-100 pt-2 text-sm">
                      <button onClick={() => setSeguimientoA([e])} className="font-medium text-marca-700">
                        Escribir de nuevo
                      </button>
                      <button onClick={() => posponerSeguimiento([e.id])} disabled={posponer.isPending} className="text-slate-600">
                        Posponer {diasSeguimiento} días
                      </button>
                    </div>
                  )}
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

      {historial && <HistorialEmpresa empresa={historial} onCerrar={() => setHistorial(null)} />}

      {seguimientoA && (
        <EnviarCorreoModal
          empresas={seguimientoA}
          seguimiento
          onCerrar={(enviado) => {
            setSeguimientoA(null);
            if (enviado) setSeleccion(new Map());
          }}
        />
      )}
    </div>
  );
}

function Contador({ texto, valor, activo, onClick }: { texto: string; valor?: number; activo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-xl px-3 py-2 text-left ring-1 transition ${
        activo ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white ring-slate-200 hover:ring-slate-300'
      }`}
    >
      <span className={`block text-xs ${activo ? 'text-slate-300' : 'text-slate-500'}`}>{texto}</span>
      <span className="text-lg font-semibold">{valor ?? '–'}</span>
    </button>
  );
}

/** Cambia el estado de una empresa. "En cola" no se puede elegir: lo pone la app al programar un correo. */
function SelectorEstado({
  empresa,
  deshabilitado,
  onCambiar,
}: {
  empresa: Empresa;
  deshabilitado: boolean;
  onCambiar: (estado: EstadoManual) => void;
}) {
  return (
    <select
      aria-label={`Estado de ${empresa.nombre}`}
      value={empresa.estado}
      disabled={deshabilitado}
      onChange={(ev) => onCambiar(ev.target.value as EstadoManual)}
      className={`cursor-pointer rounded-full border-0 py-1 pl-3 pr-8 text-xs font-medium ring-1 ring-inset ring-black/5 ${COLORES_ESTADO[empresa.estado]}`}
    >
      {empresa.estado === 'PENDIENTE' && (
        <option value="PENDIENTE" disabled>
          {ETIQUETAS_ESTADO.PENDIENTE}
        </option>
      )}
      {ESTADOS_MANUALES.map((e) => (
        <option key={e} value={e}>
          {ETIQUETAS_ESTADO[e]}
        </option>
      ))}
    </select>
  );
}

function Seguimiento({ empresa }: { empresa: Empresa }) {
  if (!empresa.proximoSeguimientoEn) return <span className="text-slate-400">—</span>;
  return vencido(empresa) ? (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700" title={formatearFecha(empresa.proximoSeguimientoEn)}>
      Sin respuesta · revisar
    </span>
  ) : (
    <span className="text-slate-600">{formatearFecha(empresa.proximoSeguimientoEn)}</span>
  );
}
