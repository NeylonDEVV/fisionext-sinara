import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { UserForm } from "@/components/user-form";

export const dynamic = "force-dynamic";

export default async function NovoProfissional() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/equipe" className="text-sm font-semibold text-ink-500 hover:text-brand-600">← Equipe</Link>
      <div><h1 className="text-2xl font-extrabold">Novo profissional</h1><p className="text-sm text-ink-500">Cada pessoa entra com o próprio e-mail e senha.</p></div>
      <UserForm />
    </div>
  );
}
