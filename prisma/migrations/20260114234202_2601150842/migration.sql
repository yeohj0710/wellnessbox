-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "appUserId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "appUserId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "invalidatedAt" TIMESTAMP(3),
ADD COLUMN     "lastFailureStatus" INTEGER;

-- CreateIndex
CREATE INDEX "ChatSession_appUserId_updatedAt_idx" ON "ChatSession"("appUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "Order_appUserId_createdAt_idx" ON "Order"("appUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
