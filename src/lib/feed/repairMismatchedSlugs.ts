import { prisma } from "@/lib/prisma";
import { dedupeSlugSync } from "@/lib/slug";
import { findReplacementProduct } from "@/lib/replacementProduct";
import { significantWords, slugMatchesName, wordOverlap } from "@/lib/seo/slugMismatch";

/**
 * Reparația produselor suprascrise de vechea potrivire doar după `product_id` (vezi lib/feed/productMatch.ts): rândul
 * cu adresa „almanah-2015” are datele altei cărți („Cenușăreasa”). Rulează la sincronizarea programată
 * (scripts/syncAllFeeds.ts), în doi timpi:
 *   1. înainte de import — repairMismatchedSlugs: produsul primește adresa propriului nume, iar adresa veche duce
 *      provizoriu la el (ProductSlugRedirect, 301). Adresa veche rămâne liberă pentru produsul original.
 *   2. după import — finishSlugRepairs: dacă produsul original e încă în feed, importul l-a creat din nou exact pe
 *      adresa lui veche → redirectul se șterge, iar articolele scrise despre el se leagă înapoi de el. Altfel, adresa
 *      veche și articolele lui duc la cel mai asemănător produs activ, iar caseta articolului spune că e o alternativă.
 * Idempotent: un produs reparat are adresa potrivită numelui, deci nu mai e găsit a doua oară.
 */
export interface SlugRepair {
  productId: string;
  fromSlug: string;
  toSlug: string;
  /** Articolele scrise despre produsul original, nu despre cel care l-a suprascris. */
  articleIds: string[];
}

function parseProductName(meta: string | null): string | null {
  try {
    const parsed = meta ? (JSON.parse(meta) as { productName?: unknown }) : null;
    return typeof parsed?.productName === "string" ? parsed.productName : null;
  } catch {
    return null;
  }
}

/** Articolul e despre produsul original dacă textul lui seamănă cel puțin la fel de mult cu adresa veche ca cu numele actual. */
function isAboutOriginal(subject: string, currentName: string, fromSlug: string): boolean {
  const subjectWords = significantWords(subject);
  const current = wordOverlap(significantWords(currentName), subjectWords);
  const original = wordOverlap(significantWords(fromSlug.replace(/-[0-9]+$/, "")), subjectWords);
  return original >= current;
}

export async function repairMismatchedSlugs(): Promise<SlugRepair[]> {
  const products = await prisma.product.findMany({ select: { id: true, slug: true, name: true } });
  const mismatched = products.filter((p) => !slugMatchesName(p.slug, p.name));
  if (mismatched.length === 0) return [];

  const articles = await prisma.article.findMany({
    where: { productId: { in: mismatched.map((p) => p.id) } },
    select: { id: true, productId: true, title: true, excerpt: true },
  });
  // Numele produsului de la generarea articolului (jurnalul) spune sigur despre ce carte/produs e articolul.
  const logs = articles.length
    ? await prisma.activityLog.findMany({
        where: { action: "article.generated", entityId: { in: articles.map((a) => a.id) } },
        select: { entityId: true, meta: true },
      })
    : [];
  const generatedFor = new Map(logs.map((log) => [log.entityId, parseProductName(log.meta)]));

  const taken = new Set(products.map((p) => p.slug));
  const repairs: SlugRepair[] = [];
  for (const product of mismatched) {
    const toSlug = dedupeSlugSync(product.name, taken);
    const articleIds = articles
      .filter((a) => a.productId === product.id)
      .filter((a) => isAboutOriginal(generatedFor.get(a.id) ?? `${a.title} ${a.excerpt ?? ""}`, product.name, product.slug))
      .map((a) => a.id);
    await prisma.$transaction([
      prisma.product.update({ where: { id: product.id }, data: { slug: toSlug } }),
      prisma.productSlugRedirect.upsert({
        where: { fromSlug: product.slug },
        create: { fromSlug: product.slug, toSlug },
        update: { toSlug },
      }),
    ]);
    repairs.push({ productId: product.id, fromSlug: product.slug, toSlug, articleIds });
  }
  return repairs;
}

export async function finishSlugRepairs(repairs: SlugRepair[]) {
  let restored = 0;
  let redirected = 0;
  let articlesRestored = 0;
  let articlesAlternative = 0;
  for (const repair of repairs) {
    const original = await prisma.product.findUnique({ where: { slug: repair.fromSlug }, select: { id: true } });
    if (original) {
      // Produsul original e iar pe adresa lui: redirectul nu mai trebuie, articolele lui revin la el.
      await prisma.productSlugRedirect.deleteMany({ where: { fromSlug: repair.fromSlug } });
      if (repair.articleIds.length > 0) {
        const { count } = await prisma.article.updateMany({
          where: { id: { in: repair.articleIds } },
          data: { productId: original.id, productIsAlternative: false },
        });
        articlesRestored += count;
      }
      restored++;
      continue;
    }

    // Produsul original nu mai e în feed: cel mai asemănător produs activ, după cuvintele din adresa veche.
    const current = await prisma.product.findUnique({
      where: { id: repair.productId },
      select: { category: true, categoryGroup: true },
    });
    const replacement = await findReplacementProduct({
      id: "",
      name: repair.fromSlug.replace(/-/g, " "),
      brand: null,
      price: null,
      category: current?.category ?? null,
      categoryGroup: current?.categoryGroup ?? null,
    });
    if (replacement) {
      await prisma.productSlugRedirect.update({ where: { fromSlug: repair.fromSlug }, data: { toSlug: replacement.slug } });
    }
    if (repair.articleIds.length > 0) {
      const { count } = await prisma.article.updateMany({
        where: { id: { in: repair.articleIds } },
        data: replacement
          ? { productId: replacement.id, productIsAlternative: true }
          : { productIsAlternative: true },
      });
      articlesAlternative += count;
    }
    redirected++;
  }
  return { restored, redirected, articlesRestored, articlesAlternative };
}
