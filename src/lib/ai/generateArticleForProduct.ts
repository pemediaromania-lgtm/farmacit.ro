import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { logActivity } from "@/lib/activityLog";
import { generateArticleContent } from "@/lib/ai/generateArticle";
import { generateCoverImage } from "@/lib/ai/generateCoverImage";
import { stripHtmlToText } from "@/lib/productDescription";

/**
 * Generează (Claude pentru text, DALL·E 3 pentru copertă) și salvează ca articol `draft`
 * un articol nou pentru produsul dat. Aruncă eroare dacă produsul nu există sau cheile AI lipsesc.
 */
export async function generateArticleForProduct(productId: string, userId?: string | null) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  try {
    const generated = await generateArticleContent({
      name: product.name,
      category: product.category,
      categoryGroup: product.categoryGroup,
      brand: product.brand,
      description: product.description ? stripHtmlToText(product.description) : null,
      price: product.price,
      currency: product.currency,
    });

    const slug = await uniqueSlug("article", generated.title);
    const coverImageUrl = await generateCoverImage(generated.title, slug, product.category);

    const article = await prisma.article.create({
      data: {
        productId: product.id,
        title: generated.title,
        slug,
        content: generated.content,
        excerpt: generated.excerpt,
        faq: generated.faq.length > 0 ? JSON.stringify(generated.faq) : null,
        coverImageUrl,
        status: "draft",
        generatedBy: "ai",
      },
    });

    await logActivity({
      action: "article.generated",
      userId,
      entityType: "article",
      entityId: article.id,
      meta: { productId: product.id, productName: product.name },
    });

    return article;
  } catch (error) {
    await logActivity({
      action: "article.generation_failed",
      userId,
      entityType: "product",
      entityId: product.id,
      meta: { productName: product.name, error: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}

/**
 * Generează articole pentru primele `limit` produse active care încă nu au niciun
 * articol, cele mai vechi întâi — un produs pe rând, nu în paralel (fiecare
 * generare costă Claude + DALL·E, deci se face secvențial, nu ca burst).
 */
export async function generateArticlesForArticlelessProducts(limit: number, userId?: string | null) {
  const products = await prisma.product.findMany({
    where: { isActive: true, articles: { none: {} } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  let succeeded = 0;
  let failed = 0;
  for (const product of products) {
    try {
      await generateArticleForProduct(product.id, userId);
      succeeded++;
    } catch {
      failed++;
    }
  }

  return { attempted: products.length, succeeded, failed };
}

// Câte articole se generează automat, în total, pe zi calendaristică — indiferent
// câte produse noi vin dintr-un import (un feed poate aduce zeci de mii dintr-o dată).
// Fiecare articol costă bani (Claude + DALL·E), deci generarea automată se face
// treptat, câte unul pe zi, nu în funcție de câte produse fără articol există.
const DAILY_ARTICLE_LIMIT = 1;

/**
 * Apelată dintr-un cron separat, zilnic: completează până la `DAILY_ARTICLE_LIMIT`
 * articole generate automat în ziua calendaristică curentă (UTC), indiferent de câte
 * ori rulează cron-ul în acea zi. Dacă plafonul zilnic e deja atins, nu mai generează
 * nimic până a doua zi.
 */
export async function generateDailyArticle(userId?: string | null) {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const generatedToday = await prisma.article.count({
    where: { generatedBy: "ai", createdAt: { gte: startOfDay } },
  });

  const remaining = Math.max(0, DAILY_ARTICLE_LIMIT - generatedToday);
  if (remaining === 0) return { attempted: 0, succeeded: 0, failed: 0, remaining: 0 };

  const result = await generateArticlesForArticlelessProducts(remaining, userId);
  return { ...result, remaining };
}
