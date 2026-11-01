import { useState } from 'react';
import { Navigate } from 'react-router';
import { usuariosApi } from '../api/usuarios';
import { Alerta, Boton } from '../components/ui';
import { useMutacionUsuario, useUsuario } from '../hooks/useUsuario';

/**
 * Autorización de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013).
 * El texto es una base: quien despliegue la app debe ajustarlo con sus datos como responsable.
 */
export function AutorizacionDatosPage() {
  const { data: usuario } = useUsuario();
  const [acepta, setAcepta] = useState(false);
  const aceptar = useMutacionUsuario(usuariosApi.aceptarAutorizacionDatos);

  if (usuario?.autorizacionDatosEn) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-2xl space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-semibold">Autorización de tratamiento de datos personales</h1>

      <div className="space-y-3 text-sm leading-relaxed text-slate-700">
        <p>
          De acuerdo con la Ley 1581 de 2012, autorizo el tratamiento de los datos que registre en esta aplicación:
          nombre, correo, teléfono, programa de formación, ficha y hoja de vida.
        </p>
        <p className="font-medium">Finalidades:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Enviar, desde mi propia cuenta de Gmail, los correos que yo apruebe a las empresas que yo registre.</li>
          <li>Adjuntar mi hoja de vida a esos correos.</li>
          <li>Llevar el registro de los contactos y su seguimiento.</li>
        </ul>
        <p className="font-medium">Mis derechos:</p>
        <p>
          Conocer, actualizar y rectificar mis datos desde mi perfil; revocar esta autorización y pedir que se borren
          eliminando mi cuenta (se borran todos mis datos y se revoca el acceso a Gmail); y presentar quejas ante la
          Superintendencia de Industria y Comercio.
        </p>
        <p>
          Solo registraré correos corporativos públicos de las empresas y respetaré su solicitud de no ser contactadas
          de nuevo.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={acepta}
          onChange={(e) => setAcepta(e.target.checked)}
          className="mt-0.5 size-4 accent-marca-600"
        />
        <span>He leído y acepto la autorización de tratamiento de datos personales.</span>
      </label>

      {aceptar.error && <Alerta tipo="error">{aceptar.error.message}</Alerta>}

      <Boton disabled={!acepta} cargando={aceptar.isPending} onClick={() => aceptar.mutate(undefined)}>
        Aceptar y continuar
      </Boton>
    </div>
  );
}
