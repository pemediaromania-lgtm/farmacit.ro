-- Istoricul de preț și alertele „Anunță-mă când scade prețul” (2026-11-19). Idempotent: aceleași instrucțiuni rulează și
-- la pornire (lib/db/ensureSchema.ts) pe site-urile care nu aplică migrațiile la deploy.
CREATE TABLE IF NOT EXISTS "PricePoint" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "oldPrice" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricePoint_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PricePoint_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PricePoint_productId_recordedAt_idx" ON "PricePoint"("productId", "recordedAt");

CREATE TABLE IF NOT EXISTS "PriceAlert" (
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
);
CREATE UNIQUE INDEX IF NOT EXISTS "PriceAlert_token_key" ON "PriceAlert"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "PriceAlert_productId_email_key" ON "PriceAlert"("productId", "email");
CREATE INDEX IF NOT EXISTS "PriceAlert_confirmedAt_idx" ON "PriceAlert"("confirmedAt");

CREATE INDEX IF NOT EXISTS "Product_gtin_idx" ON "Product"("gtin");
