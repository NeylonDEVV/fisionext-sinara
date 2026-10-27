"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { authorIdOf } from "@/lib/author";
import { g, opt, readPatient } from "@/lib/patient-input";

type State = { error?: string } | undefined;
export async function createPatient(_prev: State, fd: FormData): Promise<State> {
  await requireSession();
  const { data, error } = readPatient(fd);
  if (error) return { error };
  if (await prisma.patient.findUnique({ where: { cpf: data.cpf } })) return { error: "Já existe um paciente com esse CPF." };
  const p = await prisma.patient.create({ data });
  revalidatePath("/pacientes");
  redirect(`/pacientes/${p.id}/admissao`);
}

export async function updatePatient(_prev: State, fd: FormData): Promise<State> {
  await requireSession();
  const id = g(fd, "id");
  const { data, error } = readPatient(fd);
  if (error) return { error };
  if (await prisma.patient.findFirst({ where: { cpf: data.cpf, NOT: { id } } })) return { error: "Já existe outro paciente com esse CPF." };
  await prisma.patient.update({ where: { id }, data });
  revalidatePath("/pacientes"); revalidatePath(`/pacientes/${id}`);
  redirect(`/pacientes/${id}`);
}

export async function saveAdmission(_prev: State, fd: FormData): Promise<State> {
  const session = await requireSession();
  const authorId = await authorIdOf(session.id);
  const patientId = g(fd, "patientId");
  const complaint = g(fd, "complaint"), physioDiagnosis = g(fd, "physioDiagnosis"), goals = g(fd, "goals");
  if (!complaint || !physioDiagnosis || !goals) return { error: "Preencha queixa principal, diagnóstico fisioterapêutico e objetivos." };
  if (fd.get("consent") !== "on") return { error: "Registre o consentimento do paciente para concluir." };
  const sessions = Number(fd.get("plannedSessions"));
  const data = {
    referralDoctor: opt(fd, "referralDoctor"), medicalDiagnosis: opt(fd, "medicalDiagnosis"), cid: opt(fd, "cid"),
    complaint, history: opt(fd, "history"), comorbidities: opt(fd, "comorbidities"), medications: opt(fd, "medications"),
    surgeries: opt(fd, "surgeries"), allergies: opt(fd, "allergies"), habits: opt(fd, "habits"),
    painScale: Math.min(10, Math.max(0, Number(fd.get("painScale") || 0))), painLocation: opt(fd, "painLocation"),
    vitalSigns: opt(fd, "vitalSigns"), posture: opt(fd, "posture"), rom: opt(fd, "rom"), strength: opt(fd, "strength"),
    specialTests: opt(fd, "specialTests"), physioDiagnosis, goals, therapy: g(fd, "therapy") || "ORTOPEDICA",
    plannedSessions: sessions > 0 ? sessions : null, frequency: opt(fd, "frequency"), conduct: opt(fd, "conduct"), consent: true,
  };
  const existing = await prisma.admission.findUnique({ where: { patientId } });
  await prisma.admission.upsert({ where: { patientId }, update: data, create: { patientId, ...data, authorId } });
  await prisma.patient.update({ where: { id: patientId }, data: { complaint, diagnosis: physioDiagnosis, therapy: data.therapy } });
  if (!existing) {
    await prisma.evolution.create({ data: { patientId, pain: data.painScale, techniques: data.conduct, authorId, content: `Avaliação inicial (admissão). Queixa: ${complaint}` } });
  }
  revalidatePath("/pacientes"); revalidatePath(`/pacientes/${patientId}`);
  redirect(`/pacientes/${patientId}`);
}
