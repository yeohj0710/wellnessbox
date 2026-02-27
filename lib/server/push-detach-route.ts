import "server-only";

import { NextRequest, NextResponse } from "next/server";
import {
  removeSubscription,
  removeSubscriptionsByEndpoint,
  removeSubscriptionsByEndpointAll,
} from "@/lib/notification";
import {
  requireAnySession,
  requireCustomerOrderAccess,
  requirePharmSession,
  requireRiderSession,
} from "@/lib/server/route-auth";

export async function runPushDetachPostRoute(req: NextRequest) {
  try {
    const baseAuth = await requireAnySession();
    if (!baseAuth.ok) return baseAuth.response;

    const body = await req.json();
    const endpoint = body?.endpoint;
    const role = typeof body?.role === "string" ? body.role : "";
    const orderId = Number(body?.orderId);

    if (typeof endpoint !== "string" || !endpoint) {
      return NextResponse.json({ ok: true });
    }

    if (!role) {
      await removeSubscriptionsByEndpointAll(endpoint);
      return NextResponse.json({ ok: true });
    }

    if (role === "customer") {
      if (!Number.isFinite(orderId)) {
        return NextResponse.json(
          { error: "orderId is required for customer role" },
          { status: 400 }
        );
      }
      const auth = await requireCustomerOrderAccess(orderId);
      if (!auth.ok) return auth.response;
      await removeSubscription(endpoint, orderId, role);
      return NextResponse.json({ ok: true });
    }

    if (role === "pharm") {
      const auth = await requirePharmSession();
      if (!auth.ok) return auth.response;
      await removeSubscriptionsByEndpoint(endpoint, role);
      return NextResponse.json({ ok: true });
    }

    if (role === "rider") {
      const auth = await requireRiderSession();
      if (!auth.ok) return auth.response;
      await removeSubscriptionsByEndpoint(endpoint, role);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: true });
  }
}
