"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { METHODS } from "@/lib/payer";
import { authorIdOf } from "@/lib/author";

const refresh = () => ["/dashboard", "/agenda", "/pilates", "/pacientes", "/financeiro"].forEach((p) => revalidatePath(p));

export async function createAppointment(fd: FormData) {
  await requireSession();
  const kind = String(fd.get("kind") ?? ""); // "consultas" | "pilates" (agenda de origem)
  const therapy = kind === "pilates" ? "PILATES" : String(fd.get("therapy"));
  if (kind === "consultas" && therapy === "PILATES") return; // pilates tem agenda própria
  const startsAt = new Date(`${fd.get("date")}T${fd.get("time")}`);
  const patientId = String(fd.get("patientId"));
  const price = Math.round(Number(fd.get("price") || 0) * 100);
  let professionalId: string | null = String(fd.get("professionalId") ?? "") || null;
  if (professionalId && !(await prisma.user.findFirst({ where: { id: professionalId, active: true }, select: { id: true } }))) professionalId = null;
  const a = await prisma.appointment.create({ data: {
    patientId, startsAt, therapy, durationMin: Number(fd.get("duration") || 50), professionalId,
  } });
  if (price > 0) await prisma.payment.create({ data: { patientId, appointmentId: a.id, description: "Sessão", amount: price, dueDate: startsAt } });
  refresh();
}

export async function setAppointmentStatus(fd: FormData) {
  await requireSession();
  await prisma.appointment.update({ where: { id: String(fd.get("id")) }, data: { status: String(fd.get("status")) } });
  refresh();
}

export async function addEvolution(fd: FormData) {
  const session = await requireSession();
  const patientId = String(fd.get("patientId"));
  await prisma.evolution.create({ data: {
    patientId, pain: Number(fd.get("pain")), techniques: String(fd.get("techniques") || "") || null, content: String(fd.get("content")),
    authorId: await authorIdOf(session.id),
  } });
  revalidatePath(`/pacientes/${patientId}`); refresh();
}

export async function markPaid(fd: FormData) {
  await requireSession();
  const method = String(fd.get("method"));
  if (!(method in METHODS)) return;
  await prisma.payment.update({ where: { id: String(fd.get("id")) }, data: { status: "PAGO", paidAt: new Date(), method } });
  refresh();
}
