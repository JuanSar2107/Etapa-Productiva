import { useState } from 'react';
import { Link } from 'react-router';
import { DESCRIPCION_VARIABLES, renderizarPlantilla, type PlantillaDatos, type UsuarioPublico } from '@ep/shared';
import { useEmpresas } from '../hooks/useEmpresas';
import { Alerta } from './ui';

const EMPRESA_EJEMPLO = { id: '', nombre: 'Empresa de Ejemplo S.A.S.', correoContacto: 'talentohumano@ejemplo.com.co' };

type EmpresaVista = { id: string; nombre: string; correoContacto: string };

export function VistaPreviaCorreo({
  plantilla,
  usuario,
  empresas,
}: {
  plantilla: Pick<PlantillaDatos, 'asunto' | 'cuerpo' | 'incluirLineaExclusion'>;
  usuario: UsuarioPublico;
  /** Si se pasa, solo se puede elegir entre estas empresas (por ejemplo, las seleccionadas para enviar). */
  empresas?: EmpresaVista[];
}) {
  const { data } = useEmpresas({ porPagina: 100 });
  const opciones: EmpresaVista[] = empresas ?? data?.items ?? [];
  const [empresaId, setEmpresaId] = useState(empresas?.[0]?.id ?? '');
  const empresa = opciones.find((e) => e.id === empresaId) ?? EMPRESA_EJEMPLO;

  const correo = renderizarPlantilla(plantilla, {
    empresa: empresa.nombre,
    nombre: usuario.nombre,
    programa: usuario.programaFormacion,
    ficha: usuario.ficha,
    telefono: usuario.telefono,
  });
  // {empresa} siempre tiene valor; lo que falte es del perfil del aprendiz.
  const faltantesPerfil = correo.faltantes.filter((v) => v !== 'empresa');

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="vp-empresa" className="text-sm font-medium text-slate-700">
          Ver cómo le llegaría a
        </label>
        <select
          id="vp-empresa"
          value={empresaId}
          onChange={(e) => setEmpresaId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-marca-600/40"
        >
          {!empresas && <option value="">{EMPRESA_EJEMPLO.nombre} (ejemplo)</option>}
          {opciones.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>

      {faltantesPerfil.length > 0 && (
        <Alerta tipo="aviso">
          Te falta completar en tu perfil: {faltantesPerfil.map((v) => DESCRIPCION_VARIABLES[v].toLowerCase()).join(', ')}.
          No podrás enviar esta plantilla hasta completarlo.{' '}
          <Link to="/perfil" className="font-medium underline">
            Ir a mi perfil
          </Link>
        </Alerta>
      )}

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <dl className="space-y-1 border-b border-slate-100 px-4 py-3 text-sm">
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-slate-400">De</dt>
            <dd className="break-all">{usuario.correo}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-slate-400">Para</dt>
            <dd className="break-all">{empresa.correoContacto}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-slate-400">Asunto</dt>
            <dd className="font-medium">{correo.asunto || <span className="text-slate-400">(sin asunto)</span>}</dd>
          </div>
        </dl>
        <div className="whitespace-pre-wrap break-words px-4 py-4 text-sm leading-relaxed text-slate-800">
          {correo.cuerpo || <span className="text-slate-400">(el mensaje aparecerá aquí)</span>}
        </div>
        <div className="border-t border-slate-100 px-4 py-3 text-sm">
          {usuario.hojaVida ? (
            <span className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
              <span className="rounded bg-red-600 px-1 text-[10px] font-bold text-white">PDF</span>
              {usuario.hojaVida.nombre}
            </span>
          ) : (
            <span className="text-amber-700">
              Sin hoja de vida adjunta.{' '}
              <Link to="/perfil" className="underline">
                Súbela en tu perfil
              </Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
