import { prisma } from "@/lib/prisma";

/**
 * Tabelele și coloanele adăugate după mutarea pe VPS se creează și la pornirea serverului, dacă lipsesc — idempotent
 * (IF NOT EXISTS), ca site-ul să nu depindă de pasul de migrare din Coolify. Aceleași modificări sunt și în
 * prisma/migrations, tot cu IF NOT EXISTS, deci nu se ciocnesc. Ordinea sigură la o schimbare nouă: întâi instrucțiunea
 * de aici + verificarea în /api/health, abia apoi codul care o folosește.
 */
const STATEMENTS = [
  // Toate pozele produsului din feed (prima = imageUrl), pentru galeria de pe pagina produsului.
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  // Adresa veche a unui produs → adresa nouă (reparația produselor suprascrise de alt produs cu același product_id).
  `CREATE TABLE IF NOT EXISTS "ProductSlugRedirect" (
    "fromSlug" TEXT NOT NULL,
    "toSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductSlugRedirect_pkey" PRIMARY KEY ("fromSlug")
  )`,
  // Produsul din caseta articolului e o alternativă (cel original nu mai e în feed) — caseta o spune deschis.
  `ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "productIsAlternative" BOOLEAN NOT NULL DEFAULT false`,
  // Istoricul de preț și alertele de preț (2026-11-19) — aceleași instrucțiuni ca în migrația 20261119090000_price_tracking.
  `CREATE TABLE IF NOT EXISTS "PricePoint" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "oldPrice" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricePoint_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PricePoint_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS "PricePoint_productId_recordedAt_idx" ON "PricePoint"("productId", "recordedAt")`,
  `CREATE TABLE IF NOT EXISTS "PriceAlert" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "priceAtSignup" DOUBLE PRECISION NOT NULL,
    "token" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PriceAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PriceAlert_token_key" ON "PriceAlert"("token")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PriceAlert_productId_email_key" ON "PriceAlert"("productId", "email")`,
  `CREATE INDEX IF NOT EXISTS "PriceAlert_confirmedAt_idx" ON "PriceAlert"("confirmedAt")`,
  `CREATE INDEX IF NOT EXISTS "Product_gtin_idx" ON "Product"("gtin")`,
];

export async function ensureSchema(): Promise<void> {
  for (const statement of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (error) {
      console.error("[ensureSchema] Nu am putut aplica:", statement.split("\n")[0], error);
    }
  }
}

export async function schemaStatus() {
  const rows = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE (table_name = 'Product' AND column_name = 'images')
       OR (table_name = 'ProductSlugRedirect' AND column_name = 'toSlug')
       OR (table_name = 'Article' AND column_name = 'productIsAlternative')`;
  const has = (table: string, column: string) => rows.some((r) => r.table_name === table && r.column_name === column);
  return {
    productImages: has("Product", "images"),
    productSlugRedirect: has("ProductSlugRedirect", "toSlug"),
    articleAlternative: has("Article", "productIsAlternative"),
  };
}
