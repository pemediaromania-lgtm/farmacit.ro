import slugify from "slugify";
import { prisma } from "@/lib/prisma";

export function baseSlug(text: string) {
  return slugify(text, { lower: true, strict: true, locale: "ro" }) || "item";
}

/**
 * Variantă sincronă, în memorie, pentru dedup de slug-uri la import în masă (mii de produse) —
 * evită un query DB per produs. `taken` trebuie pre-populat cu toate slug-urile existente și e
 * mutat pe măsură ce se ating noi candidați, ca produsele din același import să nu se coliziona
 * nici între ele.
 */
export function dedupeSlugSync(text: string, taken: Set<string>): string {
  const slug = baseSlug(text);
  let candidate = slug;
  let i = 2;
  while (taken.has(candidate)) {
    candidate = `${slug}-${i++}`;
  }
  taken.add(candidate);
  return candidate;
}

/** Generează un slug unic pentru un model Prisma cu câmp `slug` (adaugă -2, -3... la coliziuni). */
export async function uniqueSlug(
  model: "product" | "article",
  text: string,
  ignoreId?: string
): Promise<string> {
  const slug = baseSlug(text) || "item";
  let candidate = slug;
  let i = 2;

  async function findBySlug(value: string) {
    if (model === "product") return prisma.product.findUnique({ where: { slug: value } });
    return prisma.article.findUnique({ where: { slug: value } });
  }

  while (true) {
    const existing = await findBySlug(candidate);
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${slug}-${i++}`;
  }
}
