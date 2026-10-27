"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { MIN_PASSWORD, readUser } from "@/lib/user-input";

type State = { error?: string } | undefined;

export async function createUser(_prev: State, fd: FormData): Promise<State> {
  await requireAdmin();
  const { data, error } = readUser(fd);
  if (error) return { error };
  if (await prisma.user.findUnique({ where: { email: data.email } })) return { error: "Já existe um usuário com esse e-mail." };
  const { password, ...rest } = data;
  await prisma.user.create({ data: { ...rest, passwordHash: await bcrypt.hash(password, 12) } });
  revalidatePath("/equipe");
  redirect("/equipe");
}

export async function resetUserPassword(fd: FormData) {
  await requireAdmin();
  const password = String(fd.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return;
  await prisma.user.update({ where: { id: String(fd.get("id")) }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  revalidatePath("/equipe");
}

export async function setUserActive(fd: FormData) {
  const me = await requireAdmin();
  const id = String(fd.get("id"));
  const active = fd.get("active") === "true";
  if (!active) {
    if (id === me.id) return; // ninguém desativa a si mesmo
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === "ADMIN" && target.active) {
      const others = await prisma.user.count({ where: { role: "ADMIN", active: true, NOT: { id } } });
      if (others === 0) return; // sempre sobra um administrador ativo
    }
  }
  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/equipe");
}
