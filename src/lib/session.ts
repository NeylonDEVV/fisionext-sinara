import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { COOKIE, signToken, verifyToken, type SessionUser } from "./jwt";

export const getSession = () => verifyToken(cookies().get(COOKIE)?.value);

/** Exige login e usuário ativo (um profissional desativado perde o acesso na hora). */
export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/login");
  const u = await prisma.user.findUnique({ where: { id: s.id }, select: { active: true } });
  if (!u?.active) redirect("/api/logout");
  return s;
}

export async function requireAdmin() {
  const s = await requireSession();
  const u = await prisma.user.findUnique({ where: { id: s.id }, select: { role: true } });
  if (u?.role !== "ADMIN") redirect("/dashboard");
  return s;
}

export async function startSession(u: SessionUser) {
  cookies().set(COOKIE, await signToken(u), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
}

export const endSession = () => cookies().delete(COOKIE);
