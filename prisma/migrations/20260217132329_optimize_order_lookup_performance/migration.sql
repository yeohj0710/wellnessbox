-- CreateIndex
CREATE INDEX "Message_orderId_id_idx" ON "Message"("orderId", "id");

-- CreateIndex
CREATE INDEX "Order_phone_createdAt_idx" ON "Order"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "Order_phone_password_createdAt_idx" ON "Order"("phone", "password", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentId_idx" ON "Order"("paymentId");
