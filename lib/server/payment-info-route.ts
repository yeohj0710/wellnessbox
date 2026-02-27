import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchPaymentInfoByMethod } from "@/lib/payment/portone";

const PAYMENT_REQUEST_FORMAT_INVALID_ERROR =
  "\uC694\uCCAD \uD615\uC2DD\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const PAYMENT_REQUEST_VALUE_INVALID_ERROR =
  "\uACB0\uC81C \uC694\uCCAD \uAC12\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
const PAYMENT_FETCH_FAILED_ERROR =
  "\uACB0\uC81C \uC815\uBCF4 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694.";

const paymentInfoRequestSchema = z.object({
  paymentId: z.string().trim().min(1),
  paymentMethod: z.string().trim().min(1),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function runGetPaymentInfoPostRoute(req: Request) {
  const rawBody = await req.json().catch(() => null);
  if (!rawBody) {
    return jsonError(PAYMENT_REQUEST_FORMAT_INVALID_ERROR, 400);
  }

  const parsed = paymentInfoRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError(PAYMENT_REQUEST_VALUE_INVALID_ERROR, 400);
  }

  try {
    const paymentData = await fetchPaymentInfoByMethod(parsed.data);
    return NextResponse.json(paymentData, { status: 200 });
  } catch (error) {
    console.error(PAYMENT_FETCH_FAILED_ERROR, error);
    return jsonError(PAYMENT_FETCH_FAILED_ERROR, 500);
  }
}
