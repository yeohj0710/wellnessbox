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

    if (typeof endpoint === "string" && endpoint) {
      if (role.length > 0 && Number.isFinite(orderId)) {
        if (role === "customer") {
          const auth = await requireCustomerOrderAccess(orderId);
          if (!auth.ok) return auth.response;
        } else if (role === "pharm") {
          const auth = await requirePharmSession();
          if (!auth.ok) return auth.response;
        } else if (role === "rider") {
          const auth = await requireRiderSession();
          if (!auth.ok) return auth.response;
        } else {
          return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }
        await removeSubscription(endpoint, orderId, role);
      } else if (role.length > 0) {
        if (role === "pharm") {
          const auth = await requirePharmSession();
          if (!auth.ok) return auth.response;
        } else if (role === "rider") {
          const auth = await requireRiderSession();
          if (!auth.ok) return auth.response;
        } else if (role === "customer") {
          return NextResponse.json(
            { error: "orderId is required for customer role" },
            { status: 400 }
          );
        } else {
          return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }
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
