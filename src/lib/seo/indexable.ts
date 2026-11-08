import type { Prisma } from "@prisma/client";
import { KEEP_INDEXED_SLUGS } from "@/lib/seo/keepIndexed";

/**
 * Regula ritmului (Paul, 2026-11-08): produsele din feed nu mai intră în Google cu miile deodată — libratic a fost
 * retrogradat de Google pentru asta, iar jucatic nu se indexa. Pe acest site, tot ce exista înainte de regulă merge și
 * rămâne indexabil neatins. Produsele adăugate de acum din feed sunt pe site pentru vizitatori (listări, căutare, buton de
 * cumpărare), dar intră în Google doar când au conținut propriu: articol publicat sau recenzii ale vizitatorilor.
 */
export const INDEXING_CUTOFF = new Date("2026-11-09T00:00:00+02:00");

export const INDEXABLE_PRODUCT_WHERE: Prisma.ProductWhereInput = {
  isActive: true,
  OR: [
    { createdAt: { lt: INDEXING_CUTOFF } },
    { articles: { some: { status: "published" } } },
    { reviews: { some: {} } },
    ...(KEEP_INDEXED_SLUGS.length > 0 ? [{ slug: { in: KEEP_INDEXED_SLUGS } }] : []),
  ],
};

export function isIndexableProduct(product: {
  isActive: boolean;
  slug: string;
  createdAt: Date;
  /** Doar articolele publicate (așa le încarcă getProduct). */
  articles: unknown[];
  reviews: unknown[];
}): boolean {
  return (
    product.isActive &&
    (product.createdAt < INDEXING_CUTOFF ||
      product.articles.length > 0 ||
      product.reviews.length > 0 ||
      KEEP_INDEXED_SLUGS.includes(product.slug))
  );
}
