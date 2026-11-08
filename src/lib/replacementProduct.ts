import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isInactiveMerchant } from "@/lib/inactiveMerchants";

/**
 * Înlocuitorul unui produs scos de pe site (program 2Performant inactiv, produs dispărut din feed):
 * cel mai asemănător produs activ. Vizitatorii și linkurile spre produsul vechi (Google, articole,
 * site-uri externe, /go/) ajung astfel tot la ceva ce se poate cumpăra, deci aduc în continuare click-uri.
 *
 * Asemănarea: cuvintele din nume (cât mai multe în comun), același brand, preț apropiat. Candidații vin
 * din aceeași categorie, apoi din grupul ei; la egalitate câștigă produsul cu mai multe click-uri.
 */
type SourceProduct = {
  id: string;
  name: string;
  brand: string | null;
  price: number | null;
  category: string | null;
  categoryGroup: string | null;
};

const replacementSelect = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  price: true,
  currency: true,
  imageUrl: true,
  merchant: true,
  affiliateUrl: true,
} satisfies Prisma.ProductSelect;

export type ReplacementProduct = Prisma.ProductGetPayload<{ select: typeof replacementSelect }>;

const STOPWORDS = new Set([
  "pentru", "care", "este", "sunt", "prin", "fara", "fără", "foarte", "dintre", "acest", "aceasta",
  "buc", "bucati", "bucăți", "set", "pachet", "culoare", "marime", "mărime", "model", "produs", "nou", "noua", "nouă",
]);

function nameWords(name: string): string[] {
  const words = name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
  return [...new Set(words)];
}

/** Fără diacritice, pentru comparat „vibrații” cu „vibratii”. */
const plain = (word: string) => word.normalize("NFD").replace(/\p{M}/gu, "");

function similarity(source: SourceProduct, sourceWords: Set<string>, candidate: ReplacementProduct): number {
  const candidateWords = new Set(nameWords(candidate.name).map(plain));
  let shared = 0;
  for (const word of sourceWords) if (candidateWords.has(word)) shared++;
  const nameScore = sourceWords.size > 0 ? shared / sourceWords.size : 0;
  const sameBrand =
    source.brand && candidate.brand && source.brand.trim().toLowerCase() === candidate.brand.trim().toLowerCase();
  const priceScore =
    source.price && candidate.price ? 1 - Math.min(1, Math.abs(candidate.price - source.price) / source.price) : 0;
  return nameScore * 3 + (sameBrand ? 1 : 0) + priceScore * 0.5;
}

export async function findReplacementProduct(source: SourceProduct): Promise<ReplacementProduct | null> {
  const words = nameWords(source.name);
  const sourceWords = new Set(words.map(plain));
  // Cuvintele cele mai lungi sunt de obicei cele mai specifice (model, material, autor) — ele aleg candidații.
  const searchWords = [...words].sort((a, b) => b.length - a.length).slice(0, 6);
  const scopes: Prisma.ProductWhereInput[] = [
    ...(source.category ? [{ category: source.category }] : []),
    ...(source.categoryGroup ? [{ categoryGroup: source.categoryGroup }] : []),
  ];

  for (const scope of scopes) {
    const base: Prisma.ProductWhereInput = { ...scope, isActive: true, affiliateUrl: { not: null }, id: { not: source.id } };
    const batches = await Promise.all([
      searchWords.length > 0
        ? prisma.product.findMany({
            where: { ...base, OR: searchWords.map((word) => ({ name: { contains: word, mode: "insensitive" as const } })) },
            select: replacementSelect,
            orderBy: { clickCount: "desc" },
            take: 200,
          })
        : [],
      source.brand
        ? prisma.product.findMany({
            where: { ...base, brand: { equals: source.brand, mode: "insensitive" } },
            select: replacementSelect,
            orderBy: { clickCount: "desc" },
            take: 100,
          })
        : [],
      // Mereu măcar cele mai căutate produse din categorie, ca să existe un înlocuitor.
      prisma.product.findMany({ where: base, select: replacementSelect, orderBy: { clickCount: "desc" }, take: 30 }),
    ]);

    let best: ReplacementProduct | null = null;
    let bestScore = -1;
    const seen = new Set<string>();
    for (const candidate of batches.flat()) {
      if (seen.has(candidate.id) || isInactiveMerchant(candidate.merchant)) continue;
      seen.add(candidate.id);
      const score = similarity(source, sourceWords, candidate);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    if (best) return best;
  }
  return null;
}

/** Lista de produse similare (categoria produsului), când nu există un înlocuitor anume. */
export function similarListingHref(product: { category: string | null; categoryGroup: string | null }): string {
  const params = new URLSearchParams();
  if (product.category) params.set("categorie", product.category);
  else if (product.categoryGroup) params.set("grup", product.categoryGroup);
  const query = params.toString();
  return query ? `/produse?${query}` : "/produse";
}

/** Unde ajunge vizitatorul unui produs scos de pe site: înlocuitorul sau, în lipsă, categoria lui. */
export async function replacementHref(product: SourceProduct): Promise<string> {
  const replacement = await findReplacementProduct(product);
  return replacement ? `/produse/${replacement.slug}` : similarListingHref(product);
}
