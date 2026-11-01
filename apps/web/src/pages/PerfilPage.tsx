import { useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  actualizarPerfilSchema,
  configuracionEnvioSchema,
  HOJA_VIDA_MAX_BYTES,
  type UsuarioPublico,
} from '@ep/shared';
import { erroresDeCampo } from '../api/client';
import { usuariosApi } from '../api/usuarios';
import { Alerta, Boton, Campo, Tarjeta } from '../components/ui';
import { useMutacionUsuario, useUsuario } from '../hooks/useUsuario';

type Errores = Record<string, string>;

function erroresZod(issues: { path: PropertyKey[]; message: string }[]): Errores {
  return Object.fromEntries(issues.map((i) => [i.path.join('.'), i.message]));
}

export function PerfilPage() {
  const { data: usuario } = useUsuario();
  if (!usuario) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Mi perfil</h1>
      <DatosPersonales usuario={usuario} />
      <HojaDeVida usuario={usuario} />
      <ConfiguracionEnvio usuario={usuario} />
      <EliminarCuenta />
    </div>
  );
}

function DatosPersonales({ usuario }: { usuario: UsuarioPublico }) {
  const [form, setForm] = useState({
    nombre: usuario.nombre,
    programaFormacion: usuario.programaFormacion ?? '',
    ficha: usuario.ficha ?? '',
    telefono: usuario.telefono ?? '',
  });
  const [errores, setErrores] = useState<Errores>({});
  const guardar = useMutacionUsuario(usuariosApi.actualizarPerfil);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const r = actualizarPerfilSchema.safeParse(form);
    if (!r.success) return setErrores(erroresZod(r.error.issues));
    setErrores({});
    guardar.mutate(form, { onError: (err) => setErrores(erroresDeCampo(err)) });
  }

  const cambiar = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <Tarjeta titulo="Datos personales" descripcion="Se usan para llenar las variables de tus plantillas de correo.">
      <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
        <Campo id="nombre" etiqueta="Nombre completo" value={form.nombre} onChange={cambiar('nombre')} error={errores.nombre} />
        <Campo id="correo" etiqueta="Correo (Google)" value={usuario.correo} disabled ayuda="Es la cuenta desde la que se envían los correos." />
        <Campo
          id="programa"
          etiqueta="Programa de formación"
          placeholder="Tecnólogo en Análisis y Desarrollo de Software"
          value={form.programaFormacion}
          onChange={cambiar('programaFormacion')}
          error={errores.programaFormacion}
        />
        <Campo id="ficha" etiqueta="Ficha" inputMode="numeric" value={form.ficha} onChange={cambiar('ficha')} error={errores.ficha} />
        <Campo id="telefono" etiqueta="Teléfono" type="tel" value={form.telefono} onChange={cambiar('telefono')} error={errores.telefono} />
        <div className="flex items-center gap-3 sm:col-span-2">
          <Boton type="submit" cargando={guardar.isPending}>
            Guardar cambios
          </Boton>
          {guardar.isSuccess && <span className="text-sm text-marca-700">Guardado</span>}
          {guardar.isError && !Object.keys(errores).length && (
            <span className="text-sm text-red-600">{guardar.error.message}</span>
          )}
        </div>
      </form>
    </Tarjeta>
  );
}

function HojaDeVida({ usuario }: { usuario: UsuarioPublico }) {
  const input = useRef<HTMLInputElement>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const subir = useMutacionUsuario(usuariosApi.subirHojaVida);
  const eliminar = useMutacionUsuario(usuariosApi.eliminarHojaVida);

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (archivo.type !== 'application/pdf') return setErrorLocal('El archivo debe ser PDF.');
    if (archivo.size > HOJA_VIDA_MAX_BYTES) return setErrorLocal('El PDF no puede pesar más de 5 MB.');
    setErrorLocal(null);
    subir.mutate(archivo);
  }

  const error = errorLocal ?? subir.error?.message ?? eliminar.error?.message;

  return (
    <Tarjeta titulo="Hoja de vida" descripcion="Se adjunta a cada correo que envíes. Solo PDF, máximo 5 MB.">
      <div className="space-y-3">
        {usuario.hojaVida ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{usuario.hojaVida.nombre}</p>
              <p className="text-xs text-slate-500">{(usuario.hojaVida.bytes / 1024).toFixed(0)} KB</p>
            </div>
            <div className="flex gap-2">
              <a href={usuariosApi.urlHojaVida} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-2 text-sm text-marca-700 hover:bg-marca-50">
                Ver
              </a>
              <Boton variante="secundario" cargando={eliminar.isPending} onClick={() => eliminar.mutate(undefined)}>
                Quitar
              </Boton>
            </div>
          </div>
        ) : (
          <Alerta tipo="aviso">Aún no has subido tu hoja de vida. La necesitarás para enviar correos.</Alerta>
        )}

        <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={elegir} />
        <Boton variante="secundario" cargando={subir.isPending} onClick={() => input.current?.click()}>
          {usuario.hojaVida ? 'Reemplazar PDF' : 'Subir PDF'}
        </Boton>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Tarjeta>
  );
}

function ConfiguracionEnvio({ usuario }: { usuario: UsuarioPublico }) {
  const [form, setForm] = useState({
    limiteDiario: String(usuario.limiteDiario),
    espaciadoMinMin: String(usuario.espaciadoMinSeg / 60),
    espaciadoMaxMin: String(usuario.espaciadoMaxSeg / 60),
    diasSeguimiento: String(usuario.diasSeguimiento),
  });
  const [errores, setErrores] = useState<Errores>({});
  const guardar = useMutacionUsuario(usuariosApi.actualizarConfiguracion);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const datos = {
      limiteDiario: Number(form.limiteDiario),
      espaciadoMinSeg: Math.round(Number(form.espaciadoMinMin) * 60),
      espaciadoMaxSeg: Math.round(Number(form.espaciadoMaxMin) * 60),
      diasSeguimiento: Number(form.diasSeguimiento),
    };
    const r = configuracionEnvioSchema.safeParse(datos);
    if (!r.success) return setErrores(erroresZod(r.error.issues));
    setErrores({});
    guardar.mutate(r.data);
  }

  const cambiar = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <Tarjeta
      titulo="Configuración de envío"
      descripcion="Enviar pocos correos y espaciados ayuda a que Gmail no los marque como spam."
    >
      <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
        <Campo id="limite" etiqueta="Máximo de correos por día" type="number" min={1} max={50} value={form.limiteDiario} onChange={cambiar('limiteDiario')} error={errores.limiteDiario} />
        <Campo id="dias" etiqueta="Días para hacer seguimiento" type="number" min={1} max={60} value={form.diasSeguimiento} onChange={cambiar('diasSeguimiento')} error={errores.diasSeguimiento} ayuda="Si una empresa no responde en este tiempo, te lo recordaremos." />
        <Campo id="min" etiqueta="Espera mínima entre correos (minutos)" type="number" min={0.5} step={0.5} value={form.espaciadoMinMin} onChange={cambiar('espaciadoMinMin')} error={errores.espaciadoMinSeg} />
        <Campo id="max" etiqueta="Espera máxima entre correos (minutos)" type="number" min={0.5} step={0.5} value={form.espaciadoMaxMin} onChange={cambiar('espaciadoMaxMin')} error={errores.espaciadoMaxSeg} />
        <div className="flex items-center gap-3 sm:col-span-2">
          <Boton type="submit" cargando={guardar.isPending}>
            Guardar configuración
          </Boton>
          {guardar.isSuccess && <span className="text-sm text-marca-700">Guardado</span>}
          {guardar.isError && <span className="text-sm text-red-600">{guardar.error.message}</span>}
        </div>
      </form>
    </Tarjeta>
  );
}

function EliminarCuenta() {
  const [confirmando, setConfirmando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function eliminar() {
    setCargando(true);
    try {
      await usuariosApi.eliminarCuenta();
      qc.clear();
      navigate('/login');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Tarjeta
      titulo="Eliminar mi cuenta"
      descripcion="Borra tus datos, tu hoja de vida, empresas, plantillas y envíos, y revoca el acceso a tu Gmail. No se puede deshacer."
    >
      {confirmando ? (
        <div className="flex flex-wrap gap-2">
          <Boton variante="peligro" cargando={cargando} onClick={eliminar}>
            Sí, eliminar todo
          </Boton>
          <Boton variante="secundario" onClick={() => setConfirmando(false)}>
            Cancelar
          </Boton>
        </div>
      ) : (
        <Boton variante="secundario" onClick={() => setConfirmando(true)}>
          Eliminar mi cuenta
        </Boton>
      )}
    </Tarjeta>
  );
}
