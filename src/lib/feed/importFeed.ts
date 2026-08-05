import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parse2performantFeed, type RawFeedProduct } from "@/lib/feed/parse2performant";
import { dedupeSlugSync } from "@/lib/slug";
import { logActivity } from "@/lib/activityLog";
import { classifyProduct } from "@/lib/productCategory";
import { submitUrlsToIndexNow } from "@/lib/seo/indexNow";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Importul NU generează articole automat — un feed poate aduce zeci de mii de
// produse noi dintr-o dată, iar generarea (Claude + DALL·E) costă bani per articol.
// Generarea se face treptat, separat, prin cron-ul săptămânal (vezi
// generateWeeklyArticles în generateArticleForProduct.ts) sau manual din admin.

// Feed-urile reale au mii-zeci de mii de produse — inserările/actualizările se fac
// în loturi (nu un query per produs), altfel o sincronizare ar dura minute/ore.
const CREATE_BATCH_SIZE = 500;
const UPDATE_BATCH_SIZE = 200;

export interface ImportResult {
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  totalCount: number;
  deactivatedCount: number;
}

const normalizeName = (name: string) => name.trim().toLowerCase();

/** Descarcă feed-ul de la URL-ul feed-ului și importă produsele. */
export async function importFeed(feedId: string, userId?: string | null): Promise<ImportResult> {
  const feed = await prisma.feed.findUniqueOrThrow({ where: { id: feedId } });

  let rawText: string;
  try {
    const response = await fetch(feed.url);
    if (!response.ok) throw new Error(`Descărcarea feed-ului a eșuat (status ${response.status})`);
    rawText = await response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.feed.update({
      where: { id: feedId },
      data: { lastStatus: "error", lastError: message, lastImportedAt: new Date() },
    });
    await logActivity({
      action: "feed.import_failed",
      userId,
      entityType: "feed",
      entityId: feedId,
      meta: { error: message },
    });
    throw error;
  }

  return importFeedFromText(feedId, rawText, userId);
}

/** Importă produsele direct dintr-un text de feed deja obținut (ex: fișier CSV încărcat manual). */
export async function importFeedFromText(
  feedId: string,
  rawText: string,
  userId?: string | null
): Promise<ImportResult> {
  const items = parse2performantFeed(rawText).filter((item) => item.name?.trim());
  const result = await applyFeedItems(feedId, items);

  await prisma.feed.update({
    where: { id: feedId },
    data: { lastStatus: "success", lastError: null, lastImportedAt: new Date() },
  });
  await logActivity({
    action: "feed.imported",
    userId,
    entityType: "feed",
    entityId: feedId,
    meta: { ...result },
  });

  return result;
}

/**
 * Creează/actualizează produsele acestui feed pe baza listei de produse deja parsate.
 * Potrivirea cu produsele existente se face după externalId (SKU/unique din feed) și,
 * dacă acesta lipsește sau nu găsește nimic, după titlu (normalizat) — ca la re-sincronizări
 * sau re-upload-uri ale aceluiași feed să nu se creeze produse duplicate.
 */
async function applyFeedItems(feedId: string, items: RawFeedProduct[]): Promise<ImportResult> {
  // Produsele existente ale acestui feed, indexate după externalId și după titlu,
  // ca să nu facem un SELECT per produs în bucla de mai jos.
  const existingProducts = await prisma.product.findMany({
    where: { feedId },
    select: {
      id: true,
      externalId: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      affiliateUrl: true,
      isActive: true,
    },
  });
  const existingByExternalId = new Map(
    existingProducts.filter((p) => p.externalId).map((p) => [p.externalId as string, p])
  );
  const existingByName = new Map(existingProducts.map((p) => [normalizeName(p.name), p]));

  // Toate slug-urile existente (global, nu doar din acest feed) — dedup în memorie,
  // în loc de un query de verificare per produs nou.
  const takenSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug));

  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  const toCreate: Prisma.ProductCreateManyInput[] = [];
  const updateOps: { id: string; data: Prisma.ProductUpdateInput }[] = [];
  // Apără la duplicate în același import (același externalId sau titlu apărut de două
  // ori în feed) — altfel am crea două produse noi pentru același articol.
  const seenNewExternalIds = new Set<string>();
  const seenNewNames = new Set<string>();
  // Produsele existente ale acestui feed care mai apar și în importul curent —
  // restul, la final, dispar din feed (comerciantul nu le mai listează) și sunt
  // dezactivate automat, ca să nu rămână "fantomă" pe site.
  const matchedExistingIds = new Set<string>();

  for (const item of items) {
    const normalizedName = normalizeName(item.name);
    const classification = classifyProduct(item.name, item.category);
    const existing =
      (item.externalId && existingByExternalId.get(item.externalId)) ?? existingByName.get(normalizedName);

    const alreadySeenInThisImport = item.externalId
      ? seenNewExternalIds.has(item.externalId)
      : seenNewNames.has(normalizedName);

    if (!existing && alreadySeenInThisImport) {
      unchangedCount++;
      continue;
    }

    if (existing) {
      matchedExistingIds.add(existing.id);
      const changed =
        existing.name !== item.name ||
        existing.price !== item.price ||
        existing.imageUrl !== item.imageUrl ||
        existing.affiliateUrl !== item.affiliateUrl ||
        existing.description !== item.description;

      if (!changed) {
        unchangedCount++;
        continue;
      }

      updateOps.push({
        id: existing.id,
        data: {
          name: item.name,
          description: item.description,
          price: item.price,
          oldPrice: item.oldPrice,
          currency: item.currency ?? undefined,
          // Categoria (sub + grup) e mereu dedusă/normalizată de noi — nu preluăm
          // brut categoria feed-ului, ca să avem o taxonomie unică între comercianți.
          category: classification.category,
          categoryGroup: classification.categoryGroup,
          brand: item.brand,
          merchant: item.merchant,
          imageUrl: item.imageUrl,
          gtin: item.gtin,
          affiliateUrl: item.affiliateUrl,
          availability: item.availability,
          // Dacă produsul exista deja fără externalId (ex: creat dintr-un CSV fără
          // SKU) și acum feed-ul aduce unul, îl atașăm — fără să suprascriem un
          // externalId deja setat, ca să nu amestecăm identitatea produsului.
          externalId: !existing.externalId && item.externalId ? item.externalId : undefined,
        },
      });
      updatedCount++;
    } else {
      if (item.externalId) seenNewExternalIds.add(item.externalId);
      else seenNewNames.add(normalizedName);

      const slug = dedupeSlugSync(item.name, takenSlugs);
      toCreate.push({
        feedId,
        externalId: item.externalId,
        name: item.name,
        slug,
        description: item.description,
        price: item.price,
        oldPrice: item.oldPrice,
        currency: item.currency ?? "RON",
        category: classification.category,
        categoryGroup: classification.categoryGroup,
        brand: item.brand,
        merchant: item.merchant,
        imageUrl: item.imageUrl,
        gtin: item.gtin,
        affiliateUrl: item.affiliateUrl,
        availability: item.availability,
      });
      createdCount++;
    }
  }

  for (let i = 0; i < toCreate.length; i += CREATE_BATCH_SIZE) {
    await prisma.product.createMany({ data: toCreate.slice(i, i + CREATE_BATCH_SIZE) });
  }

  // Anunțăm IndexNow o singură dată, în bloc, pentru toate produsele noi din acest
  // import — nu are rost un ping per produs când un feed poate aduce mii dintr-o dată.
  await submitUrlsToIndexNow(toCreate.map((p) => `${baseUrl}/produse/${p.slug}`));

  for (let i = 0; i < updateOps.length; i += UPDATE_BATCH_SIZE) {
    const batch = updateOps.slice(i, i + UPDATE_BATCH_SIZE);
    await prisma.$transaction(batch.map((op) => prisma.product.update({ where: { id: op.id }, data: op.data })));
  }

  const staleIds = existingProducts
    .filter((p) => p.isActive && !matchedExistingIds.has(p.id))
    .map((p) => p.id);
  for (let i = 0; i < staleIds.length; i += UPDATE_BATCH_SIZE) {
    await prisma.product.updateMany({
      where: { id: { in: staleIds.slice(i, i + UPDATE_BATCH_SIZE) } },
      data: { isActive: false },
    });
  }

  return { createdCount, updatedCount, unchangedCount, totalCount: items.length, deactivatedCount: staleIds.length };
}
