import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createUser, resetUserPassword, setUserActive } from "@/actions-team";
import { fd, clearDb } from "./helpers";

const state = vi.hoisted(() => ({ meId: "" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/session", () => ({ requireAdmin: vi.fn(async () => ({ id: state.meId, name: "Admin", email: "a@a.com" })) }));

const mk = (email: string, role = "PROFISSIONAL", active = true) =>
  prisma.user.create({ data: { name: email.split("@")[0], email, passwordHash: "x", role, active } });
const valid = { name: "Antonio Souza", email: "antonio@clinica.com", password: "uma-senha-forte-123", role: "PROFISSIONAL", crefito: "11-123456-F" };

beforeEach(async () => { await clearDb(); state.meId = (await mk("admin@clinica.com", "ADMIN")).id; });

describe("createUser", () => {
  it("cadastra o profissional com senha criptografada e volta para a equipe", async () => {
    await expect(createUser(undefined, fd(valid))).rejects.toThrow("REDIRECT:/equipe");
    const u = await prisma.user.findUnique({ where: { email: "antonio@clinica.com" } });
    expect(u).toMatchObject({ name: "Antonio Souza", role: "PROFISSIONAL", crefito: "11-123456-F", active: true });
    expect(u?.passwordHash).not.toContain("uma-senha");
    expect(await bcrypt.compare("uma-senha-forte-123", u!.passwordHash)).toBe(true);
  });
  it("recusa e-mail repetido e senha curta", async () => {
    await mk("antonio@clinica.com");
    expect((await createUser(undefined, fd(valid)))?.error).toMatch(/já existe/i);
    expect((await createUser(undefined, fd({ ...valid, email: "novo@clinica.com", password: "curta" })))?.error).toMatch(/pelo menos 10/);
    expect(await prisma.user.count()).toBe(2);
  });
});

describe("setUserActive", () => {
  it("desativa e reativa um profissional", async () => {
    const p = await mk("sinara@clinica.com");
    await setUserActive(fd({ id: p.id, active: "false" }));
    expect((await prisma.user.findUnique({ where: { id: p.id } }))?.active).toBe(false);
    await setUserActive(fd({ id: p.id, active: "true" }));
    expect((await prisma.user.findUnique({ where: { id: p.id } }))?.active).toBe(true);
  });
  it("ninguém desativa a si mesmo", async () => {
    await setUserActive(fd({ id: state.meId, active: "false" }));
    expect((await prisma.user.findUnique({ where: { id: state.meId } }))?.active).toBe(true);
  });
  it("sempre sobra um administrador ativo", async () => {
    const other = await mk("outro@clinica.com", "ADMIN");
    state.meId = other.id;
    const first = (await prisma.user.findUnique({ where: { email: "admin@clinica.com" } }))!;
    await setUserActive(fd({ id: first.id, active: "false" })); // ainda há outro admin: permite
    expect((await prisma.user.findUnique({ where: { id: first.id } }))?.active).toBe(false);
    state.meId = first.id;
    await setUserActive(fd({ id: other.id, active: "false" })); // é o último admin ativo: recusa
    expect((await prisma.user.findUnique({ where: { id: other.id } }))?.active).toBe(true);
  });
});

describe("resetUserPassword", () => {
  it("troca a senha e ignora senha curta", async () => {
    const p = await mk("sinara@clinica.com");
    await resetUserPassword(fd({ id: p.id, password: "curta" }));
    expect((await prisma.user.findUnique({ where: { id: p.id } }))?.passwordHash).toBe("x");
    await resetUserPassword(fd({ id: p.id, password: "nova-senha-forte-1" }));
    const u = await prisma.user.findUnique({ where: { id: p.id } });
    expect(await bcrypt.compare("nova-senha-forte-1", u!.passwordHash)).toBe(true);
  });
});
