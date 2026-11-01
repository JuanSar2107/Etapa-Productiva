import { useState } from 'react';
import { Link } from 'react-router';
import type { Plantilla } from '@ep/shared';
import { Alerta, Boton, Modal } from '../components/ui';
import { useEliminarPlantilla, usePlantillas } from '../hooks/usePlantillas';

export function PlantillasPage() {
  const { data: plantillas, isLoading, error } = usePlantillas();
  const [eliminando, setEliminando] = useState<Plantilla | null>(null);
  const eliminar = useEliminarPlantilla();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Plantillas de correo</h1>
        <div className="flex flex-wrap gap-2">
          {!!plantillas?.length && !plantillas.some((p) => /seguimiento/i.test(p.nombre)) && (
            <Link
              to="/plantillas/nueva?sugerida=seguimiento"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              Crear plantilla de seguimiento
            </Link>
          )}
          <Link to="/plantillas/nueva" className="rounded-lg bg-marca-600 px-4 py-2 text-sm font-medium text-white hover:bg-marca-700">
            Nueva plantilla
          </Link>
        </div>
      </div>

      {error && <Alerta tipo="error">{error.message}</Alerta>}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-slate-500">Cargando plantillas…</p>
      ) : plantillas?.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center ring-1 ring-slate-200">
          <p className="font-medium">Aún no tienes plantillas</p>
          <p className="mt-1 text-sm text-slate-500">
            Escribe tu mensaje una vez y la app lo personaliza para cada empresa.
          </p>
          <Link to="/plantillas/nueva?sugerida=1" className="mt-4 inline-block rounded-lg bg-marca-600 px-4 py-2 text-sm font-medium text-white hover:bg-marca-700">
            Empezar con una plantilla sugerida
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {plantillas?.map((p) => (
            <li key={p.id} className="flex flex-col rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p className="font-medium">{p.nombre}</p>
              <p className="mt-1 line-clamp-1 text-sm text-slate-600">
                <span className="text-slate-400">Asunto:</span> {p.asunto}
              </p>
              <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs text-slate-500">{p.cuerpo}</p>
              <div className="mt-auto flex gap-2 pt-3 text-sm">
                <Link to={`/plantillas/${p.id}`} className="rounded px-2 py-1 text-marca-700 hover:bg-marca-50">
                  Editar
                </Link>
                <button onClick={() => setEliminando(p)} className="rounded px-2 py-1 text-red-600 hover:bg-red-50">
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal titulo="Eliminar plantilla" abierto={!!eliminando} onCerrar={() => setEliminando(null)}>
        {eliminando && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              ¿Eliminar <strong>{eliminando.nombre}</strong>? Los correos que ya enviaste con ella conservan su contenido.
            </p>
            {eliminar.isError && <Alerta tipo="error">{eliminar.error.message}</Alerta>}
            <div className="flex justify-end gap-2">
              <Boton variante="secundario" onClick={() => setEliminando(null)}>
                Cancelar
              </Boton>
              <Boton
                variante="peligro"
                cargando={eliminar.isPending}
                onClick={() => eliminar.mutate(eliminando.id, { onSuccess: () => setEliminando(null) })}
              >
                Eliminar
              </Boton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
