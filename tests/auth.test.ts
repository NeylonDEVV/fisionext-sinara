import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { login, logout } from "@/actions-auth";
import { startSession, endSession } from "@/lib/session";
import { resetAllLimits } from "@/lib/rate-limit";
import { fd, clearDb } from "./helpers";

vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("next/headers", () => ({ headers: () => new Headers() }));
vi.mock("@/lib/session", () => ({ startSession: vi.fn(), endSession: vi.fn() }));

beforeEach(async () => {
  vi.clearAllMocks();
  resetAllLimits();
  await clearDb();
  await prisma.user.create({ data: { name: "Admin", email: "admin@clinica.com", passwordHash: await bcrypt.hash("senha-correta", 4) } });
});

describe("login", () => {
  it("recusa senha errada sem criar sessão", async () => {
    expect(await login(undefined, fd({ email: "admin@clinica.com", password: "errada" }))).toEqual({ error: "E-mail ou senha incorretos." });
    expect(startSession).not.toHaveBeenCalled();
  });
  it("dá a mesma resposta para e-mail inexistente", async () => {
    expect(await login(undefined, fd({ email: "ninguem@clinica.com", password: "qualquer" }))).toEqual({ error: "E-mail ou senha incorretos." });
    expect(startSession).not.toHaveBeenCalled();
  });
  it("entra com credenciais corretas (ignora maiúsculas e espaços no e-mail)", async () => {
    await expect(login(undefined, fd({ email: "  ADMIN@Clinica.com ", password: "senha-correta" }))).rejects.toThrow("REDIRECT:/dashboard");
    expect(startSession).toHaveBeenCalledWith(expect.objectContaining({ email: "admin@clinica.com" }));
  });
});

describe("usuário desativado", () => {
  it("não entra, mesmo com a senha certa, e recebe a mesma mensagem", async () => {
    await prisma.user.update({ where: { email: "admin@clinica.com" }, data: { active: false } });
    expect(await login(undefined, fd({ email: "admin@clinica.com", password: "senha-correta" }))).toEqual({ error: "E-mail ou senha incorretos." });
    expect(startSession).not.toHaveBeenCalled();
  });
});

describe("limite de tentativas", () => {
  it("bloqueia após 5 senhas erradas, mesmo com a senha certa", async () => {
    for (let i = 0; i < 5; i++) await login(undefined, fd({ email: "admin@clinica.com", password: "errada" }));
    const r = await login(undefined, fd({ email: "admin@clinica.com", password: "senha-correta" }));
    expect(r?.error).toMatch(/muitas tentativas/i);
    expect(startSession).not.toHaveBeenCalled();
  });
  it("login correto zera o contador de erros", async () => {
    for (let i = 0; i < 4; i++) await login(undefined, fd({ email: "admin@clinica.com", password: "errada" }));
    await expect(login(undefined, fd({ email: "admin@clinica.com", password: "senha-correta" }))).rejects.toThrow("REDIRECT:/dashboard");
    expect((await login(undefined, fd({ email: "admin@clinica.com", password: "errada" })))?.error).toBe("E-mail ou senha incorretos.");
  });
});

describe("logout", () => {
  it("encerra a sessão e volta para o login", async () => {
    await expect(logout()).rejects.toThrow("REDIRECT:/login");
    expect(endSession).toHaveBeenCalled();
  });
});
