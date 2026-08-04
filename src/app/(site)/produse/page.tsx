import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductImage } from "@/components/site/ProductImage";
import { ALL_GROUPS } from "@/lib/productCategory";

export const metadata: Metadata = {
  title: "Produse",
  description: "Produse farmaceutice și naturiste recomandate de Farmatic.ro.",
};

export const dynamic = "force-dynamic";

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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ grup?: string; categorie?: string; q?: string }>;
}) {
  const { grup, categorie, q } = await searchParams;
  const query = q?.trim();

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
    </div>
  );
}
