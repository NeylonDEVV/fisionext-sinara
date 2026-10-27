import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdmissionWizard } from "@/components/admission-wizard";
import { payerCls, payerLabel } from "@/lib/payer";
import { maskCpf } from "@/lib/cpf";

export const dynamic = "force-dynamic";

export default async function Admissao({ params }: { params: { id: string } }) {
  const p = await prisma.patient.findUnique({ where: { id: params.id }, include: { admission: true } });
  if (!p) notFound();
  const initial = p.admission ? { ...p.admission } : { complaint: p.complaint ?? "", therapy: p.therapy };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/pacientes/${p.id}`} className="text-sm font-semibold text-ink-500 hover:text-brand-600">← {p.name}</Link>
      <div>
        <h1 className="text-2xl font-extrabold">Admissão do paciente</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-500">{p.name} · CPF {maskCpf(p.cpf)}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${payerCls(p.payerType)}`}>{payerLabel(p.payerType)}</span></p>
      </div>
      <AdmissionWizard patientId={p.id} initial={initial} />
    </div>
  );
}
