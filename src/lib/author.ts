import { prisma } from "./prisma";

/** Id do usuário se ele ainda existir no banco (evita erro de chave estrangeira). */
export async function authorIdOf(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  return u?.id ?? null;
}
