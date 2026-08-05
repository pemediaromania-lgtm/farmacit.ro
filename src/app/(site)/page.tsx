import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ProductImage } from "@/components/site/ProductImage";
import { categoryImagePublicPath, categoryImageSlug } from "@/lib/productCategory";

export const dynamic = "force-dynamic";

async function categoryImageIfExists(name: string): Promise<string | null> {
  const filePath = path.join(process.cwd(), "public", "uploads", "categories", `${categoryImageSlug(name)}.png`);
  try {
    await fs.access(filePath);
    return categoryImagePublicPath(name);
  } catch {
    return null;
  }
}

// Grupurile prezentate în "Produse recomandate" de pe homepage — doar cele aliniate
// cu tema farmaceutic/naturist/suplimente a site-ului. "Vaping" există ca secțiune de
// catalog proprie, dar nu se amestecă în recomandările de pe prima pagină, ca mesajul
// (și relevanța tematică pentru SEO) să rămână coerent. "Diverse" e fallback-ul
// neclasificat, la fel de puțin relevant de evidențiat aici.
const FEATURED_GROUPS = [
  "Suplimente și sănătate naturistă",
  "Îngrijire personală și frumusețe",
  "Igienă",
  "Mama și copilul",
  "Sănătate și parafarmaceutice",
];

const PRODUCTS_PER_FEATURED_GROUP = 3;

export default async function HomePage() {
  const [articles, featuredByGroup, groupCounts] = await Promise.all([
    prisma.article.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      include: { product: true },
    }),
    Promise.all(
      FEATURED_GROUPS.map((group) =>
        prisma.product.findMany({
          where: { isActive: true, categoryGroup: group },
          orderBy: { createdAt: "desc" },
          take: PRODUCTS_PER_FEATURED_GROUP,
        })
      )
    ),
    prisma.product.groupBy({
      by: ["categoryGroup"],
      where: { isActive: true, categoryGroup: { not: null } },
      _count: { _all: true },
    }),
  ]);

  // Interclasez grupurile (3 din primul, 3 din al doilea, ...) în loc să le pun în
  // bloc, ca diversitatea de categorii să fie vizibilă chiar în primul rând de produse.
  const products: (typeof featuredByGroup)[number] = [];
  for (let i = 0; i < PRODUCTS_PER_FEATURED_GROUP; i++) {
    for (const group of featuredByGroup) {
      if (group[i]) products.push(group[i]);
    }
  }

  // "Diverse" e grupul-fallback (produse neîncadrate de clasificator) — îl afișăm
  // ultimul, indiferent de câte produse are, ca să nu domine carusel-ul.
  const sortedGroups = groupCounts
    .map((g) => ({ name: g.categoryGroup as string, count: g._count._all }))
    .sort((a, b) => (a.name === "Diverse" ? 1 : b.name === "Diverse" ? -1 : b.count - a.count));

  const groups = await Promise.all(
    sortedGroups.map(async (g) => ({ ...g, imageUrl: await categoryImageIfExists(g.name) }))
  );

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 text-center">
          <span className="inline-block rounded-full bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1 mb-4">
            Sănătate • Natură • Încredere
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-brand-900 tracking-tight">
            Bine ai venit pe Farmatic.ro
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-brand-800/80">
            Articole clare, pozitive și de încredere despre produse farmaceutice și naturiste —
            ca să alegi mereu ce e mai bine pentru tine și familia ta.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/blog"
              className="rounded-full bg-brand-600 px-6 py-3 text-white font-medium hover:bg-brand-700 transition-colors"
            >
              Citește blogul
            </Link>
            <Link
              href="/produse"
              className="rounded-full border border-brand-300 px-6 py-3 text-brand-700 font-medium hover:bg-brand-50 transition-colors"
            >
              Vezi produse
            </Link>
          </div>
        </div>
      </section>

      {groups.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-brand-900 mb-6">Categorii</h2>
          </div>
          {/* Mobil: carusel cu scroll orizontal, edge-to-edge. Desktop (sm+): grid,
              încadrat la fel ca restul secțiunilor (mx-auto max-w-5xl), nu full-bleed. */}
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 pb-2 [scrollbar-width:thin] sm:mx-auto sm:max-w-5xl sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:overflow-visible sm:snap-none sm:pb-0">
            {groups.map((group) => (
              <Link
                key={group.name}
                href={`/produse?grup=${encodeURIComponent(group.name)}`}
                className="group shrink-0 snap-start w-48 sm:w-auto sm:shrink rounded-2xl border border-brand-100 bg-white overflow-hidden hover:shadow-lg hover:border-brand-200 transition-all"
              >
                {group.imageUrl && (
                  <div className="relative h-28 w-full bg-brand-50">
                    <Image
                      src={group.imageUrl}
                      alt={group.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <div className="p-4">
                  <p className="font-semibold text-brand-900 text-sm leading-snug">{group.name}</p>
                  <p className="mt-1 text-xs text-brand-800/60">{group.count} produse</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-bold text-brand-900 mb-2">
          Produse farmaceutice, naturiste și suplimente alimentare, într-un singur loc
        </h2>
        <p className="text-brand-800/80 leading-relaxed max-w-3xl">
          Farmatic.ro adună într-un singur catalog produse de la farmacii și magazine partenere de
          încredere — ca să nu mai cauți separat prin zeci de site-uri când vrei să compari prețuri
          sau să afli ce anume ți se potrivește.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="font-semibold text-brand-900 mb-2">Produse farmaceutice</h3>
            <p className="text-sm text-brand-800/75 leading-relaxed">
              De la îngrijirea rănilor la igienă orală și dispozitive medicale de uz casnic, găsești
              produse farmaceutice explicate pe înțelesul tuturor — fără jargon medical inutil, doar
              informația de care ai nevoie ca să alegi corect.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-brand-900 mb-2">Produse naturiste</h3>
            <p className="text-sm text-brand-800/75 leading-relaxed">
              Remedii naturiste verificate — de la miere de Manuka autentică, cu certificare MGO/UMF,
              până la plante și ceaiuri tradiționale — pentru cei care preferă o abordare naturală a
              sănătății zilnice, fără compromisuri la calitate.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-brand-900 mb-2">Suplimente alimentare</h3>
            <p className="text-sm text-brand-800/75 leading-relaxed">
              Vitamine, minerale, probiotice și suplimente alimentare pentru imunitate, energie sau
              recuperare — de la branduri cunoscute, cu descrieri clare ale compoziției și modului de
              administrare, ca să faci o alegere informată.
            </p>
          </div>
        </div>
      </section>

      {articles.length > 0 && (
        <section className="bg-brand-50/60">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
            <h2 className="text-2xl font-bold text-brand-900 mb-6">Articole recente</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/blog/${article.slug}`}
                  className="group rounded-2xl border border-brand-100 overflow-hidden hover:shadow-lg transition-shadow bg-white"
                >
                  {article.coverImageUrl && (
                    <div className="relative h-40 w-full bg-brand-50">
                      <Image
                        src={article.coverImageUrl}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-brand-900 line-clamp-2">{article.title}</h3>
                    {article.excerpt && (
                      <p className="mt-2 text-sm text-brand-800/70 line-clamp-2">{article.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
            <h2 className="text-2xl font-bold text-brand-900 mb-6">Produse recomandate</h2>
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
                    <h3 className="font-medium text-brand-900 text-sm line-clamp-2">{product.name}</h3>
                    {product.price != null && (
                      <p className="mt-2 font-semibold text-brand-700">
                        {product.price.toFixed(2)} {product.currency}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
