import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAppointment } from "@/actions";
import { fd, clearDb, newPatient } from "./helpers";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireSession: vi.fn(async () => ({ id: "u1", name: "Teste", email: "t@t.com" })) }));

const base = { date: "2026-11-10", time: "09:00", duration: "50" };
const pro = (name: string, active = true) => prisma.user.create({ data: { name, email: `${name}@clinica.com`, passwordHash: "x", active } });

beforeEach(clearDb);

describe("agendas separadas", () => {
  it("a agenda de pilates sempre grava PILATES, com o profissional escolhido", async () => {
    const [p, antonio] = [await newPatient(), await pro("antonio")];
    await createAppointment(fd({ ...base, kind: "pilates", patientId: p.id, therapy: "ORTOPEDICA", professionalId: antonio.id }));
    expect(await prisma.appointment.findFirst()).toMatchObject({ therapy: "PILATES", professionalId: antonio.id });
  });
  it("a agenda de consultas não aceita pilates", async () => {
    const p = await newPatient();
    await createAppointment(fd({ ...base, kind: "consultas", patientId: p.id, therapy: "PILATES" }));
    expect(await prisma.appointment.count()).toBe(0);
    await createAppointment(fd({ ...base, kind: "consultas", patientId: p.id, therapy: "ORTOPEDICA" }));
    expect(await prisma.appointment.count()).toBe(1);
  });
  it("ignora profissional inexistente ou desativado", async () => {
    const [p, off] = [await newPatient(), await pro("sinara", false)];
    await createAppointment(fd({ ...base, kind: "consultas", patientId: p.id, therapy: "ORTOPEDICA", professionalId: off.id }));
    await createAppointment(fd({ ...base, kind: "consultas", patientId: p.id, therapy: "ORTOPEDICA", professionalId: "naoexiste" }));
    const all = await prisma.appointment.findMany();
    expect(all).toHaveLength(2);
    expect(all.every((a) => a.professionalId === null)).toBe(true);
  });
});
