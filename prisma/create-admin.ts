// Cria (ou redefine a senha de) um usuário. Seguro para produção: não apaga nada.
// Variáveis opcionais: ADMIN_NAME, ADMIN_ROLE (ADMIN | PROFISSIONAL, padrão ADMIN), ADMIN_CREFITO.
// Uso: ADMIN_EMAIL=voce@clinica.com ADMIN_PASSWORD='senha-forte' npm run admin:create
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { resolveDbUrl } from "../src/lib/db-url";

function fail(msg: string): never { console.error("Erro:", msg); process.exit(1); }

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const name = process.env.ADMIN_NAME?.trim() || "Administrador";
const role = process.env.ADMIN_ROLE === "PROFISSIONAL" ? "PROFISSIONAL" : "ADMIN";
const crefito = process.env.ADMIN_CREFITO?.trim() || null;
if (!/^\S+@\S+\.\S+$/.test(email)) fail("defina ADMIN_EMAIL com um e-mail válido.");
if (password.length < 10) fail("ADMIN_PASSWORD precisa ter pelo menos 10 caracteres.");

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: resolveDbUrl() }) });
async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const u = await prisma.user.upsert({ where: { email }, update: { name, passwordHash, role, crefito, active: true }, create: { name, email, passwordHash, role, crefito } });
  console.log(`Usuário pronto: ${u.email}`);
}
main().finally(() => prisma.$disconnect());
