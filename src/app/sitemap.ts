import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Interoghează baza de date — nu poate fi generat static la build (mediul de
// build Railway nu are acces la rețeaua privată internă către Postgres).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const [articles, products, categoryContents] = await Promise.all([
    prisma.article.findMany({ where: { status: "published" }, select: { slug: true, updatedAt: true } }),
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.categoryContent.findMany({ select: { categoryGroup: true, category: true, updatedAt: true } }),
  ]);

  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/produse`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/despre`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/termeni`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${baseUrl}/confidentialitate`, changeFrequency: "monthly", priority: 0.2 },
    ...articles.map((a) => ({
      url: `${baseUrl}/blog/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...products.map((p) => ({
      url: `${baseUrl}/produse/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    // Pagini de categorie (grup sau subcategorie) — au conținut SEO propriu (vezi
    // CategoryContent) și un canonical dedicat, deci merită indexate separat.
    ...categoryContents.map((c) => ({
      url: c.category
        ? `${baseUrl}/produse?categorie=${encodeURIComponent(c.category)}`
        : `${baseUrl}/produse?grup=${encodeURIComponent(c.categoryGroup)}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
