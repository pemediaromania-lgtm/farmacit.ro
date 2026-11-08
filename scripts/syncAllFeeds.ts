import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { importFeed } from "@/lib/feed/importFeed";
import { logActivity } from "@/lib/activityLog";
import { finishSlugRepairs, repairMismatchedSlugs, type SlugRepair } from "@/lib/feed/repairMismatchedSlugs";

/**
 * Sincronizează toate feed-urile din admin, direct în baza de date — nu prin
 * endpoint-ul HTTP /api/cron/sync-feeds, ca să nu depindă de serverul Next.js
 * pornit. Rulată programat (vezi README, secțiunea Cron local) la fiecare 2 zile.
 * Generarea articolelor e un cron separat (scripts/generateDailyArticle.ts),
 * zilnic — cadență diferită de sincronizarea feed-urilor.
 */
async function main() {
  const feeds = await prisma.feed.findMany({ select: { id: true, name: true } });
  console.log(`[${new Date().toISOString()}] Sincronizare ${feeds.length} feed-uri...`);

  // Înainte de import: produsele suprascrise (adresa altui produs) primesc adresa lor; adresa veche rămâne liberă
  // pentru produsul original, pe care importul de mai jos îl poate crea din nou exact acolo.
  let repairs: SlugRepair[] = [];
  try {
    repairs = await repairMismatchedSlugs();
    console.log(`  Adrese reparate: ${repairs.length}`);
  } catch (error) {
    console.error("  Reparația adreselor a eșuat:", error);
  }

  for (const feed of feeds) {
    try {
      const result = await importFeed(feed.id, null);
      console.log(`  ${feed.name}: ${JSON.stringify(result)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ${feed.name}: EROARE — ${message}`);
    }
  }

  let repairResult: Awaited<ReturnType<typeof finishSlugRepairs>> | null = null;
  if (repairs.length > 0) {
    try {
      repairResult = await finishSlugRepairs(repairs);
      console.log(`  Reparație încheiată: ${JSON.stringify(repairResult)}`);
    } catch (error) {
      console.error("  Încheierea reparației a eșuat:", error);
    }
  }

  await logActivity({
    action: "feed.imported",
    userId: null,
    entityType: "feed",
    meta: { source: "local-cron", feedCount: feeds.length, slugRepairs: repairs.length, repairResult },
  });
}

main()
  .catch((err) => {
    console.error("Sincronizare eșuată:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
