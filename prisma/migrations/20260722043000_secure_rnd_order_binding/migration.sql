DROP INDEX IF EXISTS "Order_paymentId_idx";
CREATE UNIQUE INDEX "Order_paymentId_key" ON "Order"("paymentId");
ALTER TABLE "Order" ADD COLUMN "rndExecutionId" TEXT;
ALTER TABLE "Order" ADD COLUMN "rndPlanId" TEXT;
CREATE INDEX "Order_rndExecutionId_rndPlanId_idx"
ON "Order"("rndExecutionId", "rndPlanId");
