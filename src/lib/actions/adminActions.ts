"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { importFeed, importFeedFromText } from "@/lib/feed/importFeed";
import { generateArticleForProduct, generateArticlesForArticlelessProducts } from "@/lib/ai/generateArticleForProduct";
import { generateCategoryImage } from "@/lib/ai/generateCategoryImage";
import { ALL_GROUPS } from "@/lib/productCategory";
import { uniqueSlug } from "@/lib/slug";

async function currentUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function createFeedAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!name || !url) throw new Error("Numele și URL-ul feed-ului sunt obligatorii");

  const userId = await currentUserId();
  const feed = await prisma.feed.create({ data: { name, url, createdById: userId } });
  await logActivity({ action: "feed.created", userId, entityType: "feed", entityId: feed.id, meta: { name, url } });

  revalidatePath("/admin/feeds");
}

/**
 * Șterge un feed și toate produsele lui (recenziile lor se șterg în cascadă;
 * articolele generate rămân, doar leagă-tura la produs se golește). Ireversibil —
 * folosit când un comerciant e scos definitiv din catalog.
 */
export async function deleteFeedAction(feedId: string) {
  const userId = await currentUserId();
  const feed = await prisma.feed.findUniqueOrThrow({ where: { id: feedId } });
  const productCount = await prisma.product.count({ where: { feedId } });

  await prisma.product.deleteMany({ where: { feedId } });
  await prisma.feed.delete({ where: { id: feedId } });

  await logActivity({
    action: "feed.deleted",
    userId,
    entityType: "feed",
    entityId: feedId,
    meta: { name: feed.name, productCount },
  });

  revalidatePath("/admin/feeds");
  revalidatePath("/admin/products");
  revalidatePath("/admin/activity");
  revalidatePath("/");
  revalidatePath("/produse");
}

// Marchează un feed creat prin upload de fișier (nu are un URL real de re-descărcat).
const UPLOAD_URL_PREFIX = "upload:";

/**
 * Încarcă un fișier CSV/XML direct din admin. Dacă `feedId` e null, creează un feed
 * nou (necesită `name` în formData); altfel adaugă un nou fișier peste un feed
 * existent creat tot prin upload — produsele se potrivesc după SKU sau titlu, deci
 * un re-upload actualizează produsele existente în loc să le dubleze.
 */
export async function uploadFeedAction(feedId: string | null, formData: FormData) {
  const userId = await currentUserId();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Selectează un fișier CSV sau XML");

  let targetFeedId = feedId;
  if (!targetFeedId) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new Error("Numele feed-ului este obligatoriu");

    const feed = await prisma.feed.create({
      data: { name, url: `${UPLOAD_URL_PREFIX}${file.name}`, createdById: userId },
    });
    targetFeedId = feed.id;
    await logActivity({
      action: "feed.created",
      userId,
      entityType: "feed",
      entityId: feed.id,
      meta: { name, source: "upload", fileName: file.name },
    });
  }

  const rawText = await file.text();
  await importFeedFromText(targetFeedId, rawText, userId);

  revalidatePath("/admin/feeds");
  revalidatePath("/admin/products");
  revalidatePath("/admin/activity");
}

export async function syncFeedAction(feedId: string) {
  const userId = await currentUserId();
  await importFeed(feedId, userId);
  revalidatePath("/admin/feeds");
  revalidatePath("/admin/products");
  revalidatePath("/admin/activity");
}

export async function generateArticleAction(productId: string) {
  const userId = await currentUserId();
  await generateArticleForProduct(productId, userId);
  revalidatePath("/admin/products");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/activity");
}

export async function publishArticleAction(articleId: string) {
  const userId = await currentUserId();
  const article = await prisma.article.update({
    where: { id: articleId },
    data: { status: "published", publishedAt: new Date() },
  });
  await logActivity({
    action: "article.published",
    userId,
    entityType: "article",
    entityId: article.id,
    meta: { title: article.title },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/blog");
}

export async function unpublishArticleAction(articleId: string) {
  const userId = await currentUserId();
  const article = await prisma.article.update({
    where: { id: articleId },
    data: { status: "draft", publishedAt: null },
  });
  await logActivity({
    action: "article.unpublished",
    userId,
    entityType: "article",
    entityId: article.id,
    meta: { title: article.title },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/blog");
}

export async function updateArticleAction(articleId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) throw new Error("Titlul și conținutul sunt obligatorii");

  const existing = await prisma.article.findUniqueOrThrow({ where: { id: articleId } });
  const slug = existing.title === title ? existing.slug : await uniqueSlug("article", title, articleId);

  await prisma.article.update({
    where: { id: articleId },
    data: { title, excerpt, content, slug },
  });

  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${articleId}`);
  revalidatePath("/blog");
}

export async function generateMissingArticlesBatchAction() {
  const userId = await currentUserId();
  await generateArticlesForArticlelessProducts(10, userId);
  revalidatePath("/admin/products");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/activity");
}

/**
 * Generează cu DALL·E 3 câte o singură imagine ilustrativă per grup de categorii
 * (nu per subcategorie și nu per produs — 6 apeluri, nu 14.000+), folosită ca
 * vizual pe tile-urile de pe homepage. Rulează secvențial și poate dura 1-2 minute.
 */
export async function regenerateCategoryImagesAction() {
  for (const group of ALL_GROUPS) {
    try {
      await generateCategoryImage(group);
    } catch {
      // continuăm cu restul grupurilor chiar dacă unul eșuează
    }
  }
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function toggleProductActiveAction(productId: string, isActive: boolean) {
  await prisma.product.update({ where: { id: productId }, data: { isActive } });
  revalidatePath("/admin/products");
  revalidatePath("/produse");
}
