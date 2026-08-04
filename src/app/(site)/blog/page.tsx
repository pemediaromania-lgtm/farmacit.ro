import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Blog",
  description: "Articole despre produse farmaceutice și naturiste, scrise cu grijă pentru sănătatea ta.",
};

export const revalidate = 60;

export default async function BlogPage() {
  const articles = await prisma.article.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-brand-900 mb-2">Blog Farmatic</h1>
      <p className="text-brand-800/70 mb-8">Sfaturi și informații pozitive pentru o viață mai sănătoasă.</p>

      {articles.length === 0 ? (
        <p className="text-brand-800/70">Nu există încă articole publicate. Revino în curând!</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                <h2 className="font-semibold text-brand-900 line-clamp-2">{article.title}</h2>
                {article.excerpt && (
                  <p className="mt-2 text-sm text-brand-800/70 line-clamp-3">{article.excerpt}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
