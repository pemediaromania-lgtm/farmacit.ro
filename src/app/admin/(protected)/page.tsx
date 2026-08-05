import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_LABELS, parseActivityMeta, type ActivityAction } from "@/lib/activityLog";
import { regenerateCategoryImagesAction, generateCategoryContentAction } from "@/lib/actions/adminActions";

export default async function AdminDashboardPage() {
  const [feedCount, productCount, publishedCount, draftCount, clicksAgg, recentActivity] = await Promise.all([
    prisma.feed.count(),
    prisma.product.count(),
    prisma.article.count({ where: { status: "published" } }),
    prisma.article.count({ where: { status: "draft" } }),
    prisma.product.aggregate({ _sum: { clickCount: true } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { user: true } }),
  ]);

  const tiles = [
    { label: "Feed-uri", value: feedCount, href: "/admin/feeds" },
    { label: "Produse importate", value: productCount, href: "/admin/products" },
    { label: "Articole publicate", value: publishedCount, href: "/admin/articles" },
    { label: "Articole ciornă", value: draftCount, href: "/admin/articles" },
    { label: "Click-uri afiliate", value: clicksAgg._sum.clickCount ?? 0, href: "/admin/activity" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-6">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-10">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="rounded-2xl bg-white border border-brand-100 p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-3xl font-bold text-brand-700">{tile.value}</p>
            <p className="mt-1 text-sm text-brand-800/70">{tile.label}</p>
          </Link>
        ))}
      </div>

      <form action={regenerateCategoryImagesAction} className="mb-10 flex items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-brand-600 text-white text-sm font-medium px-4 py-2 hover:bg-brand-700"
        >
          Generează imaginile categoriilor (DALL·E)
        </button>
        <span className="text-xs text-brand-800/60">
          O singură imagine ilustrativă per categorie (nu per produs) — poate dura 1-2 minute.
        </span>
      </form>

      <form action={generateCategoryContentAction} className="mb-10 flex items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-brand-600 text-white text-sm font-medium px-4 py-2 hover:bg-brand-700"
        >
          Generează descrieri SEO + FAQ categorii
        </button>
        <span className="text-xs text-brand-800/60">
          Text SEO și FAQ pentru fiecare grup și subcategorie — completează doar ce lipsește, poate dura câteva minute.
        </span>
      </form>

      <h2 className="text-lg font-semibold text-brand-900 mb-4">Activitate recentă</h2>
      <div className="rounded-2xl bg-white border border-brand-100 divide-y divide-brand-50">
        {recentActivity.length === 0 && <p className="p-5 text-sm text-brand-800/60">Nicio activitate încă.</p>}
        {recentActivity.map((entry) => {
          const meta = parseActivityMeta(entry.meta);
          const label = ACTIVITY_LABELS[entry.action as ActivityAction] ?? entry.action;
          return (
            <div key={entry.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-brand-900">{label}</span>
                {typeof meta?.name === "string" && <span className="text-brand-800/70"> — {meta.name}</span>}
                {typeof meta?.title === "string" && <span className="text-brand-800/70"> — {meta.title}</span>}
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
