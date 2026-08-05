-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "faq" TEXT;

-- CreateTable
CREATE TABLE "ArticleComment" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleComment_articleId_idx" ON "ArticleComment"("articleId");

-- AddForeignKey
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
