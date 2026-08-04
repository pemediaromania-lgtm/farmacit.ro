-- AlterTable
ALTER TABLE "Product" ADD COLUMN "categoryGroup" TEXT;

-- CreateIndex
CREATE INDEX "Product_categoryGroup_idx" ON "Product"("categoryGroup");
