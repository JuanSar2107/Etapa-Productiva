import { useState, type FormEvent } from 'react';
import { empresaSchema, esCorreoPersonal, type Empresa } from '@ep/shared';
import { ApiError, erroresDeCampo } from '../api/client';
import { useGuardarEmpresa } from '../hooks/useEmpresas';
import { Alerta, Boton, Campo, CampoTexto } from './ui';

const vacio = {
  nombre: '',
  nit: '',
  sector: '',
  departamento: '',
  ciudad: '',
  direccion: '',
  correoContacto: '',
  contactoNombre: '',
  telefono: '',
  sitioWeb: '',
  programaSolicitado: '',
  cupos: '',
  fechaCierre: '',
  notas: '',
};

export function FormularioEmpresa({ empresa, onListo }: { empresa?: Empresa; onListo: () => void }) {
  const [form, setForm] = useState(() =>
    empresa
      ? (Object.fromEntries(Object.keys(vacio).map((k) => [k, String(empresa[k as keyof typeof vacio] ?? '')])) as typeof vacio)
      : vacio,
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const guardar = useGuardarEmpresa();

  function enviar(e: FormEvent) {
    e.preventDefault();
    const r = empresaSchema.safeParse(form);
    if (!r.success) {
      return setErrores(Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message])));
    }
    setErrores({});
    guardar.mutate(
      { id: empresa?.id, datos: r.data },
      {
        onSuccess: onListo,
        onError: (err) => {
          // Un 409 significa que el correo ya está registrado en otra empresa.
          if (err instanceof ApiError && err.status === 409) setErrores({ correoContacto: err.message });
          else setErrores(erroresDeCampo(err));
        },
      },
    );
  }

  const cambiar = (campo: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  const correoPersonal = form.correoContacto.includes('@') && esCorreoPersonal(form.correoContacto.trim());

  return (
    <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Campo id="emp-nombre" etiqueta="Nombre de la empresa *" value={form.nombre} onChange={cambiar('nombre')} error={errores.nombre} autoFocus />
      </div>
      <div className="sm:col-span-2">
        <Campo
          id="emp-correo"
          etiqueta="Correo de contacto *"
          type="email"
          value={form.correoContacto}
          onChange={cambiar('correoContacto')}
          error={errores.correoContacto}
          ayuda="Usa solo correos que la empresa publica para recibir hojas de vida (talento humano, RR. HH.)."
        />
      </div>
      {correoPersonal && (
        <div className="sm:col-span-2">
          <Alerta tipo="aviso">Parece un correo personal. Verifica que la empresa lo publique como su contacto oficial.</Alerta>
        </div>
      )}
      <Campo id="emp-contacto" etiqueta="Persona de contacto" value={form.contactoNombre} onChange={cambiar('contactoNombre')} error={errores.contactoNombre} />
      <Campo id="emp-telefono" etiqueta="Teléfono" type="tel" value={form.telefono} onChange={cambiar('telefono')} error={errores.telefono} />
      <Campo id="emp-departamento" etiqueta="Departamento" value={form.departamento} onChange={cambiar('departamento')} error={errores.departamento} />
      <Campo id="emp-ciudad" etiqueta="Ciudad" value={form.ciudad} onChange={cambiar('ciudad')} error={errores.ciudad} />
      <div className="sm:col-span-2">
        <Campo id="emp-direccion" etiqueta="Dirección" value={form.direccion} onChange={cambiar('direccion')} error={errores.direccion} />
      </div>
      <div className="sm:col-span-2">
        <Campo
          id="emp-programa"
          etiqueta="Programa que solicitan"
          placeholder="Tecnólogo en Análisis y Desarrollo de Software"
          value={form.programaSolicitado}
          onChange={cambiar('programaSolicitado')}
          error={errores.programaSolicitado}
        />
      </div>
      <Campo id="emp-cupos" etiqueta="Aprendices requeridos" type="number" min={0} value={form.cupos} onChange={cambiar('cupos')} error={errores.cupos} />
      <Campo id="emp-cierre" etiqueta="Fecha de cierre" type="date" value={form.fechaCierre} onChange={cambiar('fechaCierre')} error={errores.fechaCierre} />
      <Campo id="emp-nit" etiqueta="NIT" placeholder="900123456-7" value={form.nit} onChange={cambiar('nit')} error={errores.nit} />
      <Campo id="emp-sector" etiqueta="Sector" placeholder="Tecnología" value={form.sector} onChange={cambiar('sector')} error={errores.sector} />
      <div className="sm:col-span-2">
        <Campo id="emp-web" etiqueta="Sitio web" placeholder="empresa.com" value={form.sitioWeb} onChange={cambiar('sitioWeb')} error={errores.sitioWeb} />
      </div>
      <div className="sm:col-span-2">
        <CampoTexto id="emp-notas" etiqueta="Notas" value={form.notas} onChange={cambiar('notas')} error={errores.notas} />
      </div>
      {guardar.isError && !Object.keys(errores).length && (
        <div className="sm:col-span-2">
          <Alerta tipo="error">{guardar.error.message}</Alerta>
        </div>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Boton type="button" variante="secundario" onClick={onListo}>
          Cancelar
        </Boton>
        <Boton type="submit" cargando={guardar.isPending}>
          {empresa ? 'Guardar cambios' : 'Agregar empresa'}
        </Boton>
      </div>
    </form>
  );
}
