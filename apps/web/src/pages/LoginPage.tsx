import { useSearchParams } from 'react-router';
import { usuariosApi } from '../api/usuarios';
import { Alerta } from '../components/ui';

const mensajesError: Record<string, string> = {
  acceso_denegado: 'Cancelaste el inicio de sesión con Google.',
  state_invalido: 'La solicitud de inicio de sesión expiró. Inténtalo de nuevo.',
  error_google: 'Google no pudo completar el inicio de sesión. Inténtalo de nuevo.',
};

export function LoginPage() {
  const [params] = useSearchParams();
  const error = params.get('error');

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-marca-700">Etapa Productiva</h1>
          <p className="text-sm text-slate-600">
            Organiza tu búsqueda de empresas y envíales tu hoja de vida desde tu propio Gmail.
          </p>
        </div>

        {error && <Alerta tipo="error">{mensajesError[error] ?? 'No se pudo iniciar sesión.'}</Alerta>}

        <a
          href={usuariosApi.urlLoginGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
            <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
          </svg>
          Continuar con Google
        </a>

        <p className="text-xs leading-relaxed text-slate-500">
          Pediremos permiso para ver tu nombre y correo, y para <strong>enviar</strong> correos desde tu cuenta de Gmail.
          No podemos leer tu bandeja de entrada ni ver tu contraseña. Nunca te pediremos la contraseña del SGVA.
        </p>
      </div>
    </div>
  );
}
