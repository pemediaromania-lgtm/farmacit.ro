import { prisma } from "@/lib/prisma";
import { storeName } from "@/lib/prices/format";

/**
 * Comparația de preț de pe pagina produsului (Paul, 2026-11-19): același produs la alți parteneri 2Performant din feed-urile
 * noastre — după codul EAN/GTIN sau după nume identic — iar unde nu există, produsele cele mai asemănătoare din aceeași
 * categorie, de la alte magazine. Doar parteneri 2Performant: fiecare click spre ei aduce comision.
 * Același fișier pe toate site-urile de afiliere.
 */

export interface ComparedOffer {
  slug: string;
  name: string;
  price: number;
  oldPrice: number | null;
  currency: string | null;
  store: string;
  imageUrl: string | null;
  /** Cum l-am găsit: același cod EAN (sigur același produs) sau doar același nume (poate fi altă ediție/variantă). */
  match?: "ean" | "name";
}

export interface PriceComparison {
  /** Același produs la alte magazine (cel mai ieftin pe fiecare magazin), crescător după preț. */
  same: ComparedOffer[];
  /** Produse asemănătoare la alte magazine — doar când nu găsim același produs. */
  similar: ComparedOffer[];
}

interface SourceProduct {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  merchant: string | null;
  category: string | null;
  brand: string | null;
  gtin: string | null;
}

const select = { id: true, slug: true, name: true, price: true, oldPrice: true, currency: true, merchant: true, imageUrl: true, brand: true, gtin: true } as const;

const STOPWORDS = new Set(["pentru", "care", "este", "sunt", "prin", "fara", "foarte", "set", "pachet", "buc", "bucati", "culoare", "model", "nou", "noua"]);

function words(name: string): string[] {
  return [
    ...new Set(
      name
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    ),
  ];
}

/** Variantele unui cod EAN: cu și fără zerourile din față (UPC-12 vs EAN-13). */
function gtinVariants(gtin: string | null): string[] {
  const digits = (gtin ?? "").replace(/\D/g, "");
  if (digits.length < 8 || /^0+$/.test(digits)) return [];
  const bare = digits.replace(/^0+/, "");
  return [...new Set([digits, bare, bare.padStart(13, "0"), bare.padStart(14, "0")])];
}

function toOffer(p: { slug: string; name: string; price: number | null; oldPrice: number | null; currency: string | null; merchant: string | null; imageUrl: string | null }): ComparedOffer {
  return { slug: p.slug, name: p.name, price: p.price ?? 0, oldPrice: p.oldPrice, currency: p.currency, store: storeName(p.merchant), imageUrl: p.imageUrl };
}

const TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHED = 3000;
const cache = new Map<string, { at: number; data: PriceComparison }>();

export async function getPriceComparison(product: SourceProduct): Promise<PriceComparison> {
  const key = `${product.id}:${product.price ?? ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const otherStores = { isActive: true, price: { gt: 0 }, id: { not: product.id }, ...(product.merchant ? { NOT: { merchant: product.merchant } } : {}) };
  const gtins = gtinVariants(product.gtin);
  const sameRows = await prisma.product.findMany({
    where: {
      ...otherStores,
      OR: [...(gtins.length > 0 ? [{ gtin: { in: gtins } }] : []), { name: { equals: product.name, mode: "insensitive" as const } }],
    },
    select,
    orderBy: { price: "asc" },
    take: 40,
  });
  // Câte o ofertă pe magazin: cea mai ieftină.
  const seenStores = new Set<string>();
  const same = sameRows
    .map((r) => ({ ...toOffer(r), match: gtinVariants(r.gtin).some((g) => gtins.includes(g)) ? ("ean" as const) : ("name" as const) }))
    .filter((o) => (seenStores.has(o.store) ? false : (seenStores.add(o.store), true)))
    .slice(0, 6);

  let similar: ComparedOffer[] = [];
  if (same.length === 0 && product.category && product.price) {
    const sourceWords = words(product.name);
    const searchWords = [...sourceWords].sort((a, b) => b.length - a.length).slice(0, 5);
    const candidates = await prisma.product.findMany({
      where: {
        ...otherStores,
        category: product.category,
        price: { gte: product.price * 0.5, lte: product.price * 2 },
        ...(searchWords.length > 0 ? { OR: searchWords.map((w) => ({ name: { contains: w, mode: "insensitive" as const } })) } : {}),
      },
      select,
      take: 200,
    });
    const source = new Set(sourceWords);
    const scored = candidates
      .map((c) => {
        const shared = words(c.name).filter((w) => source.has(w)).length;
        const nameScore = source.size > 0 ? shared / source.size : 0;
        const sameBrand = Boolean(product.brand && c.brand && product.brand.toLowerCase() === c.brand.toLowerCase());
        const priceScore = 1 - Math.min(1, Math.abs((c.price ?? 0) - product.price!) / product.price!);
        return { c, shared, score: nameScore * 3 + (sameBrand ? 1 : 0) + priceScore * 0.5 };
      })
      .filter((s) => s.shared >= 2 || (s.shared >= 1 && source.size <= 3))
      .sort((a, b) => b.score - a.score);
    // Cele mai asemănătoare 4, cel mult 2 de la același magazin.
    const perStore = new Map<string, number>();
    similar = scored
      .map((s) => toOffer(s.c))
      .filter((o) => {
        const count = perStore.get(o.store) ?? 0;
        perStore.set(o.store, count + 1);
        return count < 2;
      })
      .slice(0, 4);
  }

  const data = { same, similar };
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), data });
  return data;
}

/** JSON-LD pentru Google: cu oferte la mai multe magazine, intervalul de preț (AggregateOffer), ca la site-urile de comparare. */
export function aggregateOfferJsonLd(
  baseUrl: string,
  product: { slug: string; price: number | null; currency: string | null; merchant: string | null },
  same: ComparedOffer[]
) {
  if (same.length === 0 || product.price == null) return null;
  const all = [{ slug: product.slug, price: product.price, store: storeName(product.merchant) }, ...same];
  const prices = all.map((o) => o.price);
  return {
    "@type": "AggregateOffer",
    priceCurrency: product.currency ?? "RON",
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    offerCount: all.length,
    offers: all.map((o) => ({
      "@type": "Offer",
      url: `${baseUrl}/produse/${o.slug}`,
      price: o.price,
      priceCurrency: product.currency ?? "RON",
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: o.store },
    })),
  };
}
