import { prisma } from "@/lib/prisma";
import { INDEXABLE_PRODUCT_WHERE } from "@/lib/seo/indexable";

/**
 * Produsele din sitemap, împărțite în fișiere: Google acceptă cel mult 50.000 de adrese într-un sitemap și îl respinge
 * întreg peste limită (farmatic avea 55.672 într-unul singur). Produsele stau în /produse/sitemap/0.xml, /1.xml…
 * (app/(site)/produse/sitemap.ts), câte PRODUCTS_PER_SITEMAP, iar robots.txt le anunță pe toate. /sitemap.xml are
 * restul paginilor (categorii, articole, pagini fixe).
 */
export const PRODUCTS_PER_SITEMAP = 40_000;

/**
 * Câte fișiere de produse pot exista — număr fix, ca build-ul să nu aibă nevoie de baza de date. 5 × 40.000 = 200.000
 * de produse; fișierele goale nu sunt anunțate în robots.txt. Dacă un site trece de 200.000 de produse, crește numărul.
 */
export const MAX_PRODUCT_SITEMAPS = 5;

const TTL_MS = 30 * 60 * 1000;
let cached: { at: number; data: { slug: string; updatedAt: Date }[] } | null = null;

/** Toate produsele active, în ordine stabilă (cele mai vechi întâi), ținute 30 de minute în memorie. */
export async function sitemapProducts(): Promise<{ slug: string; updatedAt: Date }[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  const data = await prisma.product.findMany({
    where: INDEXABLE_PRODUCT_WHERE,
    select: { slug: true, updatedAt: true },
    orderBy: [{ createdAt: "asc" }, { slug: "asc" }],
  });
  cached = { at: Date.now(), data };
  return data;
}

/** Câte fișiere de produse au conținut (pentru robots.txt). */
export async function productSitemapCount(): Promise<number> {
  const total = (await sitemapProducts()).length;
  return Math.min(MAX_PRODUCT_SITEMAPS, Math.ceil(total / PRODUCTS_PER_SITEMAP));
}
