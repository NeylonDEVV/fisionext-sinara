import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPatient, saveAdmission } from "@/actions-patient";
import { fd, clearDb, validPatient, newPatient } from "./helpers";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/session", () => ({ requireSession: vi.fn(async () => ({ id: "u1", name: "Teste", email: "t@t.com" })) }));

beforeEach(clearDb);

describe("createPatient", () => {
  it("cria o paciente e segue para a admissão", async () => {
    await expect(createPatient(undefined, fd(validPatient))).rejects.toThrow(/REDIRECT:\/pacientes\/.+\/admissao/);
    const p = await prisma.patient.findUnique({ where: { cpf: "52998224725" } });
    expect(p).toMatchObject({ name: "Maria da Silva", phone: "61999991111", payerType: "PARTICULAR" });
  });
  it("recusa CPF inválido", async () => {
    expect(await createPatient(undefined, fd({ ...validPatient, cpf: "111.111.111-11" }))).toEqual({ error: "CPF inválido." });
    expect(await prisma.patient.count()).toBe(0);
  });
  it("recusa CPF duplicado", async () => {
    await newPatient();
    const r = await createPatient(undefined, fd(validPatient));
    expect(r?.error).toMatch(/já existe/i);
    expect(await prisma.patient.count()).toBe(1);
  });
  it("exige nome completo, nascimento válido e telefone com DDD", async () => {
    expect((await createPatient(undefined, fd({ ...validPatient, name: "Maria" })))?.error).toMatch(/nome completo/i);
    expect((await createPatient(undefined, fd({ ...validPatient, birthDate: "2999-01-01" })))?.error).toMatch(/nascimento/i);
    expect((await createPatient(undefined, fd({ ...validPatient, phone: "9999" })))?.error).toMatch(/telefone/i);
  });
  it("plano de saúde exige operadora e grava carteirinha", async () => {
    expect((await createPatient(undefined, fd({ ...validPatient, payerType: "PLANO_SAUDE" })))?.error).toMatch(/operadora/i);
    await expect(createPatient(undefined, fd({ ...validPatient, payerType: "PLANO_SAUDE", insurerName: "Unimed", insuranceCard: "123" }))).rejects.toThrow(/REDIRECT/);
    expect(await prisma.patient.findUnique({ where: { cpf: "52998224725" } })).toMatchObject({ insurerName: "Unimed", insuranceCard: "123" });
  });
  it("ignora operadora enviada para quem não é de plano", async () => {
    await expect(createPatient(undefined, fd({ ...validPatient, payerType: "AMOR_SAUDE", insurerName: "Unimed" }))).rejects.toThrow(/REDIRECT/);
    expect(await prisma.patient.findUnique({ where: { cpf: "52998224725" } })).toMatchObject({ payerType: "AMOR_SAUDE", insurerName: null });
  });
});

describe("saveAdmission", () => {
  const base = { complaint: "Dor lombar", physioDiagnosis: "Lombalgia", goals: "Reduzir dor", consent: "on", painScale: "7", therapy: "NEUROLOGICA", plannedSessions: "10" };

  it("exige consentimento e campos obrigatórios", async () => {
    const p = await newPatient();
    expect((await saveAdmission(undefined, fd({ patientId: p.id, ...base, consent: "" })))?.error).toMatch(/consentimento/i);
    expect((await saveAdmission(undefined, fd({ patientId: p.id, ...base, goals: "" })))?.error).toMatch(/preencha/i);
    expect(await prisma.admission.count()).toBe(0);
  });
  it("salva a admissão, atualiza o paciente e cria a evolução inicial", async () => {
    const p = await newPatient();
    await expect(saveAdmission(undefined, fd({ patientId: p.id, ...base }))).rejects.toThrow(`REDIRECT:/pacientes/${p.id}`);
    expect(await prisma.admission.findUnique({ where: { patientId: p.id } })).toMatchObject({ painScale: 7, plannedSessions: 10, consent: true });
    expect(await prisma.patient.findUnique({ where: { id: p.id } })).toMatchObject({ therapy: "NEUROLOGICA", diagnosis: "Lombalgia" });
    const evs = await prisma.evolution.findMany({ where: { patientId: p.id } });
    expect(evs).toHaveLength(1);
    expect(evs[0].pain).toBe(7);
  });
  it("editar a admissão não duplica a evolução inicial", async () => {
    const p = await newPatient();
    await expect(saveAdmission(undefined, fd({ patientId: p.id, ...base }))).rejects.toThrow(/REDIRECT/);
    await expect(saveAdmission(undefined, fd({ patientId: p.id, ...base, goals: "Novo objetivo" }))).rejects.toThrow(/REDIRECT/);
    expect(await prisma.admission.count()).toBe(1);
    expect(await prisma.evolution.count()).toBe(1);
    expect((await prisma.admission.findUnique({ where: { patientId: p.id } }))?.goals).toBe("Novo objetivo");
  });
  it("limita a dor entre 0 e 10", async () => {
    const p = await newPatient();
    await expect(saveAdmission(undefined, fd({ patientId: p.id, ...base, painScale: "15" }))).rejects.toThrow(/REDIRECT/);
    expect((await prisma.admission.findUnique({ where: { patientId: p.id } }))?.painScale).toBe(10);
  });
});
