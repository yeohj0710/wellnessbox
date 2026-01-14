-- CreateTable
CREATE TABLE "AppLoginTransferToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppLoginTransferToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppLoginTransferToken_tokenHash_key" ON "AppLoginTransferToken"("tokenHash");
