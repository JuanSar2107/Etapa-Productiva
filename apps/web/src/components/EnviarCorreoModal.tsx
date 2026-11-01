import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ETIQUETAS_ESTADO, type Empresa, type EstadoContacto } from '@ep/shared';
import { usuariosApi } from '../api/usuarios';
import { useEncolarEnvios } from '../hooks/useEnvios';
import { usePlantillas } from '../hooks/usePlantillas';
import { useUsuario } from '../hooks/useUsuario';
import { formatearFecha } from '../lib/fechas';
import { Alerta, Boton, Modal } from './ui';
import { VistaPreviaCorreo } from './VistaPreviaCorreo';

const BLOQUEADOS: EstadoContacto[] = ['NO_CONTACTAR', 'RECHAZADO', 'RESPONDIO', 'PENDIENTE'];

/** A partir de este número de correos sin respuesta, sugerimos no insistir más. */
const MAX_CORREOS_SUGERIDO = 2;

export function EnviarCorreoModal({
  empresas,
  seguimiento = false,
  nota,
  onCerrar,
}: {
  empresas: Empresa[];
  /** Modo seguimiento: activa el reenvío y prefiere una plantilla cuyo nombre diga "seguimiento". */
  seguimiento?: boolean;
  /** Aviso que se muestra arriba del formulario (por ejemplo, cuántas empresas se saltaron). */
  nota?: ReactNode;
  onCerrar: (enviado: boolean) => void;
}) {
  const { data: usuario } = useUsuario();
  const { data: plantillas } = usePlantillas();
  const [plantillaId, setPlantillaId] = useState('');
  const [reenviar, setReenviar] = useState(seguimiento);
  const encolar = useEncolarEnvios();

  const plantillaPorDefecto =
    (seguimiento && plantillas?.find((p) => /seguimiento/i.test(p.nombre))) || plantillas?.[0];
  const plantilla = plantillas?.find((p) => p.id === (plantillaId || plantillaPorDefecto?.id));
  const insistentes = empresas.filter((e) => e.estado === 'ENVIADO' && e.enviosRealizados >= MAX_CORREOS_SUGERIDO);
  const bloqueadas = empresas.filter((e) => BLOQUEADOS.includes(e.estado));
  const yaEnviadas = empresas.filter((e) => e.estado === 'ENVIADO');
  const aEnviar = empresas.length - bloqueadas.length - (reenviar ? 0 : yaEnviadas.length);

  const requisitos = !usuario
    ? []
    : [
        !usuario.hojaVida && (
          <>
            Sube tu hoja de vida en <Link to="/perfil" className="font-medium underline">tu perfil</Link>.
          </>
        ),
        (usuario.requiereReconexion || !usuario.permisoEnvio) && (
          <>
            Necesitamos permiso para enviar desde tu Gmail.{' '}
            <a href={usuariosApi.urlLoginGoogle} className="font-medium underline">Conectar con Google</a>
          </>
        ),
        plantillas?.length === 0 && (
          <>
            Crea primero una <Link to="/plantillas/nueva?sugerida=1" className="font-medium underline">plantilla</Link>.
          </>
        ),
      ].filter(Boolean);

  const resultado = encolar.data;

  return (
    <Modal titulo={empresas.length === 1 ? `Enviar correo a ${empresas[0]!.nombre}` : `Enviar correo a ${empresas.length} empresas`} abierto onCerrar={() => onCerrar(!!resultado)}>
      {resultado ? (
        <div className="space-y-4 text-sm">
          {resultado.encolados > 0 ? (
            <Alerta tipo="exito">
              {resultado.encolados === 1 ? 'Se programó 1 correo' : `Se programaron ${resultado.encolados} correos`}. El primero sale{' '}
              <strong>{formatearFecha(resultado.primerEnvio)}</strong>
              {resultado.encolados > 1 && (
                <>
                  {' '}y el último <strong>{formatearFecha(resultado.ultimoEnvio)}</strong>
                </>
              )}
              .
            </Alerta>
          ) : (
            <Alerta tipo="aviso">No se programó ningún correo.</Alerta>
          )}
          {resultado.omitidos.length > 0 && (
            <div>
              <p className="font-medium">Omitidas ({resultado.omitidos.length}):</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
                {resultado.omitidos.map((o) => (
                  <li key={o.empresaId}>
                    {o.nombre}: {o.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-slate-500">
            Los correos salen poco a poco, de lunes a viernes entre 8:00 a. m. y 6:00 p. m., respetando tu límite diario.
          </p>
          <div className="flex justify-end gap-2">
            <Link to="/envios" className="rounded-lg px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
              Ver cola de envíos
            </Link>
            <Boton onClick={() => onCerrar(true)}>Listo</Boton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {nota && <Alerta tipo="info">{nota}</Alerta>}
          {requisitos.length > 0 ? (
            <Alerta tipo="aviso">
              <p className="font-medium">Antes de enviar:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {requisitos.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </Alerta>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor="env-plantilla" className="text-sm font-medium text-slate-700">
                  Plantilla
                </label>
                <select
                  id="env-plantilla"
                  value={plantilla?.id ?? ''}
                  onChange={(e) => setPlantillaId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-marca-600/40"
                >
                  {plantillas?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {plantilla && usuario && aEnviar > 0 && (
                <VistaPreviaCorreo
                  key={reenviar ? 'con-reenvio' : 'sin-reenvio'}
                  plantilla={plantilla}
                  usuario={usuario}
                  empresas={empresas.filter((e) => !BLOQUEADOS.includes(e.estado) && (reenviar || e.estado !== 'ENVIADO'))}
                />
              )}

              {bloqueadas.length > 0 && (
                <Alerta tipo="info">
                  Se omitirán {bloqueadas.length}:{' '}
                  {bloqueadas.map((e) => `${e.nombre} (${ETIQUETAS_ESTADO[e.estado].toLowerCase()})`).join(', ')}.
                </Alerta>
              )}

              {yaEnviadas.length > 0 && (
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" checked={reenviar} onChange={(e) => setReenviar(e.target.checked)} className="mt-0.5 size-4 accent-marca-600" />
                  <span>
                    Volver a escribir a {yaEnviadas.length === 1 ? 'la empresa que ya contactaste' : `las ${yaEnviadas.length} empresas que ya contactaste`}{' '}
                    <span className="text-slate-500">(seguimiento)</span>
                  </span>
                </label>
              )}

              {reenviar && insistentes.length > 0 && (
                <Alerta tipo="aviso">
                  Ya le escribiste {MAX_CORREOS_SUGERIDO} o más veces sin respuesta a:{' '}
                  {insistentes.map((e) => e.nombre).join(', ')}. Insistir demasiado puede hacer que tus correos terminen en spam;
                  considera marcarlas como «Rechazado».
                </Alerta>
              )}

              {seguimiento && plantilla && !/seguimiento/i.test(plantilla.nombre) && (
                <p className="text-xs text-slate-500">
                  Consejo: un mensaje distinto al primero funciona mejor.{' '}
                  <Link to="/plantillas/nueva?sugerida=seguimiento" className="underline">
                    Crea una plantilla de seguimiento
                  </Link>
                  .
                </p>
              )}

              {encolar.isError && <Alerta tipo="error">{encolar.error.message}</Alerta>}

              <div className="flex justify-end gap-2">
                <Boton variante="secundario" onClick={() => onCerrar(false)}>
                  Cancelar
                </Boton>
                <Boton
                  disabled={!plantilla || aEnviar <= 0}
                  cargando={encolar.isPending}
                  onClick={() =>
                    plantilla && encolar.mutate({ empresaIds: empresas.map((e) => e.id), plantillaId: plantilla.id, reenviar })
                  }
                >
                  {aEnviar === 1 ? 'Programar 1 correo' : `Programar ${Math.max(aEnviar, 0)} correos`}
                </Boton>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
