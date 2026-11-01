import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  MAX_BYTES_CSV,
  MAX_FILAS_CSV,
  tablaImportacionSchema,
  type FilaImportacion,
  type PrevisualizacionCsv,
  type ResultadoFila,
  type TablaImportacion,
} from '@ep/shared';
import { empresasApi } from '../api/empresas';
import { Alerta, Boton, Tarjeta } from '../components/ui';
import { useImportarEmpresas } from '../hooks/useEmpresas';
import { MENSAJES_EXTENSION, tablaDesdePortapapeles } from '../lib/tablas';

const PLANTILLA_CSV =
  'nombre,nit,sector,ciudad,correo,sitio_web,notas\n' +
  'Ejemplo Software SAS,900123456-7,Tecnología,Medellín,talentohumano@ejemplo.com.co,ejemplo.com.co,Vista en el SGVA\n';

function descargarPlantilla() {
  // El BOM hace que Excel abra el archivo como UTF-8 y muestre bien las tildes.
  const blob = new Blob(['﻿' + PLANTILLA_CSV], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'plantilla_empresas.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

const ETIQUETA_RESULTADO: Record<ResultadoFila, { texto: string; clase: string }> = {
  valida: { texto: 'Válida', clase: 'bg-marca-100 text-marca-700' },
  invalida: { texto: 'Con errores', clase: 'bg-red-100 text-red-700' },
  duplicada: { texto: 'Duplicada', clase: 'bg-amber-100 text-amber-800' },
};

type Filtro = ResultadoFila | 'todas';

type Origen = 'archivo' | 'pegar';
type Entrada = { tipo: 'csv'; archivo: File } | { tipo: 'tabla'; tabla: TablaImportacion };

export function ImportarCsvPage() {
  const input = useRef<HTMLInputElement>(null);
  const [origen, setOrigen] = useState<Origen>('archivo');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [desdeExtension, setDesdeExtension] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const previsualizar = useMutation({
    mutationFn: (e: Entrada) => (e.tipo === 'csv' ? empresasApi.previsualizarCsv(e.archivo) : empresasApi.previsualizarTabla(e.tabla)),
  });
  const importar = useImportarEmpresas();
  const vista = previsualizar.data;

  function analizar(entrada: Entrada) {
    setErrorLocal(null);
    setFiltro('todas');
    importar.reset();
    previsualizar.mutate(entrada);
  }

  // La extensión del navegador entrega aquí la tabla que leyó en el SGVA (ver extension/puente.js).
  const tablaExtensionRecibida = useRef(false);
  useEffect(() => {
    function alRecibir(ev: MessageEvent) {
      if (ev.source !== window || ev.data?.tipo !== MENSAJES_EXTENSION.tabla) return;
      window.postMessage({ tipo: MENSAJES_EXTENSION.recibida }, window.location.origin);
      if (tablaExtensionRecibida.current) return; // puede llegar dos veces (pedido de la página + carga del puente)
      tablaExtensionRecibida.current = true;
      const r = tablaImportacionSchema.safeParse(ev.data.tabla);
      if (!r.success) return setErrorLocal('La extensión envió una tabla que no se pudo leer.');
      setDesdeExtension(true);
      setOrigen('pegar');
      analizar({ tipo: 'tabla', tabla: r.data });
    }
    window.addEventListener('message', alRecibir);
    window.postMessage({ tipo: MENSAJES_EXTENSION.pedirTabla }, window.location.origin);
    return () => window.removeEventListener('message', alRecibir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!archivo.name.toLowerCase().endsWith('.csv')) return setErrorLocal('El archivo debe ser .csv');
    if (archivo.size > MAX_BYTES_CSV) return setErrorLocal('El archivo no puede pesar más de 1 MB');
    setDesdeExtension(false);
    analizar({ tipo: 'csv', archivo });
  }

  function pegar(e: React.ClipboardEvent) {
    e.preventDefault();
    const tabla = tablaDesdePortapapeles(e.clipboardData);
    if (!tabla) {
      return setErrorLocal('No encontramos una tabla en lo que pegaste. Selecciona la tabla completa, incluidos los títulos de las columnas, y cópiala.');
    }
    setDesdeExtension(false);
    analizar({ tipo: 'tabla', tabla });
  }

  function confirmar(vista: PrevisualizacionCsv) {
    const empresas = vista.filas.flatMap((f) => (f.empresa ? [f.empresa] : []));
    importar.mutate(empresas);
  }

  const error = errorLocal ?? previsualizar.error?.message;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/empresas" className="text-sm text-marca-700 hover:underline">
          ← Volver a empresas
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Importar empresas</h1>
      </div>

      {desdeExtension && (
        <Alerta tipo="info">Recibimos la tabla que leyó la extensión del navegador. Revísala abajo antes de importar.</Alerta>
      )}

      <Tarjeta titulo="1. Elige de dónde vienen" descripcion="Nada se guarda hasta que revises y confirmes.">
        <div className="mb-4 flex gap-2" role="tablist">
          {(
            [
              ['archivo', 'Archivo CSV'],
              ['pegar', 'Pegar una tabla'],
            ] as [Origen, string][]
          ).map(([valor, texto]) => (
            <button
              key={valor}
              role="tab"
              aria-selected={origen === valor}
              onClick={() => setOrigen(valor)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                origen === valor ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>

        {origen === 'archivo' ? (
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              Columnas obligatorias: <strong>nombre</strong> y <strong>correo</strong>. Opcionales: nit, sector, ciudad,
              sitio_web y notas. Se aceptan variantes como «Razón social» o «Correo electrónico».
            </p>
            <p>
              En Excel usa <em>Archivo → Guardar como → CSV UTF-8</em>. Máximo {MAX_FILAS_CSV} filas y 1 MB.
            </p>
            <div className="flex flex-wrap gap-2">
              <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={elegir} />
              <Boton onClick={() => input.current?.click()} cargando={previsualizar.isPending}>
                Elegir archivo CSV
              </Boton>
              <Boton variante="secundario" onClick={descargarPlantilla}>
                Descargar plantilla
              </Boton>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              En el SGVA (o en cualquier página o Excel), selecciona con el mouse la tabla de empresas{' '}
              <strong>incluidos los títulos de las columnas</strong>, cópiala con <kbd>Ctrl</kbd>+<kbd>C</kbd> y pégala aquí
              con <kbd>Ctrl</kbd>+<kbd>V</kbd>.
            </p>
            <div
              tabIndex={0}
              onPaste={pegar}
              aria-label="Zona para pegar la tabla"
              className="flex min-h-28 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-slate-500 outline-none focus:border-marca-600 focus:bg-marca-50"
            >
              {previsualizar.isPending ? 'Analizando…' : 'Haz clic aquí y pega la tabla (Ctrl+V)'}
            </div>
            <p className="text-xs text-slate-500">
              ¿Lo haces seguido? La extensión del navegador lo hace con un solo clic: mira <code>extension/LEEME.md</code> en el
              proyecto.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-3">
            <Alerta tipo="error">{error}</Alerta>
          </div>
        )}
      </Tarjeta>

      {vista && (
        <Tarjeta titulo="2. Revisa y confirma">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['todas', `Todas (${vista.resumen.total})`],
                  ['valida', `Válidas (${vista.resumen.validas})`],
                  ['invalida', `Con errores (${vista.resumen.invalidas})`],
                  ['duplicada', `Duplicadas (${vista.resumen.duplicadas})`],
                ] as [Filtro, string][]
              ).map(([valor, texto]) => (
                <button
                  key={valor}
                  onClick={() => setFiltro(valor)}
                  className={`rounded-full px-3 py-1 text-sm ring-1 ${
                    filtro === valor ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>

            {vista.columnasIgnoradas.length > 0 && (
              <p className="text-xs text-slate-500">Columnas ignoradas: {vista.columnasIgnoradas.join(', ')}</p>
            )}

            <TablaFilas filas={vista.filas.filter((f) => filtro === 'todas' || f.resultado === filtro)} />

            {importar.isSuccess ? (
              <Alerta tipo="exito">
                Se importaron {importar.data.creadas} empresas
                {importar.data.omitidas > 0 && ` (${importar.data.omitidas} omitidas porque ya existían)`}.{' '}
                <Link to="/empresas" className="font-medium underline">
                  Ver empresas
                </Link>
              </Alerta>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Boton disabled={vista.resumen.validas === 0} cargando={importar.isPending} onClick={() => confirmar(vista)}>
                  Importar {vista.resumen.validas} {vista.resumen.validas === 1 ? 'empresa válida' : 'empresas válidas'}
                </Boton>
                {vista.resumen.validas < vista.resumen.total && (
                  <span className="text-sm text-slate-500">Las filas con errores o duplicadas no se importarán.</span>
                )}
              </div>
            )}
            {importar.isError && <Alerta tipo="error">{importar.error.message}</Alerta>}
          </div>
        </Tarjeta>
      )}
    </div>
  );
}

function TablaFilas({ filas }: { filas: FilaImportacion[] }) {
  if (filas.length === 0) return <p className="py-4 text-center text-sm text-slate-500">No hay filas en esta categoría.</p>;

  return (
    <div className="max-h-[28rem] overflow-auto rounded-lg ring-1 ring-slate-200">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Fila</th>
            <th className="px-3 py-2 font-medium">Empresa</th>
            <th className="px-3 py-2 font-medium">Resultado</th>
            <th className="px-3 py-2 font-medium">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filas.map((f) => {
            const etiqueta = ETIQUETA_RESULTADO[f.resultado];
            const nombre = f.empresa?.nombre ?? Object.values(f.original)[0] ?? '';
            const correo = f.empresa?.correoContacto ?? Object.values(f.original).find((v) => v.includes('@')) ?? '';
            return (
              <tr key={f.fila} className="align-top">
                <td className="px-3 py-2 text-slate-500">{f.fila}</td>
                <td className="px-3 py-2">
                  <p className="font-medium">{nombre || <span className="text-slate-400">(sin nombre)</span>}</p>
                  <p className="break-all text-xs text-slate-500">{correo}</p>
                </td>
                <td className="px-3 py-2">
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${etiqueta.clase}`}>{etiqueta.texto}</span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {f.errores.map((m) => (
                    <p key={m} className="text-red-600">{m}</p>
                  ))}
                  {f.avisos.map((m) => (
                    <p key={m} className="text-amber-700">{m}</p>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
