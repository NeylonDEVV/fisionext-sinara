import { AgendaView } from "@/components/agenda-view";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Pilates({ searchParams }: { searchParams: { prof?: string } }) {
  const me = await requireSession();
  return <AgendaView kind="pilates" basePath="/pilates" prof={searchParams.prof} meId={me.id} />;
}
