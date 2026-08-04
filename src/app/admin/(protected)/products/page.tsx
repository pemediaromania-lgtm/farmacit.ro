import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  generateArticleAction,
  generateMissingArticlesBatchAction,
  toggleProductActiveAction,
} from "@/lib/actions/adminActions";

export default async function AdminProductsPage() {
  const [products, missingArticlesCount] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ articles: { _count: "asc" } }, { createdAt: "desc" }],
      take: 100,
      include: { _count: { select: { articles: true } }, feed: true },
    }),
    prisma.product.count({ where: { isActive: true, articles: { none: {} } } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Produse</h1>
        {missingArticlesCount > 0 && (
          <form action={generateMissingArticlesBatchAction} className="flex items-center gap-3">
            <span className="text-sm text-brand-800/70">{missingArticlesCount} produse fără articol</span>
            <button
              type="submit"
              className="rounded-full bg-brand-600 text-white text-sm font-medium px-4 py-2 hover:bg-brand-700"
            >
              Generează 10 articole lipsă
            </button>
          </form>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-brand-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-50 text-left text-brand-800">
              <th className="p-3 font-medium">Produs</th>
              <th className="p-3 font-medium">Magazin</th>
              <th className="p-3 font-medium">Preț</th>
              <th className="p-3 font-medium">Click-uri</th>
              <th className="p-3 font-medium">Activ</th>
              <th className="p-3 font-medium">Articol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="p-5 text-brand-800/60">
                  Niciun produs importat încă — adaugă un feed în secțiunea Feed-uri.
                </td>
              </tr>
            )}
            {products.map((product) => (
              <tr key={product.id}>
                <td className="p-3 max-w-xs">
                  <Link href={`/produse/${product.slug}`} target="_blank" className="font-medium text-brand-900 hover:underline">
                    {product.name}
                  </Link>
                </td>
                <td className="p-3 text-brand-800/70">{product.merchant ?? product.feed?.name ?? "—"}</td>
                <td className="p-3 text-brand-800/70">
                  {product.price != null ? `${product.price.toFixed(2)} ${product.currency}` : "—"}
                </td>
                <td className="p-3 text-brand-800/70">{product.clickCount}</td>
                <td className="p-3">
                  <form action={toggleProductActiveAction.bind(null, product.id, !product.isActive)}>
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        product.isActive ? "bg-brand-100 text-brand-700" : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {product.isActive ? "Activ" : "Ascuns"}
                    </button>
                  </form>
                </td>
                <td className="p-3">
                  {product._count.articles > 0 ? (
                    <span className="text-brand-700 text-xs font-medium">✓ generat</span>
                  ) : (
                    <form action={generateArticleAction.bind(null, product.id)}>
                      <button
                        type="submit"
                        className="rounded-full bg-brand-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-brand-700"
                      >
                        Generează articol
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
