import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Drawer } from "@/components/motion";
import { createAppointment, setAppointmentStatus } from "@/actions";
import { fmtTime, fmtWeekday, startOfDay, addDays } from "@/lib/utils";
import { THERAPIES, STATUS, therapyColor, therapyLabel } from "@/lib/therapy";
import { agendaWhere, groupBySlot, type AgendaKind } from "@/lib/agenda";

type Item = { id: string; startsAt: Date; durationMin: number; therapy: string; status: string; patient: { name: string }; professional: { name: string } | null };

function Row({ a, showTime }: { a: Item; showTime: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-2">
      {showTime && <span className="w-12 text-sm font-bold">{fmtTime(a.startsAt)}</span>}
      <span className="h-9 w-1 rounded-full" style={{ background: therapyColor(a.therapy) }} />
      <div className="min-w-40 flex-1">
        <p className="text-sm font-semibold">{a.patient.name}</p>
        <p className="text-xs text-ink-500">{therapyLabel(a.therapy)} · {a.durationMin} min{a.professional ? ` · ${a.professional.name.split(" ")[0]}` : ""}</p>
      </div>
      <form action={setAppointmentStatus} className="flex items-center gap-2">
        <input type="hidden" name="id" value={a.id} />
        <select name="status" defaultValue={a.status} className={`cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs font-semibold ${STATUS[a.status].cls}`}>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="btn-ghost !px-2.5 !py-1.5 text-xs">Salvar</button>
      </form>
    </div>
  );
}

export async function AgendaView({ kind, basePath, prof, meId }: { kind: AgendaKind; basePath: string; prof?: string; meId: string }) {
  const pilates = kind === "pilates";
  const sod = startOfDay();
  const pros = await prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const selected = pros.find((p) => p.id === prof)?.id;
  const [list, patients] = await Promise.all([
    prisma.appointment.findMany({
      where: agendaWhere(kind, sod, addDays(sod, 7), selected),
      include: { patient: true, professional: { select: { name: true } } }, orderBy: { startsAt: "asc" },
    }),
    prisma.patient.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(sod, i));
  const chip = (on: boolean) => `rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${on ? "bg-brand-500 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-100"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{pilates ? "Pilates" : "Agenda"}</h1>
          <p className="text-sm text-ink-500">{pilates ? "Aulas e sessões de pilates" : "Consultas e sessões de fisioterapia"} · próximos 7 dias</p>
        </div>
        <Drawer label={pilates ? "Nova aula" : "Nova sessão"} title={pilates ? "Agendar aula de pilates" : "Agendar sessão"}>
          <form action={createAppointment} className="space-y-4">
            <input type="hidden" name="kind" value={kind} />
            <div><label className="label">Paciente</label>
              <select name="patientId" required className="input">{patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label">Profissional</label>
              <select name="professionalId" defaultValue={pros.some((p) => p.id === meId) ? meId : ""} className="input">
                <option value="">—</option>{pros.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            {!pilates && (
              <div><label className="label">Tipo de fisioterapia</label>
                <select name="therapy" className="input">{Object.entries(THERAPIES).filter(([k]) => k !== "PILATES").map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Data</label><input name="date" type="date" required className="input" /></div>
              <div><label className="label">Horário</label><input name="time" type="time" required className="input" /></div>
              <div><label className="label">Duração (min)</label><input name="duration" type="number" defaultValue={50} className="input" /></div>
              <div><label className="label">Valor (R$)</label><input name="price" type="number" step="0.01" placeholder="150,00" className="input" /></div>
            </div>
            <button className="btn w-full">Agendar</button>
          </form>
        </Drawer>
      </div>

      {pros.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Link href={basePath} className={chip(!selected)}>Todos</Link>
          {pros.map((p) => <Link key={p.id} href={`${basePath}?prof=${p.id}`} className={chip(selected === p.id)}>{p.name.split(" ")[0]}</Link>)}
        </div>
      )}

      {days.map((d) => {
        const items = list.filter((a) => startOfDay(a.startsAt).getTime() === d.getTime());
        return (
          <section key={d.getTime()}>
            <h2 className="mb-2 text-sm font-bold capitalize text-ink-600">{fmtWeekday(d)}</h2>
            <div className="card divide-y divide-ink-100 px-5">
              {items.length === 0 && <p className="py-4 text-sm text-ink-400">Dia livre</p>}
              {pilates
                ? groupBySlot(items).map((slot) => (
                    <div key={slot.time.getTime()} className="py-3">
                      <div className="mb-1 flex items-center gap-3">
                        <span className="text-sm font-bold">{fmtTime(slot.time)}</span>
                        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{slot.items.length} {slot.items.length === 1 ? "aluno" : "alunos"}</span>
                      </div>
                      {slot.items.map((a) => <Row key={a.id} a={a} showTime={false} />)}
                    </div>
                  ))
                : items.map((a) => <Row key={a.id} a={a} showTime />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
