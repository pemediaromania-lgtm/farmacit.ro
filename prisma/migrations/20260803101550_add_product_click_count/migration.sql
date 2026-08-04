-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedId" TEXT,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL,
    "oldPrice" REAL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "category" TEXT,
    "brand" TEXT,
    "imageUrl" TEXT,
    "affiliateUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'affiliate',
    "availability" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("affiliateUrl", "availability", "brand", "category", "createdAt", "currency", "description", "externalId", "feedId", "id", "imageUrl", "isActive", "name", "oldPrice", "price", "slug", "type", "updatedAt") SELECT "affiliateUrl", "availability", "brand", "category", "createdAt", "currency", "description", "externalId", "feedId", "id", "imageUrl", "isActive", "name", "oldPrice", "price", "slug", "type", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE UNIQUE INDEX "Product_feedId_externalId_key" ON "Product"("feedId", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
