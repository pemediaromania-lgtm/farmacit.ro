import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { prisma } from "@/lib/prisma";
import { ProductImage } from "@/components/site/ProductImage";

export const dynamic = "force-dynamic";

async function getArticle(slug: string) {
  return prisma.article.findUnique({
    where: { slug },
    include: { product: true },
  });
}

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
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article || article.status !== "published") notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      {article.coverImageUrl && (
        <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden mb-8 bg-brand-50">
          <Image src={article.coverImageUrl} alt={article.title} fill className="object-cover" priority />
        </div>
      )}

      <h1 className="text-3xl sm:text-4xl font-bold text-brand-900 mb-6">{article.title}</h1>

      <div className="prose-farmatic text-brand-950">
        <ReactMarkdown>{article.content}</ReactMarkdown>
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
    </article>
  );
}
