import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductImage } from "@/components/site/ProductImage";
import { ALL_GROUPS } from "@/lib/productCategory";
import { parseFaqJson } from "@/lib/faq";
import {
  getProductFacets,
  DEFAULT_SORT,
  hasRefinements,
  parseProductFilters,
  productOrderBy,
  productsHref,
  productWhere,
  type RawSearchParams,
} from "@/lib/productFilters";
import { ActiveFilterChips, ProductFiltersPanel, ProductSortSelect } from "@/components/site/ProductFilters";
import { ManukaPromoBanner } from "@/components/site/ManukaPromoBanner";

const MANUKA_CATEGORY = "Miere de Manuka";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Neschimbat față de comportamentul dinainte de paginare (era deja take: 60) — doar
// acum ce era tăiat silențios la 60 devine paginile 2, 3, ... în loc de a fi pur și
// simplu inaccesibil.
const PAGE_SIZE = 60;

// Canonical NU include `q` (căutarea liberă nu trebuie indexată ca pagină proprie).
// Dacă e setată `categorie`, `grup` e omis din canonical — categoria identifică
// pagina complet de una singură, iar linkurile interne (pastilele de subcategorie)
// trimit mereu cu grup+categorie împreună; fără normalizarea asta am avea două
// URL-uri canonice diferite pentru exact același conținut (grup+categorie vs.
// doar categorie, cum apare și în sitemap.ts).
//
// `page` INCLUS în canonical (auto-referențial pentru page > 1) — fiecare pagină
// arată produse diferite, deci fiecare merită indexată separat de Google, nu
// consolidată artificial pe pagina 1 (asta ar însemna ca produsele de pe paginile
// 2+ să nu mai apară niciodată în căutări).
function buildCanonical(params: { grup?: string; categorie?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.categorie) search.set("categorie", params.categorie);
  else if (params.grup) search.set("grup", params.grup);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `/produse?${qs}` : "/produse";
}

/** „1 produs”, „12 produse”, „32.929 de produse” — cu „de” după 20+ (ultimele două cifre 00 sau ≥ 20). */
function productCountLabel(n: number): string {
  if (n === 1) return "1 produs";
  const rest = n % 100;
  return `${n.toLocaleString("ro-RO")} ${n > 0 && (rest === 0 || rest >= 20) ? "de produse" : "produse"}`;
}

/** Prima, ultima, curenta ± 2, cu "…" pentru golurile dintre ele — o listă lungă de
 * pagini (ex: 40) nu trebuie afișată integral, doar vecinătatea utilă. */
function getPageWindow(current: number, total: number): (number | "…")[] {
  const pages = new Set<number>([1, total, current]);
  for (let d = 1; d <= 2; d++) {
    if (current - d >= 1) pages.add(current - d);
    if (current + d <= total) pages.add(current + d);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

// cache() dedupe query-ul între generateMetadata și componenta paginii (aceeași
// cerere HTTP) — altfel am interoga CategoryContent de două ori pentru nimic.
const getCategoryContentByCategory = cache((category: string) =>
  prisma.categoryContent.findFirst({ where: { category } })
);
const getCategoryContentByGroup = cache((categoryGroup: string) =>
  prisma.categoryContent.findUnique({ where: { categoryGroup_category: { categoryGroup, category: "" } } })
);

async function getCategoryContent(grup?: string, categorie?: string) {
  if (categorie) return getCategoryContentByCategory(categorie);
  if (grup) return getCategoryContentByGroup(grup);
  return null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const filters = parseProductFilters(await searchParams);
  const { grup, categorie, page } = filters;
  // Combinațiile de filtre/sortare nu se indexează (ar fi mii de pagini aproape identice);
  // canonical-ul lor trimite la lista categoriei.
  const refined = hasRefinements(filters);
  const categoryContent = await getCategoryContent(grup, categorie);

  const baseTitle = categoryContent?.metaTitle ?? categorie ?? grup ?? "Produse";
  // Titluri unice per pagină — altfel Google vede același <title> pe zeci de
  // pagini paginate ale aceleiași categorii, ceea ce le face să arate ca
  // duplicate content în loc de pagini distincte.
  const title = page > 1 ? `${baseTitle} — pagina ${page}` : baseTitle;
  const description =
    categoryContent?.description.slice(0, 160) ??
    (categorie
      ? `Produse din categoria ${categorie} — farmaceutice, naturiste și suplimente, la Farmatic.ro.`
      : grup
        ? `${grup}: produse recomandate de Farmatic.ro.`
        : "Produse farmaceutice și naturiste recomandate de Farmatic.ro.");
  const canonical = buildCanonical({ grup, categorie, page: refined ? 1 : page });

  return {
    title,
    description,
    alternates: { canonical },
    ...(refined ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: `${baseUrl}${canonical}`, type: "website" },
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseProductFilters(await searchParams);
  const { grup, categorie, q: query, page: requestedPage } = filters;
  const categoryContent = await getCategoryContent(grup, categorie);
  const faq = parseFaqJson(categoryContent?.faq ?? null);

  const where = productWhere(filters);

  const [totalCount, subcategories, facets] = await Promise.all([
    prisma.product.count({ where }),
    grup
      ? prisma.product.findMany({
          where: { isActive: true, categoryGroup: grup, category: { not: null } },
          distinct: ["category"],
          select: { category: true },
        })
      : Promise.resolve([]),
    getProductFacets(filters),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  // O pagină cerută dincolo de ultima (ex: link vechi salvat, sau catalogul s-a
  // micșorat) cade pe ultima pagină reală în loc de a afișa o listă goală.
  const page = Math.min(requestedPage, totalPages);

  const products = await prisma.product.findMany({
    where,
    orderBy: productOrderBy(filters.sortare),
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const carried = {
    q: query,
    sortare: filters.sortare,
    pretMin: filters.pretMin,
    pretMax: filters.pretMax,
    reducere: filters.reducere,
    magazine: filters.magazine,
  };
  const pageHref = (p: number) => productsHref({ ...filters, page: p });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-brand-900 mb-2">Produse</h1>
      <p className="text-brand-800/70 mb-6">Selecție de produse farmaceutice și naturiste, prin partenerii noștri.</p>

      <form action="/produse" method="get" className="mb-6 max-w-md">
        {grup && <input type="hidden" name="grup" value={grup} />}
        {categorie && <input type="hidden" name="categorie" value={categorie} />}
        {filters.sortare !== DEFAULT_SORT && <input type="hidden" name="sortare" value={filters.sortare} />}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Caută produse după nume sau brand..."
          className="w-full rounded-full border border-brand-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href={productsHref(carried)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium border ${
            !grup && !categorie
              ? "bg-brand-600 text-white border-brand-600"
              : "border-brand-200 text-brand-700 hover:bg-brand-50"
          }`}
        >
          Toate
        </Link>
        {ALL_GROUPS.map((groupName) => (
          <Link
            key={groupName}
            href={productsHref({ ...carried, grup: groupName })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border ${
              grup === groupName
                ? "bg-brand-600 text-white border-brand-600"
                : "border-brand-200 text-brand-700 hover:bg-brand-50"
            }`}
          >
            {groupName}
          </Link>
        ))}
      </div>

      {grup && subcategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href={productsHref({ ...carried, grup })}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              !categorie
                ? "bg-brand-100 text-brand-800 border-brand-200"
                : "border-brand-100 text-brand-700/70 hover:bg-brand-50"
            }`}
          >
            Toate din {grup}
          </Link>
          {subcategories.map(
            (c) =>
              c.category && (
                <Link
                  key={c.category}
                  href={productsHref({ ...carried, grup, categorie: c.category })}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${
                    categorie === c.category
                      ? "bg-brand-100 text-brand-800 border-brand-200"
                      : "border-brand-100 text-brand-700/70 hover:bg-brand-50"
                  }`}
                >
                  {c.category}
                </Link>
              )
          )}
        </div>
      )}

      {categorie === MANUKA_CATEGORY && (
        <div className="mb-6">
          <ManukaPromoBanner />
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <ProductFiltersPanel filters={filters} facets={facets} />

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-800/70">
              {totalCount === 0 ? "Niciun produs" : productCountLabel(totalCount)}
              {query && <> pentru „{query}”</>}
            </p>
            <ProductSortSelect sortare={filters.sortare} />
          </div>
          <ActiveFilterChips filters={filters} />

          {products.length === 0 ? (
            <p className="text-brand-800/70">
              {hasRefinements(filters)
                ? "Niciun produs nu se potrivește filtrelor alese."
                : query
                  ? `Niciun produs găsit pentru „${query}”.`
                  : "Nu există încă produse în această categorie."}
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/produse/${product.slug}`}
                  className="group rounded-2xl border border-brand-100 overflow-hidden hover:shadow-lg transition-shadow bg-white"
                >
                  <div className="relative h-48 sm:h-40 lg:h-32 w-full bg-white flex items-center justify-center overflow-hidden">
                    {product.price != null && product.oldPrice != null && product.oldPrice > product.price && (
                      <span className="absolute left-2 top-2 z-10 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                        -{Math.round((1 - product.price / product.oldPrice) * 100)}%
                      </span>
                    )}
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain p-4 group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-4">
                    {product.brand && (
                      <p className="mb-1 truncate text-xs font-medium text-brand-600">{product.brand}</p>
                    )}
                    <h2 className="font-medium text-brand-900 text-sm line-clamp-2">{product.name}</h2>
                    {product.price != null && (
                      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 font-semibold text-brand-700">
                        {product.price.toFixed(2)} {product.currency}
                        {product.oldPrice != null && product.oldPrice > product.price && (
                          <span className="text-xs font-normal text-brand-800/50 line-through">
                            {product.oldPrice.toFixed(2)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav aria-label="Paginare" className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={pageHref(page - 1)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium border border-brand-200 text-brand-700 hover:bg-brand-50"
                >
                  ‹ Anterioară
                </Link>
              )}
              {getPageWindow(page, totalPages).map((entry, i) =>
                entry === "…" ? (
                  <span key={`gap-${i}`} className="px-1 text-sm text-brand-800/40">
                    …
                  </span>
                ) : (
                  <Link
                    key={entry}
                    href={pageHref(entry)}
                    aria-current={entry === page ? "page" : undefined}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium border ${
                      entry === page
                        ? "bg-brand-600 text-white border-brand-600"
                        : "border-brand-200 text-brand-700 hover:bg-brand-50"
                    }`}
                  >
                    {entry}
                  </Link>
                )
              )}
              {page < totalPages && (
                <Link
                  href={pageHref(page + 1)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium border border-brand-200 text-brand-700 hover:bg-brand-50"
                >
                  Următoare ›
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>

      {!query && !hasRefinements(filters) && categoryContent && (
        <section className="mt-14">
          {faq.length > 0 && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faq.map((item) => ({
                    "@type": "Question",
                    name: item.question,
                    acceptedAnswer: { "@type": "Answer", text: item.answer },
                  })),
                }),
              }}
            />
          )}

          <div className="prose-farmatic text-brand-800/80 max-w-3xl">
            {categoryContent.description.split(/\n{2,}/).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          {faq.length > 0 && (
            <div className="mt-8 max-w-3xl">
              <h2 className="text-lg font-bold text-brand-900 mb-4">Întrebări frecvente</h2>
              <div className="space-y-3">
                {faq.map((item) => (
                  <details key={item.question} className="rounded-2xl border border-brand-100 bg-white p-4 group">
                    <summary className="cursor-pointer font-medium text-brand-900 marker:content-none flex items-center justify-between gap-4">
                      {item.question}
                      <span className="text-brand-400 group-open:rotate-45 transition-transform text-xl leading-none">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm text-brand-800/80 leading-relaxed">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
