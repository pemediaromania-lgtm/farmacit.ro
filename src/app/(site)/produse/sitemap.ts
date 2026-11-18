import type { MetadataRoute } from "next";
import { MAX_PRODUCT_SITEMAPS, PRODUCTS_PER_SITEMAP, sitemapProducts } from "@/lib/seo/sitemapProducts";

// Sitemap-urile cu produse: /produse/sitemap/0.xml, /1.xml… (vezi lib/seo/sitemapProducts.ts). Citesc baza de date
// la fiecare cerere, nu la build.
export const dynamic = "force-dynamic";

/** Id-uri fixe, fără bază de date la build; robots.txt anunță doar fișierele care au produse. */
export async function generateSitemaps() {
  return Array.from({ length: MAX_PRODUCT_SITEMAPS }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const part = Number(await id);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const products = (await sitemapProducts()).slice(part * PRODUCTS_PER_SITEMAP, (part + 1) * PRODUCTS_PER_SITEMAP);
  return products.map((p) => ({
    url: `${baseUrl}/produse/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
}
