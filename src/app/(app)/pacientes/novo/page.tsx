import Link from "next/link";
import { PatientForm } from "@/components/patient-form";
import { createPatient } from "@/actions-patient";

export default function NovoPaciente() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/pacientes" className="text-sm font-semibold text-ink-500 hover:text-brand-600">← Pacientes</Link>
      <div><h1 className="text-2xl font-extrabold">Novo paciente</h1><p className="text-sm text-ink-500">Depois do cadastro você segue direto para a admissão.</p></div>
      <PatientForm action={createPatient} submitLabel="Cadastrar e iniciar admissão" />
    </div>
  );
}
