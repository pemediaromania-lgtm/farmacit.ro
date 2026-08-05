import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { prisma } from "@/lib/prisma";
import { ProductImage } from "@/components/site/ProductImage";
import { extractToc } from "@/lib/articleToc";
import { submitArticleCommentAction } from "@/lib/actions/articleCommentActions";
import { parseFaqJson } from "@/lib/faq";

export const dynamic = "force-dynamic";

async function getArticle(slug: string) {
  return prisma.article.findUnique({
    where: { slug },
    include: {
      product: true,
      comments: { orderBy: { createdAt: "desc" } },
    },
  });
}

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt ?? undefined,
    alternates: { canonical: `${baseUrl}/blog/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      url: `${baseUrl}/blog/${article.slug}`,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
      type: "article",
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article || article.status !== "published") notFound();

  const toc = extractToc(article.content);
  const faq = parseFaqJson(article.faq);
  const comments = article.comments;

  const relatedProducts = article.product
    ? await prisma.product.findMany({
        where: {
          isActive: true,
          id: { not: article.product.id },
          OR: [
            article.product.category ? { category: article.product.category } : undefined,
            article.product.categoryGroup ? { categoryGroup: article.product.categoryGroup } : undefined,
          ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause)),
        },
        take: 4,
        orderBy: { clickCount: "desc" },
      })
    : [];

  // Contor partajat între headingurile randate — folosit ca să potrivim id-urile
  // generate aici cu cele din `toc` (aceeași ordine, deci același index → același id).
  let headingIndex = 0;
  const nextHeadingId = () => toc[headingIndex++]?.id;

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    datePublished: (article.publishedAt ?? article.createdAt).toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { "@type": "Organization", name: "farmatic.ro" },
    publisher: { "@type": "Organization", name: "farmatic.ro" },
    mainEntityOfPage: `${baseUrl}/blog/${article.slug}`,
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
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}

      {article.coverImageUrl && (
        <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden mb-8 bg-brand-50">
          <Image src={article.coverImageUrl} alt={article.title} fill className="object-cover" priority />
        </div>
      )}

      <h1 className="text-3xl sm:text-4xl font-bold text-brand-900 mb-6">{article.title}</h1>

      {toc.length > 0 && (
        <nav className="mb-8 rounded-2xl border border-brand-100 bg-brand-50/60 p-5" aria-label="Cuprins">
          <p className="text-sm font-bold text-brand-900 mb-2">Cuprins</p>
          <ol className="space-y-1 text-sm">
            {toc.map((entry) => (
              <li key={entry.id} className={entry.level === 3 ? "ml-4" : undefined}>
                <a href={`#${entry.id}`} className="text-brand-600 hover:text-brand-800 hover:underline">
                  {entry.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="prose-farmatic text-brand-950">
        <ReactMarkdown
          components={{
            h2: ({ children }) => <h2 id={nextHeadingId()}>{children}</h2>,
            h3: ({ children }) => <h3 id={nextHeadingId()}>{children}</h3>,
          }}
        >
          {article.content}
        </ReactMarkdown>
      </div>

      {article.product && (
        <div className="mt-10 rounded-2xl border border-brand-200 bg-brand-50 p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white p-2">
            <ProductImage src={article.product.imageUrl} alt={article.product.name} className="h-full w-full object-contain" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold text-brand-900">{article.product.name}</p>
            {article.product.price != null && (
              <p className="text-brand-700 font-medium">
                {article.product.price.toFixed(2)} {article.product.currency}
              </p>
            )}
          </div>
          {article.product.affiliateUrl && (
            <Link
              href={`/go/${article.product.slug}`}
              className="rounded-full bg-brand-600 px-6 py-3 text-white font-medium hover:bg-brand-700 transition-colors whitespace-nowrap"
            >
              Cumpără acum
            </Link>
          )}
        </div>
      )}

      {faq.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-brand-900 mb-4">Întrebări frecvente</h2>
          <div className="space-y-3">
            {faq.map((item) => (
              <details key={item.question} className="rounded-2xl border border-brand-100 bg-white p-4 group">
                <summary className="cursor-pointer font-medium text-brand-900 marker:content-none flex items-center justify-between gap-4">
                  {item.question}
                  <span className="text-brand-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-brand-800/80 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-brand-900 mb-4">Produse recomandate</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedProducts.map((product) => (
              <Link
                key={product.id}
                href={`/produse/${product.slug}`}
                className="rounded-2xl border border-brand-100 bg-white p-3 hover:border-brand-300 transition-colors"
              >
                <div className="aspect-square rounded-xl bg-brand-50 overflow-hidden mb-2">
                  <ProductImage src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-3" />
                </div>
                <p className="text-xs font-medium text-brand-900 line-clamp-2">{product.name}</p>
                {product.price != null && (
                  <p className="text-sm font-semibold text-brand-700 mt-1">
                    {product.price.toFixed(2)} {product.currency}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-bold text-brand-900 mb-5">
          Comentarii {comments.length > 0 && `(${comments.length})`}
        </h2>

        {comments.length === 0 && (
          <p className="text-sm text-brand-800/60 mb-6">Niciun comentariu încă — fii primul care lasă unul.</p>
        )}

        <div className="space-y-4 mb-8">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl bg-white border border-brand-100 p-4">
              <p className="font-medium text-brand-900">{comment.authorName}</p>
              <p className="mt-2 text-sm text-brand-800/80 leading-relaxed whitespace-pre-line">{comment.content}</p>
              <p className="mt-2 text-xs text-brand-800/50">{comment.createdAt.toLocaleDateString("ro-RO")}</p>
            </div>
          ))}
        </div>

        <form
          action={submitArticleCommentAction.bind(null, article.id, article.slug)}
          className="relative rounded-2xl bg-white border border-brand-100 p-6 grid gap-4"
        >
          <h3 className="font-medium text-brand-900">Lasă un comentariu</h3>

          {/* Câmp anti-spam, ascuns vizual — un bot îl completează, un vizitator real nu-l vede */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden"
            aria-hidden="true"
          />

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
            <label className="block text-sm font-medium text-brand-900 mb-1">Comentariul tău</label>
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
            Trimite comentariul
          </button>
        </form>
      </section>
    </article>
  );
}
