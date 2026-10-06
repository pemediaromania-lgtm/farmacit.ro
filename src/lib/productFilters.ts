import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Etichetele și intervalele de preț specifice site-ului — restul modulului e identic
// pe farmatic/libratic/intimatic/jucatic.
export const FILTER_LABELS = { brand: "Brand", merchant: "Magazin" };
export const PRICE_PRESETS: { min?: number; max?: number }[] = [
  { max: 25 },
  { min: 25, max: 50 },
  { min: 50, max: 100 },
  { min: 100, max: 200 },
  { min: 200 },
];

export const SORT_OPTIONS = [
  { value: "noi", label: "Cele mai noi" },
  { value: "pret-asc", label: "Preț crescător" },
  { value: "pret-desc", label: "Preț descrescător" },
  { value: "populare", label: "Cele mai populare" },
  { value: "nume", label: "Nume (A–Z)" },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
export const DEFAULT_SORT: SortValue = "noi";

/** Câte branduri/magazine distincte aducem pentru lista de filtre (cele cu cele mai multe produse). */
const FACET_LIMIT = 150;
/** Plafon pentru valorile multiple din URL — un link fabricat cu sute de branduri nu ajunge în query. */
const MAX_SELECTED = 30;

export type ProductFilters = {
  grup?: string;
  categorie?: string;
  q?: string;
  pretMin?: number;
  pretMax?: number;
  branduri: string[];
  magazine: string[];
  reducere: boolean;
  sortare: SortValue;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

function many(value: string | string[] | undefined): string[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const cleaned = list.map((v) => v.trim()).filter((v) => v && v.length <= 120);
  return [...new Set(cleaned)].slice(0, MAX_SELECTED);
}

function price(value: string | string[] | undefined): number | undefined {
  const raw = first(value)?.replace(",", ".");
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseProductFilters(params: RawSearchParams): ProductFilters {
  let pretMin = price(params.pret_min);
  let pretMax = price(params.pret_max);
  if (pretMin != null && pretMax != null && pretMin > pretMax) [pretMin, pretMax] = [pretMax, pretMin];
  const sortare = SORT_OPTIONS.find((o) => o.value === first(params.sortare))?.value ?? DEFAULT_SORT;
  return {
    grup: first(params.grup),
    categorie: first(params.categorie),
    q: first(params.q),
    pretMin,
    pretMax,
    branduri: many(params.brand),
    magazine: many(params.magazin),
    reducere: first(params.reducere) === "1",
    sortare,
    page: Math.max(1, Math.floor(Number(first(params.page))) || 1),
  };
}

/** Filtrele alese de vizitator peste categorie/căutare — paginile cu ele nu se indexează. */
export function hasRefinements(f: ProductFilters): boolean {
  return (
    f.pretMin != null || f.pretMax != null || f.branduri.length > 0 || f.magazine.length > 0 || f.reducere || f.sortare !== DEFAULT_SORT
  );
}

/** Numele magazinului fără protocol, „www.” și slash final — feed-urile îl trimit în forme diferite („brainmarket.ro/”). */
export function merchantLabel(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
}

/** Toate formele sub care poate apărea în baza de date un magazin afișat ca `label`. */
function merchantVariants(labels: string[]): string[] {
  return labels.flatMap((l) => [l, `${l}/`, `www.${l}`, `www.${l}/`, `https://${l}`, `https://${l}/`, `https://www.${l}`, `https://www.${l}/`]);
}

type WhereOptions = { brand?: boolean; merchant?: boolean; price?: boolean; discount?: boolean };

/**
 * Condiția Prisma pentru filtrele curente. Fiecare fațetă își numără opțiunile fără propriul
 * filtru (ex. lista de branduri ignoră brandurile bifate), ca vizitatorul să poată bifa mai multe.
 */
export function productWhere(f: ProductFilters, include: WhereOptions = {}): Prisma.ProductWhereInput {
  const { brand = true, merchant = true, price = true, discount = true } = include;
  return {
    isActive: true,
    // O subcategorie selectată implică grupul ei — dacă vine direct un link vechi
    // cu doar `categorie` (ex: din pagina de produs), nu mai cerem și `grup`.
    ...(f.categorie ? { category: f.categorie } : f.grup ? { categoryGroup: f.grup } : {}),
    ...(f.q
      ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { brand: { contains: f.q, mode: "insensitive" } }] }
      : {}),
    ...(price && (f.pretMin != null || f.pretMax != null)
      ? { price: { ...(f.pretMin != null ? { gte: f.pretMin } : {}), ...(f.pretMax != null ? { lte: f.pretMax } : {}) } }
      : {}),
    ...(brand && f.branduri.length > 0 ? { brand: { in: f.branduri, mode: "insensitive" } } : {}),
    ...(merchant && f.magazine.length > 0 ? { merchant: { in: merchantVariants(f.magazine), mode: "insensitive" } } : {}),
    ...(discount && f.reducere ? { oldPrice: { gt: prisma.product.fields.price } } : {}),
  };
}

export function productOrderBy(sortare: SortValue): Prisma.ProductOrderByWithRelationInput[] {
  // `id` ca tiebreaker: multe produse importate în același sync au createdAt / preț
  // identic, iar Postgres nu garantează o ordine stabilă între query-uri LIMIT/OFFSET
  // separate doar pe o coloană cu valori egale — fără tiebreaker, aceleași produse
  // pot apărea pe mai multe pagini, iar altele pe nicio pagină.
  switch (sortare) {
    case "pret-asc":
      return [{ price: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "pret-desc":
      return [{ price: { sort: "desc", nulls: "last" } }, { id: "asc" }];
    case "populare":
      return [{ clickCount: "desc" }, { createdAt: "desc" }, { id: "asc" }];
    case "nume":
      return [{ name: "asc" }, { id: "asc" }];
    default:
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}

export type FacetOption = { value: string; count: number };

/** Unește valorile care diferă doar prin litere mari/mici (ex. „INTT” și „Intt”), păstrând forma cea mai des întâlnită. */
function mergeOptions(rows: { value: string; count: number }[]): FacetOption[] {
  const merged = new Map<string, { value: string; count: number; best: number }>();
  for (const row of rows) {
    const key = row.value.toLocaleLowerCase("ro");
    const entry = merged.get(key);
    if (!entry) merged.set(key, { value: row.value, count: row.count, best: row.count });
    else {
      entry.count += row.count;
      if (row.count > entry.best) Object.assign(entry, { value: row.value, best: row.count });
    }
  }
  return [...merged.values()].map(({ value, count }) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "ro"));
}

export type ProductFacets = {
  brands: FacetOption[];
  merchants: FacetOption[];
  discountCount: number;
  priceMin: number | null;
  priceMax: number | null;
};

export async function getProductFacets(f: ProductFilters): Promise<ProductFacets> {
  const [brandRows, merchantRows, discountCount, priceRange] = await Promise.all([
    prisma.product.groupBy({
      by: ["brand"],
      where: { AND: [productWhere(f, { brand: false }), { brand: { not: null } }, { brand: { not: "" } }] },
      _count: { _all: true },
      orderBy: { _count: { brand: "desc" } },
      take: FACET_LIMIT,
    }),
    prisma.product.groupBy({
      by: ["merchant"],
      where: { AND: [productWhere(f, { merchant: false }), { merchant: { not: null } }, { merchant: { not: "" } }] },
      _count: { _all: true },
      orderBy: { _count: { merchant: "desc" } },
      take: FACET_LIMIT,
    }),
    prisma.product.count({ where: { AND: [productWhere(f, { discount: false }), { oldPrice: { gt: prisma.product.fields.price } }] } }),
    prisma.product.aggregate({ where: productWhere(f, { price: false }), _min: { price: true }, _max: { price: true } }),
  ]);
  return {
    brands: mergeOptions(brandRows.flatMap((r) => (r.brand?.trim() ? [{ value: r.brand.trim(), count: r._count._all }] : []))),
    merchants: mergeOptions(merchantRows.flatMap((r) => (r.merchant ? [{ value: merchantLabel(r.merchant), count: r._count._all }] : []))),
    discountCount,
    priceMin: priceRange._min.price,
    priceMax: priceRange._max.price,
  };
}

/**
 * URL-ul listei de produse pentru un set de filtre. Parametrii goi și valorile implicite
 * (sortarea „noi”, pagina 1) nu apar, ca un link către pagina 1 să fie identic cu cel
 * „curat” — altfel am avea două URL-uri pentru același conținut.
 */
export function productsHref(f: Partial<ProductFilters>): string {
  const search = new URLSearchParams();
  if (f.grup) search.set("grup", f.grup);
  if (f.categorie) search.set("categorie", f.categorie);
  if (f.q) search.set("q", f.q);
  if (f.pretMin != null) search.set("pret_min", String(f.pretMin));
  if (f.pretMax != null) search.set("pret_max", String(f.pretMax));
  for (const b of f.branduri ?? []) search.append("brand", b);
  for (const m of f.magazine ?? []) search.append("magazin", m);
  if (f.reducere) search.set("reducere", "1");
  if (f.sortare && f.sortare !== DEFAULT_SORT) search.set("sortare", f.sortare);
  if (f.page && f.page > 1) search.set("page", String(f.page));
  const qs = search.toString();
  return qs ? `/produse?${qs}` : "/produse";
}

export function formatPrice(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function presetLabel(p: { min?: number; max?: number }): string {
  if (p.min == null && p.max != null) return `Sub ${p.max} lei`;
  if (p.min != null && p.max == null) return `Peste ${p.min} lei`;
  return `${p.min}–${p.max} lei`;
}
