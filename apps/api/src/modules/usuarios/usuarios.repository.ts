import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export const usuariosRepository = {
  buscarPorId: (id: string) => prisma.usuario.findUnique({ where: { id } }),

  buscarPorGoogleId: (googleId: string) => prisma.usuario.findUnique({ where: { googleId } }),

  crear: (data: Prisma.UsuarioCreateInput) => prisma.usuario.create({ data }),

  actualizar: (id: string, data: Prisma.UsuarioUpdateInput) => prisma.usuario.update({ where: { id }, data }),

  eliminar: (id: string) => prisma.usuario.delete({ where: { id } }),
};
