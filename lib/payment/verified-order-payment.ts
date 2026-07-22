import "server-only";

import { fetchPaymentInfoByMethod } from "@/lib/payment/portone";

export type VerifiedOrderPayment = {
  paymentId: string;
  transactionType: "PAYMENT";
  txId: string;
  totalPrice: number;
};

function positiveAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("ORDER_PAYMENT_invalid_amount");
  }
  return amount;
}

export async function verifyOrderPayment(input: {
  paymentId: string;
  paymentMethod: string;
  paymentLookupId: string;
}, fetchPaymentInfoImpl: typeof fetchPaymentInfoByMethod = fetchPaymentInfoByMethod): Promise<VerifiedOrderPayment> {
  const paymentId = input.paymentId.trim();
  const paymentMethod = input.paymentMethod.trim();
  const paymentLookupId = input.paymentLookupId.trim();
  if (!paymentId || !paymentMethod || !paymentLookupId) {
    throw new Error("ORDER_PAYMENT_identity_required");
  }
  const paymentInfo = await fetchPaymentInfoImpl({
    paymentId: paymentLookupId,
    paymentMethod,
  });
  if (paymentMethod === "inicis") {
    const response = (paymentInfo as any)?.response;
    if (
      response?.status !== "paid" ||
      response?.merchant_uid !== paymentId ||
      typeof response?.imp_uid !== "string" ||
      !response.imp_uid
    ) {
      throw new Error("ORDER_PAYMENT_not_verified");
    }
    return {
      paymentId,
      transactionType: "PAYMENT",
      txId: response.imp_uid,
      totalPrice: positiveAmount(response.amount),
    };
  }

  const payment = (paymentInfo as any)?.response?.payment;
  const transaction = payment?.transactions?.[0];
  if (
    transaction?.status !== "PAID" ||
    payment?.id !== paymentId ||
    typeof transaction?.paymentId !== "string" ||
    !transaction.paymentId
  ) {
    throw new Error("ORDER_PAYMENT_not_verified");
  }
  return {
    paymentId,
    transactionType: "PAYMENT",
    txId: transaction.paymentId,
    totalPrice: positiveAmount(transaction?.amount?.total ?? payment?.amount?.total),
  };
}
