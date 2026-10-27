import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Drawer } from "@/components/motion";
import { addEvolution } from "@/actions";
import { therapyLabel } from "@/lib/therapy";
import { payerCls, payerLabel } from "@/lib/payer";
import { maskCpf, maskPhone } from "@/lib/cpf";
import { fmtDate, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const Info = ({ l, v }: { l: string; v?: string | null }) => (
  <div><dt className="text-xs text-ink-500">{l}</dt><dd className="mt-0.5 text-sm font-semibold">{v || "—"}</dd></div>
);

export default async function Paciente({ params }: { params: { id: string } }) {
  const p = await prisma.patient.findUnique({ where: { id: params.id }, include: { admission: { include: { author: { select: { name: true } } } }, evolutions: { orderBy: { date: "asc" }, include: { author: { select: { name: true } } } } } });
  if (!p) notFound();
  const evs = p.evolutions, adm = p.admission;
  const pts = evs.map((e, i) => `${evs.length > 1 ? (i / (evs.length - 1)) * 280 + 10 : 150},${10 + (1 - e.pain / 10) * 90}`).join(" ");
  const age = Math.floor((Date.now() - p.birthDate.getTime()) / (365.25 * 864e5));
  const address = [p.street && `${p.street}${p.number ? `, ${p.number}` : ""}`, p.complement, p.district, p.city && `${p.city}${p.state ? `/${p.state}` : ""}`].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <Link href="/pacientes" className="text-sm font-semibold text-ink-500 hover:text-brand-600">← Pacientes</Link>

      <div className="card flex flex-wrap items-center gap-5 p-6">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">{initials(p.name)}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold">{p.name}</h1>
          <p className="text-sm text-ink-500">{age} anos · {therapyLabel(p.therapy)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${payerCls(p.payerType)}`}>{payerLabel(p.payerType)}{p.insurerName ? ` · ${p.insurerName}` : ""}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/pacientes/${p.id}/editar`} className="btn-ghost"><Pencil size={15} />Editar</Link>
          <Drawer label="Nova evolução" title="Registrar evolução">
            <form action={addEvolution} className="space-y-4">
              <input type="hidden" name="patientId" value={p.id} />
              <div><label className="label">Dor (0 a 10)</label><input name="pain" type="range" min={0} max={10} defaultValue={5} className="w-full accent-brand-500" /></div>
              <div><label className="label">Condutas e técnicas</label><input name="techniques" className="input" placeholder="Ex.: TENS, cinesioterapia" /></div>
              <div><label className="label">Evolução clínica</label><textarea name="content" required rows={5} className="input" /></div>
              <button className="btn w-full">Salvar evolução</button>
            </form>
          </Drawer>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-bold">Dados cadastrais</h2>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info l="CPF" v={maskCpf(p.cpf)} />
          <Info l="Nascimento" v={p.birthDate.toLocaleDateString("pt-BR")} />
          <Info l="Telefone" v={maskPhone(p.phone)} />
          <Info l="E-mail" v={p.email} />
          <Info l="Carteirinha" v={p.insuranceCard} />
          <div className="sm:col-span-2"><Info l="Endereço" v={address} /></div>
          <Info l="Emergência" v={p.emergencyName ? `${p.emergencyName} ${p.emergencyPhone ? `· ${maskPhone(p.emergencyPhone)}` : ""}` : null} />
        </dl>
      </div>

      {adm ? (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Admissão <span className="font-normal text-ink-400">· {fmtDate(adm.date)}{adm.author ? ` · ${adm.author.name}` : ""}</span></h2>
            <Link href={`/pacientes/${p.id}/admissao`} className="text-sm font-semibold text-brand-600">Ver / editar</Link>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info l="Queixa principal" v={adm.complaint} />
            <Info l="Diagnóstico fisioterapêutico" v={adm.physioDiagnosis} />
            <Info l="Objetivos" v={adm.goals} />
            <Info l="Plano" v={[adm.plannedSessions && `${adm.plannedSessions} sessões`, adm.frequency].filter(Boolean).join(" · ")} />
          </dl>
        </div>
      ) : (
        <Link href={`/pacientes/${p.id}/admissao`} className="flex items-center gap-4 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-200 transition hover:bg-brand-100">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-white"><ClipboardList size={20} /></span>
          <div><p className="font-bold text-brand-700">Admissão pendente</p><p className="text-sm text-ink-600">Faça a avaliação inicial para liberar o plano de tratamento e o laudo.</p></div>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6">
          <h2 className="font-bold">Evolução da dor</h2>
          {evs.length < 2 ? <p className="mt-6 text-sm text-ink-400">Registre ao menos 2 evoluções para ver o gráfico.</p> : (
            <>
              <svg viewBox="0 0 300 110" className="mt-4 w-full">
                <polyline points={pts} fill="none" stroke="#F26B1D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} style={{ animation: "draw 1.2s ease forwards" }} />
                {pts.split(" ").map((pt, i) => <circle key={i} cx={pt.split(",")[0]} cy={pt.split(",")[1]} r="4" fill="#fff" stroke="#F26B1D" strokeWidth="2" />)}
              </svg>
              <style>{`@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}`}</style>
              <p className="mt-2 text-sm text-ink-600">De <b>{evs[0].pain}</b> para <b>{evs.at(-1)!.pain}</b> na escala de dor.</p>
            </>
          )}
        </div>
        <div className="card p-6 lg:col-span-2">
          <h2 className="mb-4 font-bold">Histórico de sessões</h2>
          {evs.length === 0 && <p className="text-sm text-ink-400">Nenhuma evolução registrada ainda.</p>}
          <ol className="space-y-5 border-l-2 border-ink-100 pl-5">
            {[...evs].reverse().map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-brand-500 ring-4 ring-white" />
                <div className="flex justify-between text-sm"><span className="font-semibold">{fmtDate(e.date)}{e.author && <span className="font-normal text-ink-400"> · {e.author.name}</span>}</span><span className="font-semibold text-brand-600">Dor {e.pain}/10</span></div>
                <p className="mt-1 text-sm text-ink-700">{e.content}</p>
                {e.techniques && <p className="mt-1 text-xs text-ink-500">Condutas: {e.techniques}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
