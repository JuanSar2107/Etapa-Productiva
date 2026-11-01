import type { ActualizarPerfilInput, ConfiguracionEnvioInput, UsuarioPublico } from '@ep/shared';
import { api, ApiError } from './client';

export const usuariosApi = {
  /** Devuelve null si no hay sesión. */
  async yo(): Promise<UsuarioPublico | null> {
    try {
      return await api<UsuarioPublico>('/usuarios/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },

  actualizarPerfil: (datos: ActualizarPerfilInput) =>
    api<UsuarioPublico>('/usuarios/me', { method: 'PATCH', body: JSON.stringify(datos) }),

  actualizarConfiguracion: (datos: ConfiguracionEnvioInput) =>
    api<UsuarioPublico>('/usuarios/me/configuracion', { method: 'PUT', body: JSON.stringify(datos) }),

  aceptarAutorizacionDatos: () =>
    api<UsuarioPublico>('/usuarios/me/autorizacion-datos', { method: 'POST', body: JSON.stringify({ acepta: true }) }),

  subirHojaVida(archivo: File) {
    const form = new FormData();
    form.append('archivo', archivo);
    return api<UsuarioPublico>('/usuarios/me/hoja-vida', { method: 'PUT', body: form });
  },

  eliminarHojaVida: () => api<UsuarioPublico>('/usuarios/me/hoja-vida', { method: 'DELETE' }),

  eliminarCuenta: () => api<void>('/usuarios/me', { method: 'DELETE' }),

  cerrarSesion: () => api<void>('/auth/logout', { method: 'POST' }),

  urlHojaVida: '/api/usuarios/me/hoja-vida',
  urlLoginGoogle: '/api/auth/google',
};
