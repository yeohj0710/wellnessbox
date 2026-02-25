-- CreateTable
CREATE TABLE "ColumnPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "contentMarkdown" TEXT NOT NULL,
    "contentHtml" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "authorName" TEXT,
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColumnPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColumnPost_slug_key" ON "ColumnPost"("slug");

-- CreateIndex
CREATE INDEX "ColumnPost_status_publishedAt_updatedAt_idx" ON "ColumnPost"("status", "publishedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "ColumnPost_publishedAt_updatedAt_idx" ON "ColumnPost"("publishedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "ColumnPost_updatedAt_idx" ON "ColumnPost"("updatedAt");
