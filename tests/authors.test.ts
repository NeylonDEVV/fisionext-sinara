import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { addEvolution } from "@/actions";
import { saveAdmission } from "@/actions-patient";
import { fd, clearDb, newPatient } from "./helpers";

const state = vi.hoisted(() => ({ meId: "" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/session", () => ({ requireSession: vi.fn(async () => ({ id: state.meId, name: "x", email: "x@x.com" })) }));

const pro = (n: string) => prisma.user.create({ data: { name: n, email: `${n}@clinica.com`, passwordHash: "x" } });
const adm = { complaint: "Dor", physioDiagnosis: "Dx", goals: "Meta", consent: "on", painScale: "5" };

beforeEach(clearDb);

describe("autoria dos registros clínicos", () => {
  it("a evolução guarda quem registrou", async () => {
    const [p, sinara] = [await newPatient(), await pro("sinara")];
    state.meId = sinara.id;
    await addEvolution(fd({ patientId: p.id, pain: "4", content: "Boa evolução" }));
    expect((await prisma.evolution.findFirst())?.authorId).toBe(sinara.id);
  });
  it("a admissão guarda quem fez e não muda quando outro profissional edita", async () => {
    const [p, sinara, antonio] = [await newPatient(), await pro("sinara"), await pro("antonio")];
    state.meId = sinara.id;
    await expect(saveAdmission(undefined, fd({ patientId: p.id, ...adm }))).rejects.toThrow(/REDIRECT/);
    state.meId = antonio.id;
    await expect(saveAdmission(undefined, fd({ patientId: p.id, ...adm, goals: "Meta nova" }))).rejects.toThrow(/REDIRECT/);
    expect(await prisma.admission.findUnique({ where: { patientId: p.id } })).toMatchObject({ authorId: sinara.id, goals: "Meta nova" });
    expect((await prisma.evolution.findFirst())?.authorId).toBe(sinara.id); // evolução inicial, da primeira admissão
  });
});
