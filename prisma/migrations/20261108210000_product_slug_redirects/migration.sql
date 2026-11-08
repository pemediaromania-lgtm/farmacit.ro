-- Reparația produselor suprascrise de alt produs cu același product_id (vezi src/lib/db/ensureSchema.ts).
-- IF NOT EXISTS: pot fi create deja la pornirea serverului.
CREATE TABLE IF NOT EXISTS "ProductSlugRedirect" (
    "fromSlug" TEXT NOT NULL,
    "toSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductSlugRedirect_pkey" PRIMARY KEY ("fromSlug")
);

ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "productIsAlternative" BOOLEAN NOT NULL DEFAULT false;
