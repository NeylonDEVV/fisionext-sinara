import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAppointment, markPaid } from "@/actions";
import { fd, clearDb, newPatient } from "./helpers";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireSession: vi.fn(async () => ({ id: "u1", name: "Teste", email: "t@t.com" })) }));

beforeEach(clearDb);

async function pendingPayment() {
  const p = await newPatient();
  return prisma.payment.create({ data: { patientId: p.id, description: "Sessão", amount: 15000, dueDate: new Date() } });
}

describe("markPaid", () => {
  it.each(["PIX", "DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO"])("dá baixa com %s", async (method) => {
    const pay = await pendingPayment();
    await markPaid(fd({ id: pay.id, method }));
    expect(await prisma.payment.findUnique({ where: { id: pay.id } })).toMatchObject({ status: "PAGO", method });
  });
  it("não aceita boleto nem formas desconhecidas", async () => {
    const pay = await pendingPayment();
    await markPaid(fd({ id: pay.id, method: "BOLETO" }));
    expect((await prisma.payment.findUnique({ where: { id: pay.id } }))?.status).toBe("PENDENTE");
  });
});

describe("createAppointment", () => {
  it("cria a sessão e a cobrança pendente quando há valor", async () => {
    const p = await newPatient();
    await createAppointment(fd({ patientId: p.id, therapy: "ORTOPEDICA", date: "2026-11-10", time: "09:00", duration: "50", price: "150" }));
    expect(await prisma.appointment.count()).toBe(1);
    expect(await prisma.payment.findFirst({ where: { patientId: p.id } })).toMatchObject({ amount: 15000, status: "PENDENTE" });
  });
  it("não cria cobrança sem valor", async () => {
    const p = await newPatient();
    await createAppointment(fd({ patientId: p.id, therapy: "PILATES", date: "2026-11-10", time: "10:00" }));
    expect(await prisma.payment.count()).toBe(0);
  });
});
