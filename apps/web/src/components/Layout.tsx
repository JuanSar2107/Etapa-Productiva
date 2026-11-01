import { useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { usuariosApi } from '../api/usuarios';
import { useResumenEstados } from '../hooks/useEmpresas';
import { useUsuario } from '../hooks/useUsuario';
import { Alerta } from './ui';

const enlaces = [
  { a: '/seguimiento', texto: 'Seguimiento' },
  { a: '/empresas', texto: 'Empresas' },
  { a: '/plantillas', texto: 'Plantillas' },
  { a: '/envios', texto: 'Envíos' },
  { a: '/perfil', texto: 'Mi perfil' },
];

export function Layout() {
  const { data: usuario } = useUsuario();
  const { data: resumen } = useResumenEstados();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function salir() {
    await usuariosApi.cerrarSesion();
    qc.clear();
    navigate('/login');
  }

  const necesitaReconectar = usuario && (usuario.requiereReconexion || !usuario.permisoEnvio);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold text-marca-700">Etapa Productiva</span>
          <nav className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {enlaces.map((e) => (
              <NavLink
                key={e.a}
                to={e.a}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
                    isActive ? 'bg-marca-50 font-medium text-marca-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {e.texto}
                {e.a === '/seguimiento' && !!resumen?.seguimientoPendiente && (
                  <span
                    className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                    title="Empresas sin respuesta que esperan seguimiento"
                  >
                    {resumen.seguimientoPendiente}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{usuario?.correo}</span>
            <button onClick={salir} className="text-sm text-slate-600 hover:text-slate-900">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {necesitaReconectar && (
          <Alerta tipo="aviso">
            {usuario.requiereReconexion
              ? 'Google revocó el acceso a tu Gmail. '
              : 'No diste permiso para enviar correos desde Gmail. '}
            <a href={usuariosApi.urlLoginGoogle} className="font-medium underline">
              Volver a conectar con Google
            </a>
          </Alerta>
        )}
        <Outlet />
      </main>
    </div>
  );
}
