DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Order"
    WHERE "paymentId" IS NOT NULL
    GROUP BY "paymentId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'ORDER_PAYMENT_ID_DUPLICATES_REQUIRE_RECONCILIATION_BEFORE_UNIQUE_MIGRATION';
  END IF;
END $$;

DROP INDEX IF EXISTS "Order_paymentId_idx";
CREATE UNIQUE INDEX "Order_paymentId_key" ON "Order"("paymentId");
ALTER TABLE "Order" ADD COLUMN "rndExecutionId" TEXT;
ALTER TABLE "Order" ADD COLUMN "rndPlanId" TEXT;
CREATE INDEX "Order_rndExecutionId_rndPlanId_idx"
ON "Order"("rndExecutionId", "rndPlanId");
