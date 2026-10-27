import { AgendaView } from "@/components/agenda-view";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Agenda({ searchParams }: { searchParams: { prof?: string } }) {
  const me = await requireSession();
  return <AgendaView kind="consultas" basePath="/agenda" prof={searchParams.prof} meId={me.id} />;
}
