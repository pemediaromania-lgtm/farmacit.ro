import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_LABELS, parseActivityMeta, type ActivityAction } from "@/lib/activityLog";

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  const entries = await prisma.activityLog.findMany({
    where: action ? { action } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true },
  });

  const actions = Object.keys(ACTIVITY_LABELS) as ActivityAction[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-6">Jurnal de activitate</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/admin/activity"
          className={`rounded-full px-3 py-1 text-xs font-medium border ${
            !action ? "bg-brand-600 text-white border-brand-600" : "border-brand-200 text-brand-700 hover:bg-brand-50"
          }`}
        >
          Toate
        </Link>
        {actions.map((a) => (
          <Link
            key={a}
            href={`/admin/activity?action=${a}`}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              action === a ? "bg-brand-600 text-white border-brand-600" : "border-brand-200 text-brand-700 hover:bg-brand-50"
            }`}
          >
            {ACTIVITY_LABELS[a]}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-brand-100 divide-y divide-brand-50">
        {entries.length === 0 && <p className="p-5 text-sm text-brand-800/60">Nicio activitate găsită.</p>}
        {entries.map((entry) => {
          const meta = parseActivityMeta(entry.meta);
          const label = ACTIVITY_LABELS[entry.action as ActivityAction] ?? entry.action;
          return (
            <div key={entry.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-brand-900">{label}</span>
                {typeof meta?.name === "string" && <span className="text-brand-800/70"> — {meta.name}</span>}
                {typeof meta?.title === "string" && <span className="text-brand-800/70"> — {meta.title}</span>}
                {entry.user?.name && <span className="text-brand-800/50"> · de {entry.user.name}</span>}
              </div>
              <span className="text-brand-800/50 whitespace-nowrap ml-4">
                {entry.createdAt.toLocaleString("ro-RO")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
