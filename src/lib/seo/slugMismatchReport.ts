import { prisma } from "@/lib/prisma";
import { slugMatchesName } from "@/lib/seo/slugMismatch";

/** Câte produse au adresa altui produs (suprascrise la sincronizare) — pentru /api/health?nepotriviri. */
export async function slugMismatchReport() {
  const [products, articles] = await Promise.all([
    prisma.product.findMany({ select: { id: true, slug: true, name: true, isActive: true } }),
    prisma.article.findMany({ where: { productId: { not: null } }, select: { productId: true } }),
  ]);
  const withArticle = new Set(articles.map((a) => a.productId));
  const mismatched = products.filter((p) => !slugMatchesName(p.slug, p.name));
  return {
    produse: products.length,
    nepotrivite: mismatched.length,
    nepotriviteActive: mismatched.filter((p) => p.isActive).length,
    nepotriviteCuArticol: mismatched.filter((p) => withArticle.has(p.id)).length,
    exemple: mismatched.slice(0, 15).map((p) => ({ adresa: p.slug, arata: p.name })),
  };
}
