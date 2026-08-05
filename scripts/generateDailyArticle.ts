import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { generateDailyArticle } from "@/lib/ai/generateArticleForProduct";

/**
 * Generează articolul zilnic (dacă nu a fost deja generat unul azi), direct în
 * baza de date — nu prin endpoint-ul HTTP /api/cron/generate-article, ca să nu
 * depindă de serverul Next.js pornit. Rulată programat (vezi README, secțiunea
 * Cron local) o dată pe zi, separat de sincronizarea feed-urilor.
 */
async function main() {
  console.log(`[${new Date().toISOString()}] Generare articol zilnic...`);
  const result = await generateDailyArticle(null);
  console.log("Rezultat:", JSON.stringify(result));
}

main()
  .catch((err) => {
    console.error("Generare articol eșuată:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
