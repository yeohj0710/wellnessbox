-- Add push delivery log table for idempotency and operational tracing
CREATE TABLE "PushDelivery" (
  "id" SERIAL NOT NULL,
  "eventKey" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "orderId" INTEGER,
  "pharmacyId" INTEGER,
  "riderId" INTEGER,
  "errorType" TEXT,
  "errorStatusCode" INTEGER,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushDelivery_eventKey_role_endpoint_key"
  ON "PushDelivery"("eventKey", "role", "endpoint");

CREATE INDEX "PushDelivery_role_createdAt_idx"
  ON "PushDelivery"("role", "createdAt");

CREATE INDEX "PushDelivery_orderId_createdAt_idx"
  ON "PushDelivery"("orderId", "createdAt");

CREATE INDEX "PushDelivery_pharmacyId_createdAt_idx"
  ON "PushDelivery"("pharmacyId", "createdAt");

CREATE INDEX "PushDelivery_riderId_createdAt_idx"
  ON "PushDelivery"("riderId", "createdAt");
