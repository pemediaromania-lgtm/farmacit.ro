import type { MetadataRoute } from "next";
import { productSitemapCount } from "@/lib/seo/sitemapProducts";

// Numărul de sitemap-uri cu produse vine din baza de date, la fiecare cerere.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  // Un robots.txt cu eroare 5xx îl face pe Google să oprească temporar accesarea întregului site — deci la orice
  // problemă cu baza de date anunțăm măcar primul fișier de produse, nu dăm eroare.
  let parts = 1;
  try {
    parts = Math.max(1, await productSitemapCount());
  } catch (error) {
    console.error("robots.txt: numărul de sitemap-uri cu produse nu s-a putut citi:", error);
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/go"] }],
    sitemap: [`${baseUrl}/sitemap.xml`, ...Array.from({ length: parts }, (_, i) => `${baseUrl}/produse/sitemap/${i}.xml`)],
  };
}
