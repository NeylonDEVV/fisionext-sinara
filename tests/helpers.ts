import { prisma } from "@/lib/prisma";

export const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

export async function clearDb() {
  await prisma.payment.deleteMany(); await prisma.evolution.deleteMany(); await prisma.admission.deleteMany();
  await prisma.appointment.deleteMany(); await prisma.patient.deleteMany(); await prisma.user.deleteMany();
}

export const validPatient = {
  name: "Maria da Silva", cpf: "529.982.247-25", birthDate: "1985-03-20", phone: "(61) 99999-1111", payerType: "PARTICULAR", therapy: "ORTOPEDICA",
};

export const newPatient = (cpf = "52998224725") =>
  prisma.patient.create({ data: { name: "Paciente Teste", cpf, birthDate: new Date("1990-01-01T12:00:00"), phone: "61999990000" } });
