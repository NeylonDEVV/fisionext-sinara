import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const me = await prisma.user.findUnique({ where: { id: session.id }, select: { name: true, email: true, role: true } });
  if (!me) redirect("/api/logout");
  return (<div className="min-h-screen"><Sidebar user={me} /><main className="px-5 pb-28 pt-8 md:ml-64 md:px-10 md:pb-12"><div className="mx-auto max-w-6xl">{children}</div></main></div>);
}
