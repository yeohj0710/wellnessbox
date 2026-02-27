import { NextRequest, NextResponse } from "next/server";
import { sendOrderNotification } from "@/lib/notification";
import {
  elapsedPushMs,
  pushErrorMeta,
  pushLog,
  startPushTimer,
} from "@/lib/push/logging";
import { requireCustomerOrderAccess } from "@/lib/server/route-auth";

export type PushSendParsedPayload = {
  orderId: number;
  status: string;
  image?: string;
};

export function parsePushSendBody(raw: unknown):
  | { ok: true; data: PushSendParsedPayload }
  | { ok: false; rawOrderId: unknown; rawStatus: unknown } {
  const rawOrderId = (raw as { orderId?: unknown })?.orderId;
  const rawStatus = (raw as { status?: unknown })?.status;
  const parsedOrderId = Number(rawOrderId);
  if (!Number.isFinite(parsedOrderId) || !rawStatus) {
    return { ok: false, rawOrderId, rawStatus };
  }
  return {
    ok: true,
    data: {
      orderId: parsedOrderId,
      status: String(rawStatus),
      image:
        typeof (raw as { image?: unknown })?.image === "string"
          ? (raw as { image: string }).image
          : undefined,
    },
  };
}

export function buildPushSendBadRequestResponse(input: {
  rawOrderId: unknown;
  rawStatus: unknown;
  startedAt: number;
}) {
  pushLog("route.push.send.bad_request", {
    orderId: input.rawOrderId,
    status: input.rawStatus,
    elapsedMs: elapsedPushMs(input.startedAt),
  });
  return NextResponse.json({ error: "Missing params" }, { status: 400 });
}

export async function runPushSendAuthorizedRoute(input: {
  payload: PushSendParsedPayload;
  startedAt: number;
}) {
  await sendOrderNotification(
    input.payload.orderId,
    input.payload.status,
    input.payload.image
  );
  pushLog("route.push.send.ok", {
    orderId: input.payload.orderId,
    status: input.payload.status,
    elapsedMs: elapsedPushMs(input.startedAt),
  });
  return NextResponse.json({ ok: true });
}

export function buildPushSendErrorResponse(input: {
  error: unknown;
  startedAt: number;
}) {
  pushLog("route.push.send.error", {
    ...pushErrorMeta(input.error),
    elapsedMs: elapsedPushMs(input.startedAt),
  });
  return NextResponse.json(
    { error: "Failed to send notification" },
    { status: 500 }
  );
}

export async function runPushSendPostRoute(req: NextRequest) {
  const startedAt = startPushTimer();
  try {
    const parsed = parsePushSendBody(await req.json());
    if (!parsed.ok) {
      return buildPushSendBadRequestResponse({
        rawOrderId: parsed.rawOrderId,
        rawStatus: parsed.rawStatus,
        startedAt,
      });
    }

    const auth = await requireCustomerOrderAccess(parsed.data.orderId);
    if (!auth.ok) return auth.response;
    return runPushSendAuthorizedRoute({
      payload: parsed.data,
      startedAt,
    });
  } catch (err) {
    return buildPushSendErrorResponse({
      error: err,
      startedAt,
    });
  }
}
