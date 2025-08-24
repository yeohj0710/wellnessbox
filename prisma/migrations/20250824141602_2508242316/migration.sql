/*
  Warnings:

  - A unique constraint covering the columns `[role,orderId,endpoint]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[role,pharmacyId,endpoint]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[role,riderId,endpoint]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Made the column `role` on table `Subscription` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "riderId" INTEGER,
ALTER COLUMN "role" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_role_orderId_endpoint_key" ON "Subscription"("role", "orderId", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_role_pharmacyId_endpoint_key" ON "Subscription"("role", "pharmacyId", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_role_riderId_endpoint_key" ON "Subscription"("role", "riderId", "endpoint");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
