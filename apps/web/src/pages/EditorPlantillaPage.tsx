import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  DESCRIPCION_VARIABLES,
  LINEA_EXCLUSION,
  PLANTILLA_SEGUIMIENTO_SUGERIDA,
  PLANTILLA_SUGERIDA,
  plantillaSchema,
  VARIABLES_PLANTILLA,
  type PlantillaDatos,
  type UsuarioPublico,
} from '@ep/shared';
import { useMutation } from '@tanstack/react-query';
import { ApiError, erroresDeCampo } from '../api/client';
import { enviosApi } from '../api/envios';
import { Alerta, Boton, Campo, CampoTexto, Cargando, Tarjeta } from '../components/ui';
import { VistaPreviaCorreo } from '../components/VistaPreviaCorreo';
import { useGuardarPlantilla, usePlantilla } from '../hooks/usePlantillas';
import { useUsuario } from '../hooks/useUsuario';

const VACIA: PlantillaDatos = { nombre: '', asunto: '', cuerpo: '', incluirLineaExclusion: true };

export function EditorPlantillaPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data: usuario } = useUsuario();
  const { data: plantilla, isLoading, error } = usePlantilla(id);

  if (isLoading || !usuario) return <Cargando />;
  if (error) return <Alerta tipo="error">{error.message}</Alerta>;

  const sugerida = params.get('sugerida');
  const inicial =
    plantilla ?? (sugerida === 'seguimiento' ? PLANTILLA_SEGUIMIENTO_SUGERIDA : sugerida ? PLANTILLA_SUGERIDA : VACIA);
  return <Editor key={id ?? 'nueva'} id={id} inicial={inicial} usuario={usuario} />;
}

function Editor({ id, inicial, usuario }: { id?: string; inicial: PlantillaDatos; usuario: UsuarioPublico }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<PlantillaDatos>({
    nombre: inicial.nombre,
    asunto: inicial.asunto,
    cuerpo: inicial.cuerpo,
    incluirLineaExclusion: inicial.incluirLineaExclusion,
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const guardar = useGuardarPlantilla();

  const asuntoRef = useRef<HTMLInputElement>(null);
  const cuerpoRef = useRef<HTMLTextAreaElement>(null);
  const ultimoCampo = useRef<'asunto' | 'cuerpo'>('cuerpo');

  /** Inserta la variable donde está el cursor del último campo usado (asunto o cuerpo). */
  function insertarVariable(variable: string) {
    const campo = ultimoCampo.current;
    const el = campo === 'asunto' ? asuntoRef.current : cuerpoRef.current;
    if (!el) return;
    const texto = `{${variable}}`;
    const inicio = el.selectionStart ?? el.value.length;
    const fin = el.selectionEnd ?? inicio;
    setForm((f) => ({ ...f, [campo]: f[campo].slice(0, inicio) + texto + f[campo].slice(fin) }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(inicio + texto.length, inicio + texto.length);
    });
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const r = plantillaSchema.safeParse(form);
    if (!r.success) {
      return setErrores(Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message])));
    }
    setErrores({});
    guardar.mutate(
      { id, datos: r.data },
      {
        onSuccess: () => navigate('/plantillas'),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) setErrores({ nombre: err.message });
          else setErrores(erroresDeCampo(err));
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Link to="/plantillas" className="text-sm text-marca-700 hover:underline">
          ← Volver a plantillas
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{id ? 'Editar plantilla' : 'Nueva plantilla'}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Contenido">
          <form onSubmit={enviar} className="space-y-4">
            <Campo
              id="pl-nombre"
              etiqueta="Nombre de la plantilla"
              placeholder="Ej.: Empresas de software"
              ayuda="Solo lo ves tú, para reconocerla."
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              error={errores.nombre}
            />
            <Campo
              ref={asuntoRef}
              id="pl-asunto"
              etiqueta="Asunto"
              value={form.asunto}
              onFocus={() => (ultimoCampo.current = 'asunto')}
              onChange={(e) => setForm((f) => ({ ...f, asunto: e.target.value }))}
              error={errores.asunto}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Insertar variable</p>
              <div className="flex flex-wrap gap-2">
                {VARIABLES_PLANTILLA.map((v) => (
                  <button
                    key={v}
                    type="button"
                    title={DESCRIPCION_VARIABLES[v]}
                    aria-label={`Insertar {${v}}: ${DESCRIPCION_VARIABLES[v]}`}
                    onMouseDown={(e) => e.preventDefault()} // conserva el cursor en el campo
                    onClick={() => insertarVariable(v)}
                    className="rounded-full bg-marca-50 px-3 py-1 font-mono text-xs text-marca-700 ring-1 ring-marca-100 hover:bg-marca-100"
                  >
                    {`{${v}}`}
                  </button>
                ))}
              </div>
            </div>

            <CampoTexto
              ref={cuerpoRef}
              id="pl-cuerpo"
              etiqueta="Mensaje"
              rows={14}
              value={form.cuerpo}
              onFocus={() => (ultimoCampo.current = 'cuerpo')}
              onChange={(e) => setForm((f) => ({ ...f, cuerpo: e.target.value }))}
              error={errores.cuerpo}
            />

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.incluirLineaExclusion}
                onChange={(e) => setForm((f) => ({ ...f, incluirLineaExclusion: e.target.checked }))}
                className="mt-0.5 size-4 accent-marca-600"
              />
              <span>
                Agregar al final la opción de no ser contactado
                <span className="mt-1 block text-xs text-slate-500">«{LINEA_EXCLUSION}»</span>
              </span>
            </label>

            {guardar.isError && !Object.keys(errores).length && <Alerta tipo="error">{guardar.error.message}</Alerta>}

            <div className="flex justify-end gap-2">
              <Link to="/plantillas" className="rounded-lg px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                Cancelar
              </Link>
              <Boton type="submit" cargando={guardar.isPending}>
                Guardar plantilla
              </Boton>
            </div>
          </form>
        </Tarjeta>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <Tarjeta titulo="Vista previa">
            <VistaPreviaCorreo plantilla={form} usuario={usuario} />
            <EnviarPrueba plantilla={form} />
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}

/** Envía el contenido actual del formulario a tu propio correo, sin pasar por la cola. */
function EnviarPrueba({ plantilla }: { plantilla: PlantillaDatos }) {
  const prueba = useMutation({ mutationFn: enviosApi.enviarPrueba });
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  return (
    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
      <Boton
        variante="secundario"
        cargando={prueba.isPending}
        onClick={() => {
          const r = plantillaSchema.pick({ asunto: true, cuerpo: true, incluirLineaExclusion: true }).safeParse(plantilla);
          prueba.reset();
          setErrorLocal(r.success ? null : `Corrige la plantilla primero: ${r.error.issues[0]?.message}`);
          if (r.success) prueba.mutate(r.data);
        }}
      >
        Enviarme una prueba
      </Boton>
      <p className="text-xs text-slate-500">
        Te llega a tu propio correo, de inmediato, con «[Prueba]» en el asunto y tu hoja de vida adjunta.
      </p>
      {prueba.isSuccess && (
        <Alerta tipo="exito">
          {prueba.data.simulado
            ? 'Prueba simulada (GMAIL_MODO=simulado): no se envió nada de verdad.'
            : `Listo: revisa la bandeja de entrada de ${prueba.data.enviadoA}.`}
        </Alerta>
      )}
      {(errorLocal ?? prueba.error) && <Alerta tipo="error">{errorLocal ?? prueba.error?.message}</Alerta>}
    </div>
  );
}
