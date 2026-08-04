import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { publishArticleAction, unpublishArticleAction } from "@/lib/actions/adminActions";

export default async function AdminArticlesPage() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-6">Articole</h1>

      <div className="rounded-2xl bg-white border border-brand-100 divide-y divide-brand-50">
        {articles.length === 0 && (
          <p className="p-5 text-sm text-brand-800/60">
            Niciun articol încă — generează unul din secțiunea Produse.
          </p>
        )}
        {articles.map((article) => (
          <div key={article.id} className="p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/admin/articles/${article.id}`} className="font-medium text-brand-900 hover:underline">
                  {article.title}
                </Link>
                <span
                  className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                    article.status === "published" ? "bg-brand-100 text-brand-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {article.status === "published" ? "publicat" : "ciornă"}
                </span>
              </div>
              {article.product && <p className="text-xs text-brand-800/60 mt-1">Produs: {article.product.name}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/admin/articles/${article.id}`}
                className="rounded-full border border-brand-300 text-brand-700 text-sm font-medium px-4 py-1.5 hover:bg-brand-50"
              >
                Editează
              </Link>
              {article.status === "published" ? (
                <form action={unpublishArticleAction.bind(null, article.id)}>
                  <button
                    type="submit"
                    className="rounded-full bg-zinc-100 text-zinc-600 text-sm font-medium px-4 py-1.5 hover:bg-zinc-200"
                  >
                    Retrage
                  </button>
                </form>
              ) : (
                <form action={publishArticleAction.bind(null, article.id)}>
                  <button
                    type="submit"
                    className="rounded-full bg-brand-600 text-white text-sm font-medium px-4 py-1.5 hover:bg-brand-700"
                  >
                    Publică
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
