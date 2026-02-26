-- CreateTable
CREATE TABLE "ColumnPostSlugAlias" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColumnPostSlugAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColumnPostSlugAlias_slug_key" ON "ColumnPostSlugAlias"("slug");

-- CreateIndex
CREATE INDEX "ColumnPostSlugAlias_postId_createdAt_idx" ON "ColumnPostSlugAlias"("postId", "createdAt");

-- AddForeignKey
ALTER TABLE "ColumnPostSlugAlias" ADD CONSTRAINT "ColumnPostSlugAlias_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ColumnPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
