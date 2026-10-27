import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { resolveDbUrl } from "../src/lib/db-url";

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: resolveDbUrl() }) });
const day = (offset: number, h = 9, m = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(h, m, 0, 0); return d; };

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("O seed de demonstração apaga todos os dados e não roda em produção. Use: npm run admin:create");

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@fisionext.com").toLowerCase();
  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "fisio1234", 10);

  await prisma.payment.deleteMany(); await prisma.evolution.deleteMany(); await prisma.admission.deleteMany();
  await prisma.appointment.deleteMany(); await prisma.patient.deleteMany(); await prisma.user.deleteMany();

  // Demonstração: um administrador e os dois profissionais (mesma senha de exemplo).
  await prisma.user.create({ data: { name: "Administrador", email: adminEmail, passwordHash, role: "ADMIN" } });
  const sinara = await prisma.user.create({ data: { name: "Sinara", email: "sinara@fisionext.com", passwordHash, role: "PROFISSIONAL" } });
  const antonio = await prisma.user.create({ data: { name: "Antonio", email: "antonio@fisionext.com", passwordHash, role: "PROFISSIONAL" } });

  const base = { birthDate: new Date("1990-05-10T12:00:00"), city: "Brasília", state: "DF" };
  const [ana, bruno, carla, diego] = await Promise.all([
    prisma.patient.create({ data: { ...base, name: "Ana Beatriz Lima", cpf: "12345678062", phone: "61999991111", sex: "F", payerType: "AMOR_SAUDE", complaint: "Dor lombar crônica", diagnosis: "Lombalgia mecânica", therapy: "ORTOPEDICA" } }),
    prisma.patient.create({ data: { ...base, name: "Bruno Carvalho", cpf: "98765432029", phone: "61999992222", sex: "M", payerType: "PLANO_SAUDE", insurerName: "Unimed", insuranceCard: "0012345678", complaint: "Pós-op LCA joelho direito", diagnosis: "Reconstrução de LCA", therapy: "ESPORTIVA" } }),
    prisma.patient.create({ data: { ...base, name: "Carla Mendes", cpf: "11122233043", phone: "61999993333", sex: "F", payerType: "PLANO_SAUDE", insurerName: "Bradesco Saúde", insuranceCard: "98765432", complaint: "Sequela de AVC", diagnosis: "Hemiparesia esquerda", therapy: "NEUROLOGICA" } }),
    prisma.patient.create({ data: { ...base, name: "Diego Souza", cpf: "44455566023", phone: "61999994444", sex: "M", payerType: "PARTICULAR", complaint: "Postura e condicionamento", therapy: "PILATES" } }),
  ]);
  await prisma.admission.create({ data: { patientId: ana.id, authorId: sinara.id, complaint: "Dor lombar há 8 meses", history: "Piora ao final do dia, trabalho sentada.", painScale: 8, painLocation: "Região lombar", physioDiagnosis: "Lombalgia mecânica inespecífica", goals: "Reduzir dor e retomar atividade física", therapy: "ORTOPEDICA", plannedSessions: 12, frequency: "2x por semana", consent: true } });

  // Pilates é com o Antonio; as demais consultas, com a Sinara (apenas na demonstração).
  const mk = async (p: { id: string }, therapy: string, when: Date, status: string, price: number, paid: boolean, method = "PIX") => {
    const a = await prisma.appointment.create({ data: { patientId: p.id, therapy, startsAt: when, status, professionalId: therapy === "PILATES" ? antonio.id : sinara.id } });
    await prisma.payment.create({ data: { patientId: p.id, appointmentId: a.id, description: "Sessão", amount: price, dueDate: when, status: paid ? "PAGO" : "PENDENTE", method: paid ? method : null, paidAt: paid ? when : null } });
    return a;
  };

  const pains = [8, 7, 6, 5, 4, 3];
  for (let i = 0; i < pains.length; i++) {
    const a = await mk(ana, "ORTOPEDICA", day(-15 + i * 3, 8), "REALIZADA", 15000, true, ["PIX", "CARTAO_DEBITO", "CARTAO_CREDITO"][i % 3]);
    await prisma.evolution.create({ data: { patientId: ana.id, appointmentId: a.id, authorId: sinara.id, date: a.startsAt, pain: pains[i], techniques: "Liberação miofascial, estabilização lombar, TENS", content: i < 3 ? "Paciente refere dor persistente ao final do dia. Ganho discreto de amplitude." : "Melhora funcional, mantém exercícios domiciliares. Boa adesão." } });
  }
  await mk(ana, "ORTOPEDICA", day(0, 8), "CONFIRMADA", 15000, false);
  await mk(bruno, "ESPORTIVA", day(0, 9, 30), "AGENDADA", 18000, false);
  await mk(carla, "NEUROLOGICA", day(0, 11), "CONFIRMADA", 20000, false);
  await mk(diego, "PILATES", day(0, 15), "AGENDADA", 12000, false);
  await mk(ana, "PILATES", day(0, 15), "AGENDADA", 12000, false); // mesma turma das 15h
  await mk(diego, "PILATES", day(1, 15), "AGENDADA", 12000, false);
  await mk(bruno, "ESPORTIVA", day(2, 9, 30), "AGENDADA", 18000, false);
  await mk(carla, "NEUROLOGICA", day(3, 11), "AGENDADA", 20000, false);
  const b = await mk(bruno, "ESPORTIVA", day(-3, 9, 30), "REALIZADA", 18000, true, "CARTAO_CREDITO");
  await prisma.evolution.create({ data: { patientId: bruno.id, appointmentId: b.id, authorId: sinara.id, date: b.startsAt, pain: 4, techniques: "Cinesioterapia, fortalecimento de quadríceps, crioterapia", content: "Flexão de joelho 110°. Sem edema relevante." } });
}
main().finally(() => prisma.$disconnect());
