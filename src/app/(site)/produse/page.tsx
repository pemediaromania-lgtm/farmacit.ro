import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductImage } from "@/components/site/ProductImage";
import { ALL_GROUPS } from "@/lib/productCategory";
import { parseFaqJson } from "@/lib/faq";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Păstrează termenul de căutare curent când se schimbă filtrul de categorie, ca
// să nu se piardă căutarea la un click pe o pastilă de grup/subcategorie.
function buildHref(params: { grup?: string; categorie?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.grup) search.set("grup", params.grup);
  if (params.categorie) search.set("categorie", params.categorie);
  if (params.q) search.set("q", params.q);
  const qs = search.toString();
  return qs ? `/produse?${qs}` : "/produse";
}

// Canonical NU include `q` (căutarea liberă nu trebuie indexată ca pagină proprie).
// Dacă e setată `categorie`, `grup` e omis din canonical — categoria identifică
// pagina complet de una singură, iar linkurile interne (pastilele de subcategorie)
// trimit mereu cu grup+categorie împreună; fără normalizarea asta am avea două
// URL-uri canonice diferite pentru exact același conținut (grup+categorie vs.
// doar categorie, cum apare și în sitemap.ts).
function buildCanonical(params: { grup?: string; categorie?: string }) {
  const search = new URLSearchParams();
  if (params.categorie) search.set("categorie", params.categorie);
  else if (params.grup) search.set("grup", params.grup);
  const qs = search.toString();
  return qs ? `/produse?${qs}` : "/produse";
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
  searchParams: Promise<{ grup?: string; categorie?: string }>;
}): Promise<Metadata> {
  const { grup, categorie } = await searchParams;
  const categoryContent = await getCategoryContent(grup, categorie);

  const title = categoryContent?.metaTitle ?? categorie ?? grup ?? "Produse";
  const description =
    categoryContent?.description.slice(0, 160) ??
    (categorie
      ? `Produse din categoria ${categorie} — farmaceutice, naturiste și suplimente, la Farmatic.ro.`
      : grup
        ? `${grup}: produse recomandate de Farmatic.ro.`
        : "Produse farmaceutice și naturiste recomandate de Farmatic.ro.");
  const canonical = buildCanonical({ grup, categorie });

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: `${baseUrl}${canonical}`, type: "website" },
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ grup?: string; categorie?: string; q?: string }>;
}) {
  const { grup, categorie, q } = await searchParams;
  const query = q?.trim();
  const categoryContent = await getCategoryContent(grup, categorie);
  const faq = parseFaqJson(categoryContent?.faq ?? null);

  // O subcategorie selectată implică grupul ei — dacă vine direct un link vechi
  // cu doar `categorie` (ex: din pagina de produs), nu mai cerem și `grup`.
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(categorie ? { category: categorie } : grup ? { categoryGroup: grup } : {}),
    ...(query ? { OR: [{ name: { contains: query } }, { brand: { contains: query } }] } : {}),
  };

  const [products, subcategories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    grup
      ? prisma.product.findMany({
          where: { isActive: true, categoryGroup: grup, category: { not: null } },
          distinct: ["category"],
          select: { category: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-brand-900 mb-2">Produse</h1>
      <p className="text-brand-800/70 mb-6">Selecție de produse farmaceutice și naturiste, prin partenerii noștri.</p>

      <form action="/produse" method="get" className="mb-6 max-w-md">
        {grup && <input type="hidden" name="grup" value={grup} />}
        {categorie && <input type="hidden" name="categorie" value={categorie} />}
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
          href={buildHref({ q: query })}
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
            href={buildHref({ grup: groupName, q: query })}
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
            href={buildHref({ grup, q: query })}
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
                  href={buildHref({ grup, categorie: c.category, q: query })}
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

      {query && (
        <p className="text-sm text-brand-800/70 mb-4">
          {products.length} {products.length === 1 ? "rezultat" : "rezultate"} pentru „{query}”
        </p>
      )}

      {products.length === 0 ? (
        <p className="text-brand-800/70">
          {query ? `Niciun produs găsit pentru „${query}”.` : "Nu există încă produse în această categorie."}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/produse/${product.slug}`}
              className="group rounded-2xl border border-brand-100 overflow-hidden hover:shadow-lg transition-shadow bg-white"
            >
              <div className="relative h-48 sm:h-40 lg:h-32 w-full bg-white flex items-center justify-center overflow-hidden">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain p-4 group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-4">
                <h2 className="font-medium text-brand-900 text-sm line-clamp-2">{product.name}</h2>
                {product.price != null && (
                  <p className="mt-2 font-semibold text-brand-700">
                    {product.price.toFixed(2)} {product.currency}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!query && categoryContent && (
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
