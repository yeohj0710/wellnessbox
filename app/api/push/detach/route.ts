import { NextRequest, NextResponse } from "next/server";
import {
  removeSubscription,
  removeSubscriptionsByEndpoint,
  removeSubscriptionsByEndpointAll,
} from "@/lib/notification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint = body?.endpoint;
    const role = body?.role;
    const orderId = Number(body?.orderId);

    if (typeof endpoint === "string" && endpoint) {
      if (
        typeof role === "string" &&
        role.length > 0 &&
        Number.isFinite(orderId)
      ) {
        await removeSubscription(endpoint, orderId, role);
      } else if (typeof role === "string" && role.length > 0) {
        await removeSubscriptionsByEndpoint(endpoint, role);
      } else {
        await removeSubscriptionsByEndpointAll(endpoint);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: true });
  }
}
