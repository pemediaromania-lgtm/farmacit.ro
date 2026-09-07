import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductImage } from "@/components/site/ProductImage";
import { submitReviewAction } from "@/lib/actions/reviewActions";
import { descriptionHasHtml, sanitizeProductDescription, stripHtmlToText } from "@/lib/productDescription";
import { parseFaqJson } from "@/lib/faq";

export const dynamic = "force-dynamic";

const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      articles: { where: { status: "published" }, take: 1 },
      reviews: { orderBy: { createdAt: "desc" } },
    },
  });
}

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Prețul apare explicit în snippet (când încape și nu e deja menționat în text) —
// o mare parte din interogările pe care apărem includ "pret", deci un snippet care
// răspunde direct la asta crește șansa de click față de o descriere generică.
function metaDescription(product: {
  description: string | null;
  name: string;
  brand: string | null;
  price: number | null;
  currency: string;
}) {
  const priceLine = product.price != null ? `Preț: ${product.price.toFixed(2)} ${product.currency}.` : "";

  if (!product.description) {
    const brandPart = product.brand ? ` de la ${product.brand}` : "";
    return `Cumpără ${product.name}${brandPart} online, cu livrare rapidă. ${priceLine}`.trim();
  }

  const text = stripHtmlToText(product.description);
  const withPrice = priceLine && !text.includes(product.currency) ? `${text} ${priceLine}` : text;
  if (withPrice.length <= 160) return withPrice;

  // Trunchiere pe limită de cuvânt, nu la mijlocul unuia — un snippet care se taie
  // frumos citește mai bine decât unul terminat abrupt.
  const truncated = text.slice(0, 155);
  const lastSpace = truncated.lastIndexOf(" ");
  const clean = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${clean.trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const title = product.brand ? `${product.name} – ${product.brand}` : product.name;
  const description = metaDescription(product);
  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/produse/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/produse/${product.slug}`,
      images: product.imageUrl ? [product.imageUrl] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product || !product.isActive) notFound();

  const article = product.articles[0];
  // FAQ-ul e generat o singură dată, odată cu articolul AI al produsului — apare
  // pe pagina produsului treptat, produs cu produs, în ritmul generării articolelor.
  const faq = article ? parseFaqJson(article.faq) : [];
  const reviews = product.reviews;
  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  // Date structurate schema.org — folosesc toate atributele din feed disponibile
  // (gtin, brand, categorie, preț vechi, recenzii) pentru rich snippets în Google.
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ? stripHtmlToText(product.description) : undefined,
    image: product.imageUrl ?? undefined,
    sku: product.externalId ?? undefined,
    gtin: product.gtin ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.category ?? undefined,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/produse/${product.slug}`,
      priceCurrency: product.currency,
      price: product.price ?? undefined,
      availability: "https://schema.org/InStock",
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
    ...(averageRating != null && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: averageRating.toFixed(1),
        reviewCount: reviews.length,
      },
    }),
  };

  // Firul de breadcrumb (Acasă > grup > categorie > produs) — apare direct în
  // rezultatele Google în loc de URL brut.
  const breadcrumbItems = [
    { name: "Acasă", url: baseUrl },
    product.categoryGroup && {
      name: product.categoryGroup,
      url: `${baseUrl}/produse?grup=${encodeURIComponent(product.categoryGroup)}`,
    },
    product.category && {
      name: product.category,
      url: `${baseUrl}/produse?${
        product.categoryGroup ? `grup=${encodeURIComponent(product.categoryGroup)}&` : ""
      }categorie=${encodeURIComponent(product.category)}`,
    },
    { name: product.name, url: `${baseUrl}/produse/${product.slug}` },
  ].filter((item): item is { name: string; url: string } => Boolean(item));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  const faqJsonLd =
    faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-brand-800/60 flex flex-wrap items-center gap-1">
        {breadcrumbItems.map((item, i) => (
          <span key={item.url} className="flex items-center gap-1">
            {i > 0 && <span className="text-brand-300">/</span>}
            {i === breadcrumbItems.length - 1 ? (
              <span className="text-brand-800/80 line-clamp-1">{item.name}</span>
            ) : (
              <Link href={item.url.replace(baseUrl, "") || "/"} className="hover:text-brand-700 hover:underline">
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="grid gap-8 sm:grid-cols-2 items-start">
        <div className="relative aspect-square w-full rounded-2xl bg-brand-50 overflow-hidden">
          <ProductImage src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-8" />
        </div>
        <div>
          {product.category && (
            <Link
              href={`/produse?${
                product.categoryGroup ? `grup=${encodeURIComponent(product.categoryGroup)}&` : ""
              }categorie=${encodeURIComponent(product.category)}`}
              className="text-xs font-medium text-brand-500 hover:text-brand-700 hover:underline"
            >
              {product.category}
            </Link>
          )}
          {product.brand && <p className="text-sm text-brand-600 font-medium mt-1">{product.brand}</p>}
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-900 mt-1">{product.name}</h1>

          {averageRating != null && (
            <p className="mt-2 text-sm text-brand-700">
              <span className="text-amber-500">{stars(Math.round(averageRating))}</span>{" "}
              {averageRating.toFixed(1)} din 5 ({reviews.length} {reviews.length === 1 ? "recenzie" : "recenzii"})
            </p>
          )}

          {product.price != null && (
            <p className="mt-4 text-2xl font-bold text-brand-700">
              {product.price.toFixed(2)} {product.currency}
              {product.oldPrice != null && product.oldPrice > product.price && (
                <span className="ml-3 text-base font-normal text-brand-400 line-through">
                  {product.oldPrice.toFixed(2)} {product.currency}
                </span>
              )}
            </p>
          )}

          {product.affiliateUrl && (
            <Link
              href={`/go/${product.slug}`}
              className="mt-6 inline-block rounded-full bg-brand-600 px-8 py-3 text-white font-medium hover:bg-brand-700 transition-colors"
            >
              Cumpără acum
            </Link>
          )}
          {product.merchant && (
            <p className="mt-3 text-xs text-brand-700/70">Disponibil prin {product.merchant}</p>
          )}

          {article && (
            <p className="mt-6 text-sm">
              <Link href={`/blog/${article.slug}`} className="text-brand-600 underline hover:text-brand-800">
                Citește articolul despre acest produs →
              </Link>
            </p>
          )}
        </div>
      </div>

      {product.description && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-brand-900 mb-3">Descriere</h2>
          {descriptionHasHtml(product.description) ? (
            <div
              className="prose-farmatic text-brand-800/80"
              dangerouslySetInnerHTML={{ __html: sanitizeProductDescription(product.description) }}
            />
          ) : (
            <p className="text-brand-800/80 leading-relaxed whitespace-pre-line">{product.description}</p>
          )}
        </section>
      )}

      {(product.brand || product.category || product.gtin) && (
        <section className="mt-8 rounded-2xl bg-white border border-brand-100 p-5">
          <h2 className="text-sm font-bold text-brand-900 mb-3">Detalii produs</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            {product.brand && (
              <div>
                <dt className="text-brand-800/50">Brand</dt>
                <dd className="text-brand-900 font-medium">{product.brand}</dd>
              </div>
            )}
            {product.category && (
              <div>
                <dt className="text-brand-800/50">Categorie</dt>
                <dd className="text-brand-900 font-medium">{product.category}</dd>
              </div>
            )}
            {product.gtin && (
              <div>
                <dt className="text-brand-800/50">Cod EAN/GTIN</dt>
                <dd className="text-brand-900 font-medium">{product.gtin}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {faq.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-brand-900 mb-4">Întrebări frecvente</h2>
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
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-bold text-brand-900 mb-5">
          Recenzii {reviews.length > 0 && `(${reviews.length})`}
        </h2>

        {reviews.length === 0 && (
          <p className="text-sm text-brand-800/60 mb-6">Niciun review încă — fii primul care lasă o recenzie.</p>
        )}

        <div className="space-y-4 mb-8">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl bg-white border border-brand-100 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-brand-900">{review.authorName}</p>
                <span className="text-amber-500 text-sm">{stars(review.rating)}</span>
              </div>
              <p className="mt-2 text-sm text-brand-800/80 leading-relaxed whitespace-pre-line">{review.content}</p>
              <p className="mt-2 text-xs text-brand-800/50">{review.createdAt.toLocaleDateString("ro-RO")}</p>
            </div>
          ))}
        </div>

        <form
          action={submitReviewAction.bind(null, product.id, product.slug)}
          className="relative rounded-2xl bg-white border border-brand-100 p-6 grid gap-4"
        >
          <h3 className="font-medium text-brand-900">Lasă o recenzie</h3>

          {/* Câmp anti-spam, ascuns vizual — un bot îl completează, un vizitator real nu-l vede */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden"
            aria-hidden="true"
          />

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div>
              <label className="block text-sm font-medium text-brand-900 mb-1">Nume</label>
              <input
                name="authorName"
                required
                maxLength={80}
                className="w-full rounded-lg border border-brand-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-900 mb-1">Notă</label>
              <select
                name="rating"
                defaultValue={5}
                className="w-full rounded-lg border border-brand-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {stars(value)} ({value})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-900 mb-1">Recenzia ta</label>
            <textarea
              name="content"
              required
              maxLength={2000}
              rows={4}
              className="w-full rounded-lg border border-brand-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <button
            type="submit"
            className="justify-self-start rounded-full bg-brand-600 text-white font-medium px-6 py-2.5 hover:bg-brand-700 transition-colors"
          >
            Trimite recenzia
          </button>
        </form>
      </section>
    </div>
  );
}
