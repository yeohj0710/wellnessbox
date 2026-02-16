import { NextRequest, NextResponse } from "next/server";
import { sendOrderNotification } from "@/lib/notification";
import {
  elapsedPushMs,
  pushErrorMeta,
  pushLog,
  startPushTimer,
} from "@/lib/push/logging";
import { requireCustomerOrderAccess } from "@/lib/server/route-auth";

export async function POST(req: NextRequest) {
  const startedAt = startPushTimer();
  try {
    const { orderId, status, image } = await req.json();
    const parsedOrderId = Number(orderId);
    if (!Number.isFinite(parsedOrderId) || !status) {
      pushLog("route.push.send.bad_request", {
        orderId,
        status,
        elapsedMs: elapsedPushMs(startedAt),
      });
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const auth = await requireCustomerOrderAccess(parsedOrderId);
    if (!auth.ok) return auth.response;

    await sendOrderNotification(parsedOrderId, status, image);
    pushLog("route.push.send.ok", {
      orderId: parsedOrderId,
      status,
      elapsedMs: elapsedPushMs(startedAt),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    pushLog("route.push.send.error", {
      ...pushErrorMeta(err),
      elapsedMs: elapsedPushMs(startedAt),
    });
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
