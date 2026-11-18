import type { Prisma } from "@prisma/client";

/**
 * Ce produse lăsăm să intre în Google: TOATE produsele active, fără nicio condiție.
 *
 * Decizia lui Paul (2026-11-18): „Să nu mai faci blocaje pentru Google, Google este singura noastră sursă de vânzări.”
 * Regula din 8 nov. 2026 (produsele din feed noindex până primeau articol sau recenzii) a fost scoasă de pe toate
 * site-urile de afiliere. Nu pune la loc noindex pe produse, nu le scoate din sitemap și nu le eșalona fără ca Paul
 * să ceară explicit.
 *
 * Singurele pagini de produs fără index sunt cele inactive (oricum fac redirect spre un produs asemănător).
 */
export const INDEXABLE_PRODUCT_WHERE: Prisma.ProductWhereInput = { isActive: true };

export function isIndexableProduct(product: { isActive: boolean }): boolean {
  return product.isActive;
}
